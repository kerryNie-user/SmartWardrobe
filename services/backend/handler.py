import json
import logging
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler
from urllib.parse import urlparse

from .http import (
    ApiError,
    BytesResponse,
    JsonResponse,
    handle_api_request,
    serve_ai_image_asset,
    serve_upload_asset,
)


def create_handler(database, directory):
    class LiteBackendHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

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

        def log_message(self, format, *args):
            logging.getLogger("backend.http").info("%s - %s", self.address_string(), format % args)

        def do_OPTIONS(self):
            self.send_response(HTTPStatus.NO_CONTENT)
            self.end_headers()

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
                self.handle_bytes(lambda: serve_upload_asset(self.path))
                return

            if self.path.startswith('/ai-images/'):
                self.handle_bytes(lambda: serve_ai_image_asset(self.path))
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
            try:
                return json.loads(raw.decode('utf-8'))
            except Exception as exc:
                raise ApiError(400, 'INVALID_JSON', 'Invalid JSON payload', {'detail': str(exc)})

        def respond_error(self, status: int, code: str, message: str, details: dict | None = None):
            self.respond(status, {
                'error': {
                    'code': str(code),
                    'message': str(message),
                    'details': details or {}
                }
            })

        def respond(self, status=200, payload=None):
            body = json.dumps(payload or {}, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def respond_bytes(self, status=200, content_type='application/octet-stream', body=b'', headers=None):
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            for key, value in (headers or {}).items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(body)

        def send_response_contract(self, response):
            if isinstance(response, JsonResponse):
                self.respond(response.status, response.payload)
                return
            if isinstance(response, BytesResponse):
                self.respond_bytes(response.status, response.content_type, response.body, response.headers)
                return
            raise ApiError(500, 'API_CONTRACT_MISSING', 'API response contract missing')

        def handle_api(self, method):
            try:
                payload = self.parse_json_body() if method in {'POST', 'PUT'} else {}
                response = handle_api_request(database, method, self.path, payload, self.headers)
                self.send_response_contract(response)
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

        def handle_bytes(self, resolver):
            try:
                self.send_response_contract(resolver())
            except ApiError as exc:
                self.respond_error(exc.status, exc.code, exc.message, exc.details)
            except Exception as exc:
                self.respond_error(500, 'INTERNAL', 'Internal server error', {'detail': str(exc)})

    return LiteBackendHandler
