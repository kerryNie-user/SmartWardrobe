import base64
import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib import error, request

from services.backend.handler import create_handler
from services.backend.storage import JsonDatabase


class MediaApiTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = JsonDatabase(Path(self.temp_dir.name) / 'db.json')
        web_root = Path(__file__).resolve().parents[3] / 'apps' / 'web'
        handler = create_handler(self.database, web_root)
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f'http://127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp_dir.cleanup()

    def request_json(self, method, path, payload=None, user_id='user-media'):
        data = None if payload is None else json.dumps(payload).encode('utf-8')
        req = request.Request(
            f'{self.base_url}{path}',
            method=method,
            data=data,
            headers={
                'Content-Type': 'application/json',
                'X-User-Id': user_id
            }
        )
        try:
            with request.urlopen(req) as response:
                content_type = response.headers.get('Content-Type', '')
                body = response.read()
                if 'application/json' in content_type:
                    return response.status, json.loads(body.decode('utf-8'))
                return response.status, body
        except error.HTTPError as exc:
            content_type = exc.headers.get('Content-Type', '')
            body = exc.read()
            if 'application/json' in content_type:
                return exc.code, json.loads(body.decode('utf-8'))
            return exc.code, body

    def test_prepare_and_upload_media_returns_served_remote_url(self):
        prepare_status, prepare_payload = self.request_json(
            'POST',
            '/api/media/prepare',
            {
                'mimeType': 'image/png',
                'fileName': 'preview.png',
                'sourceKind': 'web-file'
            }
        )
        self.assertEqual(prepare_status, 201)
        upload = prepare_payload['upload']
        self.assertTrue(upload['token'].startswith('upload-'))
        self.assertTrue(upload['mediaId'].startswith('media-'))
        self.assertTrue(upload['remoteUrl'].startswith('/api/media/files/'))

        encoded = base64.b64encode(b'fake-image-bytes').decode('utf-8')
        upload_status, upload_payload = self.request_json(
            'POST',
            f"/api/media/upload/{upload['token']}",
            {
                'contentBase64': encoded
            }
        )
        self.assertEqual(upload_status, 201)
        self.assertEqual(upload_payload['media']['remoteUrl'], upload['remoteUrl'])

        file_status, file_body = self.request_json('GET', upload['remoteUrl'])
        self.assertEqual(file_status, 200)
        self.assertEqual(file_body, b'fake-image-bytes')


if __name__ == '__main__':
    unittest.main()
