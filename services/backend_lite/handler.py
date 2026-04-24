import base64
import json
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse


def create_handler(database, directory):
    class LiteBackendHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            super().end_headers()

        def do_OPTIONS(self):
            self.send_response(HTTPStatus.NO_CONTENT)
            self.end_headers()

        def do_GET(self):
            if self.path.startswith('/api/'):
                self.handle_api('GET')
                return
            super().do_GET()

        def do_POST(self):
            self.handle_api('POST')

        def do_PUT(self):
            self.handle_api('PUT')

        def do_DELETE(self):
            self.handle_api('DELETE')

        def parse_json_body(self):
            length = int(self.headers.get('Content-Length', '0') or 0)
            if length <= 0:
                return {}
            raw = self.rfile.read(length)
            return json.loads(raw.decode('utf-8'))

        def respond(self, status=200, payload=None):
            body = json.dumps(payload or {}, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def respond_bytes(self, status=200, content_type='application/octet-stream', body=b''):
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def resolve_user_id(self, payload=None):
            payload = payload or {}
            parsed = urlparse(self.path)
            query = parse_qs(parsed.query)
            return (
                self.headers.get('X-User-Id')
                or query.get('userId', [None])[0]
                or payload.get('userId')
                or 'guest'
            )

        def handle_api(self, method):
            parsed = urlparse(self.path)
            path = parsed.path
            payload = self.parse_json_body() if method in {'POST', 'PUT'} else {}

            try:
                if method == 'GET' and path == '/api/health':
                    self.respond(200, {'status': 'ok'})
                    return

                if method == 'POST' and path == '/api/auth/register':
                    user = database.create_user(payload)
                    self.respond(201, {'user': user})
                    return

                if method == 'POST' and path == '/api/auth/login':
                    user = database.login_user(payload)
                    self.respond(200, {'user': user})
                    return

                user_id = self.resolve_user_id(payload)

                if method == 'GET' and path == '/api/profile':
                    self.respond(200, {'profile': database.get_profile(user_id)})
                    return
                if method == 'POST' and path == '/api/profile':
                    self.respond(200, {'profile': database.save_profile(user_id, payload)})
                    return

                if method == 'GET' and path == '/api/settings':
                    self.respond(200, {'settings': database.get_settings(user_id)})
                    return
                if method == 'POST' and path == '/api/settings':
                    self.respond(200, {'settings': database.save_settings(user_id, payload)})
                    return

                if method == 'GET' and path == '/api/schedules':
                    self.respond(200, {'items': database.list_schedules(user_id)})
                    return
                if method == 'POST' and path == '/api/schedules':
                    self.respond(201, {'item': database.create_schedule(user_id, payload)})
                    return
                if path.startswith('/api/schedules/'):
                    item_id = path.split('/')[-1]
                    if method == 'PUT':
                        self.respond(200, {'item': database.update_schedule(user_id, item_id, payload)})
                        return
                    if method == 'DELETE':
                        self.respond(200, database.delete_schedule(user_id, item_id))
                        return

                if method == 'GET' and path == '/api/favorites':
                    self.respond(200, {'favorites': database.get_favorites(user_id)})
                    return
                if method == 'POST' and path == '/api/favorites':
                    favorite_type = payload.get('type', 'looks')
                    item = payload.get('item') or {}
                    self.respond(200, {'favorites': database.add_favorite(user_id, favorite_type, item)})
                    return
                if method == 'DELETE' and path.startswith('/api/favorites/'):
                    _, _, _, favorite_type, item_id = path.split('/', 4)
                    self.respond(200, {'favorites': database.remove_favorite(user_id, favorite_type, item_id)})
                    return

                if method == 'GET' and path == '/api/discovery/social':
                    self.respond(200, {'social': database.get_discovery_social(user_id)})
                    return
                if method == 'POST' and path.startswith('/api/discovery/social/posts/') and path.endswith('/like'):
                    segments = path.split('/')
                    post_id = segments[5]
                    self.respond(200, {'social': database.set_discovery_post_like(user_id, post_id, payload.get('liked'))})
                    return
                if method == 'POST' and path.startswith('/api/discovery/social/authors/') and path.endswith('/follow'):
                    segments = path.split('/')
                    author_id = segments[5]
                    self.respond(200, {'social': database.set_discovery_author_follow(user_id, author_id, payload.get('followed'))})
                    return

                if method == 'GET' and path == '/api/discovery/content':
                    locale = parse_qs(parsed.query).get('locale', ['en-US'])[0]
                    self.respond(200, database.get_discovery_content(locale))
                    return

                if method == 'GET' and path == '/api/home/content':
                    locale = parse_qs(parsed.query).get('locale', ['en-US'])[0]
                    self.respond(200, database.get_home_content(locale))
                    return

                if method == 'GET' and path == '/api/discovery/comments':
                    self.respond(200, {'comments': database.get_discovery_comments(user_id)})
                    return
                if method == 'POST' and path.startswith('/api/discovery/comments/posts/'):
                    post_id = path.split('/')[-1]
                    self.respond(201, {'comment': database.create_discovery_comment(user_id, post_id, payload)})
                    return

                if method == 'POST' and path == '/api/media/prepare':
                    self.respond(201, {'upload': database.prepare_media_upload(user_id, payload)})
                    return
                if method == 'POST' and path.startswith('/api/media/upload/'):
                    token = path.split('/')[-1]
                    self.respond(201, {'media': database.upload_media_content(user_id, token, payload)})
                    return
                if method == 'GET' and path.startswith('/api/media/files/'):
                    media_id = path.split('/')[-1]
                    media_file = database.get_media_file(media_id)
                    self.respond_bytes(
                        200,
                        media_file['mimeType'],
                        base64.b64decode(media_file['contentBase64'])
                    )
                    return

                if method == 'GET' and path == '/api/wardrobe':
                    self.respond(200, {'items': database.list_wardrobe(user_id)})
                    return
                if method == 'POST' and path == '/api/wardrobe':
                    item = payload.get('item') or payload
                    self.respond(201, {'item': database.create_wardrobe_item(user_id, item)})
                    return
                if path.startswith('/api/wardrobe/'):
                    item_id = path.split('/')[-1]
                    if method == 'PUT':
                        item = payload.get('item') or payload
                        self.respond(200, {'item': database.update_wardrobe_item(user_id, item_id, item)})
                        return
                    if method == 'DELETE':
                        self.respond(200, database.delete_wardrobe_item(user_id, item_id))
                        return

                self.respond(404, {'error': 'NOT_FOUND'})
            except ValueError as exc:
                self.respond(409, {'error': str(exc)})
            except LookupError as exc:
                self.respond(404, {'error': str(exc)})
            except PermissionError as exc:
                self.respond(401, {'error': str(exc)})
            except Exception as exc:
                self.respond(500, {'error': 'SERVER_ERROR', 'detail': str(exc)})

    return LiteBackendHandler
