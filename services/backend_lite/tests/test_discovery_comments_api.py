import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib import error, request

from services.backend_lite.handler import create_handler
from services.backend_lite.storage import JsonDatabase


class DiscoveryCommentsApiTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = JsonDatabase(Path(self.temp_dir.name) / 'db.json')
        web_root = Path(__file__).resolve().parents[3] / 'apps' / 'web-new'
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

    def request_json(self, method, path, payload=None, user_id='user-comments'):
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
                return response.status, json.loads(response.read().decode('utf-8'))
        except error.HTTPError as exc:
            return exc.code, json.loads(exc.read().decode('utf-8'))

    def test_get_discovery_comments_returns_default_shape(self):
        status, payload = self.request_json('GET', '/api/discovery/comments')
        self.assertEqual(status, 200)
        self.assertEqual(payload['comments']['posts'], {})

    def test_post_discovery_comment_returns_stable_comment_id(self):
        create_status, create_payload = self.request_json(
            'POST',
            '/api/discovery/comments/posts/brutalist-basics',
            {
                'comment': {
                    'author': 'You',
                    'time': 'Just now',
                    'body': 'Love the silhouette.'
                }
            }
        )
        fetch_status, fetch_payload = self.request_json('GET', '/api/discovery/comments')

        self.assertEqual(create_status, 201)
        self.assertRegex(create_payload['comment']['id'], r'^comment-')
        self.assertEqual(fetch_status, 200)
        self.assertEqual(fetch_payload['comments']['posts']['brutalist-basics'][0]['body'], 'Love the silhouette.')

    def test_post_discovery_comment_rejects_empty_body(self):
        status, payload = self.request_json(
            'POST',
            '/api/discovery/comments/posts/brutalist-basics',
            {
                'comment': {
                    'author': 'You',
                    'time': 'Just now',
                    'body': '   '
                }
            }
        )
        self.assertEqual(status, 409)
        self.assertEqual(payload['error'], 'DISCOVERY_COMMENT_BODY_REQUIRED')

    def test_discovery_comments_are_isolated_by_user(self):
        self.request_json(
            'POST',
            '/api/discovery/comments/posts/brutalist-basics',
            {
                'comment': {
                    'author': 'Alpha',
                    'time': 'Just now',
                    'body': 'Alpha only comment.'
                }
            },
            user_id='user-alpha'
        )

        alpha_status, alpha_payload = self.request_json('GET', '/api/discovery/comments', user_id='user-alpha')
        beta_status, beta_payload = self.request_json('GET', '/api/discovery/comments', user_id='user-beta')

        self.assertEqual(alpha_status, 200)
        self.assertEqual(beta_status, 200)
        self.assertEqual(alpha_payload['comments']['posts']['brutalist-basics'][0]['body'], 'Alpha only comment.')
        self.assertEqual(beta_payload['comments']['posts'], {})


if __name__ == '__main__':
    unittest.main()
