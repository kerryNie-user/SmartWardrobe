import base64
import json
import logging
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs


def create_handler(database, directory):
    class ApiError(Exception):
        def __init__(self, status: int, code: str, message: str, details: dict | None = None):
            super().__init__(message)
            self.status = int(status)
            self.code = str(code)
            self.message = str(message)
            self.details = details or {}

    class LiteBackendHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

        def respond_error(self, status: int, code: str, message: str, details: dict | None = None):
            self.respond(status, {
                'error': {
                    'code': str(code),
                    'message': str(message),
                    'details': details or {}
                }
            })

        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            try:
                path = urlparse(self.path).path
                if path.endswith(('.html', '.js', '.css')):
                    self.send_header('Cache-Control', 'no-store')
            except Exception:
                pass
            super().end_headers()

        def do_OPTIONS(self):
            self.send_response(HTTPStatus.NO_CONTENT)
            self.end_headers()

        def log_message(self, format, *args):
            logging.getLogger("backend.http").info("%s - %s", self.address_string(), format % args)

        def do_GET(self):
            if self.path == '/favicon.ico':
                self.send_response(HTTPStatus.NO_CONTENT)
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                return

            if self.path.startswith('/api/'):
                self.handle_api('GET')
                return
            
            if self.path.startswith('/uploads/'):
                self.serve_upload()
                return

            if self.path.startswith('/ai-images/'):
                self.serve_ai_images()
                return

            super().do_GET()

        def serve_ai_images(self):
            filename = self.path.split('/')[-1]
            
            # Prevent directory traversal
            if '..' in self.path:
                self.respond_error(403, 'FORBIDDEN', 'Forbidden')
                return
                
            from pathlib import Path
            project_root = Path(__file__).resolve().parents[2]
            image_path = project_root / 'services' / 'ai_blogger' / 'output' / 'images' / filename
            
            if not image_path.exists() or not image_path.is_file():
                self.respond_error(404, 'NOT_FOUND', 'Not found')
                return
                
            # Determine content type based on extension
            content_type = 'image/jpeg'
            if filename.endswith('.png'):
                content_type = 'image/png'
            elif filename.endswith('.webp'):
                content_type = 'image/webp'
                
            with open(image_path, 'rb') as f:
                self.respond_bytes(200, content_type, f.read())

        def serve_upload(self):
            import mimetypes
            import os
            
            # Remove '/uploads/' prefix
            file_path = self.path[9:]
            
            # Prevent directory traversal
            if '..' in file_path or file_path.startswith('/'):
                self.respond_error(403, 'FORBIDDEN', 'Forbidden')
                return
                
            full_path = os.path.join(os.path.dirname(__file__), 'uploads', file_path)
            
            if not os.path.exists(full_path) or not os.path.isfile(full_path):
                self.respond_error(404, 'NOT_FOUND', 'File not found')
                return
                
            try:
                with open(full_path, 'rb') as f:
                    content = f.read()
                
                mime_type, _ = mimetypes.guess_type(full_path)
                if not mime_type:
                    mime_type = 'application/octet-stream'
                    
                self.send_response(200)
                self.send_header('Content-Type', mime_type)
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'public, max-age=31536000')
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.respond_error(500, 'INTERNAL', 'Internal server error', {'detail': str(e)})

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
            try:
                return json.loads(raw.decode('utf-8'))
            except Exception as exc:
                raise ApiError(400, 'INVALID_JSON', 'Invalid JSON payload', {'detail': str(exc)})

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
                    if not isinstance(user, dict):
                        raise ApiError(500, 'AUTH_CONTRACT_MISSING', 'Auth contract missing', {'path': 'user'})
                    self.respond(201, {'user': user})
                    return

                if method == 'POST' and path == '/api/auth/login':
                    user = database.login_user(payload)
                    if not isinstance(user, dict):
                        raise ApiError(500, 'AUTH_CONTRACT_MISSING', 'Auth contract missing', {'path': 'user'})
                    self.respond(200, {'user': user})
                    return

                user_id = self.resolve_user_id(payload)

                if method == 'GET' and path == '/api/profile':
                    profile = database.get_profile(user_id)
                    if not isinstance(profile, dict):
                        raise ApiError(500, 'PROFILE_CONTRACT_MISSING', 'Profile contract missing', {'path': 'profile'})
                    self.respond(200, {'profile': profile})
                    return
                if method == 'POST' and path == '/api/profile':
                    profile = database.save_profile(user_id, payload)
                    if not isinstance(profile, dict):
                        raise ApiError(500, 'PROFILE_CONTRACT_MISSING', 'Profile contract missing', {'path': 'profile'})
                    self.respond(200, {'profile': profile})
                    return

                if method == 'GET' and path == '/api/settings':
                    settings = database.get_settings(user_id)
                    if not isinstance(settings, dict):
                        raise ApiError(500, 'SETTINGS_CONTRACT_MISSING', 'Settings contract missing', {'path': 'settings'})
                    self.respond(200, {'settings': settings})
                    return
                if method == 'POST' and path == '/api/settings':
                    settings = database.save_settings(user_id, payload)
                    if not isinstance(settings, dict):
                        raise ApiError(500, 'SETTINGS_CONTRACT_MISSING', 'Settings contract missing', {'path': 'settings'})
                    self.respond(200, {'settings': settings})
                    return

                if method == 'GET' and path.startswith('/api/schedules/content'):
                    parsed = urlparse(self.path)
                    qs = parse_qs(parsed.query)
                    locale = qs.get('locale', ['en-US'])[0]
                    content = database.get_schedule_content(user_id, locale)
                    if not isinstance(content, dict) or 'tabs' not in content or 'views' not in content:
                        raise ApiError(500, 'SCHEDULE_CONTRACT_MISSING', 'Schedule content contract missing', {'required': ['tabs', 'views']})
                    self.respond(200, content)
                    return

                if method == 'GET' and path == '/api/schedules':
                    items = database.list_schedules(user_id)
                    if not isinstance(items, list):
                        raise ApiError(500, 'SCHEDULES_CONTRACT_MISSING', 'Schedules contract missing', {'path': 'items'})
                    self.respond(200, {'items': items})
                    return
                if method == 'POST' and path == '/api/schedules':
                    item = database.create_schedule(user_id, payload)
                    if not isinstance(item, dict):
                        raise ApiError(500, 'SCHEDULES_CONTRACT_MISSING', 'Schedules contract missing', {'path': 'item'})
                    self.respond(201, {'item': item})
                    return
                if path.startswith('/api/schedules/'):
                    item_id = path.split('/')[-1]
                    if method == 'PUT':
                        item = database.update_schedule(user_id, item_id, payload)
                        if not isinstance(item, dict):
                            raise ApiError(500, 'SCHEDULES_CONTRACT_MISSING', 'Schedules contract missing', {'path': 'item'})
                        self.respond(200, {'item': item})
                        return
                    if method == 'DELETE':
                        result = database.delete_schedule(user_id, item_id)
                        if not isinstance(result, dict):
                            raise ApiError(500, 'SCHEDULES_CONTRACT_MISSING', 'Schedules contract missing', {'path': 'deleted'})
                        self.respond(200, result)
                        return

                if method == 'GET' and path == '/api/favorites':
                    favorites = database.get_favorites(user_id)
                    if not isinstance(favorites, dict):
                        raise ApiError(500, 'FAVORITES_CONTRACT_MISSING', 'Favorites contract missing', {'path': 'favorites'})
                    self.respond(200, {'favorites': favorites})
                    return
                if method == 'POST' and path == '/api/favorites':
                    favorite_type = payload.get('type', 'looks')
                    item = payload.get('item') or {}
                    favorites = database.add_favorite(user_id, favorite_type, item)
                    if not isinstance(favorites, dict):
                        raise ApiError(500, 'FAVORITES_CONTRACT_MISSING', 'Favorites contract missing', {'path': 'favorites'})
                    self.respond(200, {'favorites': favorites})
                    return
                if method == 'DELETE' and path.startswith('/api/favorites/'):
                    _, _, _, favorite_type, item_id = path.split('/', 4)
                    favorites = database.remove_favorite(user_id, favorite_type, item_id)
                    if not isinstance(favorites, dict):
                        raise ApiError(500, 'FAVORITES_CONTRACT_MISSING', 'Favorites contract missing', {'path': 'favorites'})
                    self.respond(200, {'favorites': favorites})
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
                    result = database.get_discovery_content(locale)
                    content = result.get('content') if isinstance(result, dict) else None
                    if not isinstance(content, dict) or 'editorials' not in content:
                        raise ApiError(500, 'DISCOVERY_CONTRACT_MISSING', 'Discovery content contract missing', {'path': 'content.editorials'})
                    self.respond(200, result)
                    return

                if method == 'POST' and path == '/api/admin/regenerate_editorials':
                    locale = str(payload.get('locale', 'all') or 'all')
                    limit = int(payload.get('limit') or 0)
                    dry_run = bool(payload.get('dryRun', False))
                    update_time = bool(payload.get('updateTime', False))
                    batch_id = payload.get('batchId')
                    skip_if_ai = bool(payload.get('skipIfAi', False))
                    self.respond(200, {'report': database.regenerate_editorials(locale=locale, limit=limit, dry_run=dry_run, update_time=update_time, batch_id=batch_id, skip_if_ai=skip_if_ai)})
                    return

                if method == 'POST' and path == '/api/admin/cleanup_editorials':
                    locale = str(payload.get('locale', 'all') or 'all')
                    keep_batch_id = payload.get('keepBatchId')
                    dry_run = bool(payload.get('dryRun', False))
                    self.respond(200, {'report': database.cleanup_editorials_keep_batch(locale=locale, keep_batch_id=keep_batch_id, dry_run=dry_run)})
                    return

                if method == 'GET' and path == '/api/home/content':
                    locale = parse_qs(parsed.query).get('locale', ['en-US'])[0]
                    result = database.get_home_content(locale)
                    content = result.get('content') if isinstance(result, dict) else None
                    if not isinstance(content, dict) or 'tabs' not in content:
                        raise ApiError(500, 'HOME_CONTRACT_MISSING', 'Home content contract missing', {'path': 'content.tabs'})
                    self.respond(200, result)
                    return

                if method == 'GET' and path == '/api/discovery/comments':
                    self.respond(200, {'comments': database.get_discovery_comments(user_id)})
                    return
                if method == 'POST' and path.startswith('/api/discovery/comments/posts/'):
                    post_id = path.split('/')[-1]
                    self.respond(201, {'comment': database.create_discovery_comment(user_id, post_id, payload)})
                    return

                if method == 'POST' and path == '/api/media/prepare':
                    upload = database.prepare_media_upload(user_id, payload)
                    if not isinstance(upload, dict) or not upload.get('token') or not upload.get('remoteUrl'):
                        raise ApiError(500, 'MEDIA_CONTRACT_MISSING', 'Media upload contract missing', {'path': 'upload'})
                    self.respond(201, {'upload': upload})
                    return
                if method == 'POST' and path.startswith('/api/media/upload/'):
                    token = path.split('/')[-1]
                    media = database.upload_media_content(user_id, token, payload)
                    if not isinstance(media, dict) or not media.get('remoteUrl'):
                        raise ApiError(500, 'MEDIA_CONTRACT_MISSING', 'Media contract missing', {'path': 'media'})
                    self.respond(201, {'media': media})
                    return
                if method == 'GET' and path.startswith('/api/media/files/'):
                    media_id = path.split('/')[-1]
                    media_file = database.get_media_file(media_id)
                    if not isinstance(media_file, dict) or 'mimeType' not in media_file or 'contentBase64' not in media_file:
                        raise ApiError(500, 'MEDIA_CONTRACT_MISSING', 'Media file contract missing', {'path': 'media'})
                    self.respond_bytes(
                        200,
                        media_file['mimeType'],
                        base64.b64decode(media_file['contentBase64'])
                    )
                    return

                if method == 'GET' and path == '/api/wardrobe':
                    items = database.list_wardrobe(user_id)
                    if not isinstance(items, list):
                        raise ApiError(500, 'WARDROBE_CONTRACT_MISSING', 'Wardrobe contract missing', {'path': 'items'})
                    self.respond(200, {'items': items})
                    return
                if method == 'POST' and path == '/api/wardrobe':
                    item = payload.get('item') or payload
                    created = database.create_wardrobe_item(user_id, item)
                    if not isinstance(created, dict):
                        raise ApiError(500, 'WARDROBE_CONTRACT_MISSING', 'Wardrobe contract missing', {'path': 'item'})
                    self.respond(201, {'item': created})
                    return
                if path.startswith('/api/wardrobe/'):
                    item_id = path.split('/')[-1]
                    if method == 'PUT':
                        item = payload.get('item') or payload
                        updated = database.update_wardrobe_item(user_id, item_id, item)
                        if not isinstance(updated, dict):
                            raise ApiError(500, 'WARDROBE_CONTRACT_MISSING', 'Wardrobe contract missing', {'path': 'item'})
                        self.respond(200, {'item': updated})
                        return
                    if method == 'DELETE':
                        result = database.delete_wardrobe_item(user_id, item_id)
                        if not isinstance(result, dict):
                            raise ApiError(500, 'WARDROBE_CONTRACT_MISSING', 'Wardrobe contract missing', {'path': 'deleted'})
                        self.respond(200, result)
                        return

                raise ApiError(404, 'NOT_FOUND', 'Route not found', {'path': path, 'method': method})
            except ApiError as exc:
                self.respond_error(exc.status, exc.code, exc.message, exc.details)
            except ValueError as exc:
                code = str(exc) or 'CONFLICT'
                self.respond_error(409, code, code)
            except LookupError as exc:
                code = str(exc) or 'NOT_FOUND'
                self.respond_error(404, code, code)
            except PermissionError as exc:
                code = str(exc) or 'UNAUTHORIZED'
                self.respond_error(401, code, code)
            except Exception as exc:
                self.respond_error(500, 'INTERNAL', 'Internal server error', {'detail': str(exc)})

    return LiteBackendHandler
