import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib import error, request

from services.backend.handler import create_handler
from services.backend.storage import JsonDatabase


class DiscoveryContentApiTest(unittest.TestCase):
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

    def request_json(self, path):
        req = request.Request(f'{self.base_url}{path}', method='GET')
        try:
            with request.urlopen(req) as response:
                return response.status, json.loads(response.read().decode('utf-8'))
        except error.HTTPError as exc:
            return exc.code, json.loads(exc.read().decode('utf-8'))

    def test_get_discovery_content_returns_default_en_us_shape(self):
        status, payload = self.request_json('/api/discovery/content')

        self.assertEqual(status, 200)
        self.assertIn('content', payload)
        self.assertEqual(payload['locale'], 'en-US')
        self.assertNotIn('tabs', payload['content'])
        self.assertNotIn('communityPosts', payload['content'])
        self.assertEqual(payload['content']['searchPlaceholder']['editorials'], 'HOT SEARCHES · STYLE GUIDE · TRENDS')

    def test_get_discovery_content_supports_zh_cn_locale(self):
        status, payload = self.request_json('/api/discovery/content?locale=zh-CN')

        self.assertEqual(status, 200)
        self.assertEqual(payload['locale'], 'zh-CN')
        self.assertNotIn('tabs', payload['content'])
        self.assertNotIn('communityPosts', payload['content'])
        self.assertEqual(payload['content']['searchPlaceholder']['editorials'], '热门搜索 · 穿搭指南 · 趋势解析')


if __name__ == '__main__':
    unittest.main()
