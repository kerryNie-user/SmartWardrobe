import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib import error, request

from services.backend_lite.handler import create_handler
from services.backend_lite.storage import JsonDatabase


class DiscoverySocialApiTest(unittest.TestCase):
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

    def request_json(self, method, path, payload=None, user_id='user-social'):
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

    def test_get_discovery_social_returns_default_shape(self):
        status, payload = self.request_json('GET', '/api/discovery/social')
        self.assertEqual(status, 200)
        self.assertEqual(payload['social']['posts'], {})
        self.assertEqual(payload['social']['authors'], {})

    def test_like_and_follow_routes_persist_per_user(self):
        like_status, _ = self.request_json(
            'POST',
            '/api/discovery/social/posts/brutalist-basics/like',
            {'liked': True}
        )
        follow_status, _ = self.request_json(
            'POST',
            '/api/discovery/social/authors/ELIAS.VAULT/follow',
            {'followed': True}
        )
        status, payload = self.request_json('GET', '/api/discovery/social')

        self.assertEqual(like_status, 200)
        self.assertEqual(follow_status, 200)
        self.assertEqual(status, 200)
        self.assertTrue(payload['social']['posts']['brutalist-basics']['likedByUser'])
        self.assertTrue(payload['social']['authors']['ELIAS.VAULT']['followedByUser'])

    def test_discovery_social_is_isolated_by_user(self):
        self.request_json(
            'POST',
            '/api/discovery/social/posts/brutalist-basics/like',
            {'liked': True},
            user_id='user-alpha'
        )
        self.request_json(
            'POST',
            '/api/discovery/social/authors/ELIAS.VAULT/follow',
            {'followed': True},
            user_id='user-alpha'
        )

        alpha_status, alpha_payload = self.request_json('GET', '/api/discovery/social', user_id='user-alpha')
        beta_status, beta_payload = self.request_json('GET', '/api/discovery/social', user_id='user-beta')

        self.assertEqual(alpha_status, 200)
        self.assertEqual(beta_status, 200)
        self.assertTrue(alpha_payload['social']['posts']['brutalist-basics']['likedByUser'])
        self.assertTrue(alpha_payload['social']['authors']['ELIAS.VAULT']['followedByUser'])
        self.assertEqual(beta_payload['social']['posts'], {})
        self.assertEqual(beta_payload['social']['authors'], {})


if __name__ == '__main__':
    unittest.main()
