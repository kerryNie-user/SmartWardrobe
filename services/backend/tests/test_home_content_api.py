import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib import error, request

from services.backend.handler import create_handler
from services.backend.storage import JsonDatabase


class HomeContentApiTest(unittest.TestCase):
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

    def test_get_home_content_returns_default_en_us_shape(self):
        status, payload = self.request_json('/api/home/content')

        self.assertEqual(status, 200)
        self.assertEqual(payload['locale'], 'en-US')
        self.assertEqual(payload['content']['tabs'][0]['key'], 'recommend')
        self.assertEqual(payload['content']['recommendLooks'][0]['id'], 'urban-commute')
        self.assertEqual(payload['content']['weather']['condition'], 'Unknown')

    def test_get_home_content_supports_zh_cn_locale(self):
        status, payload = self.request_json('/api/home/content?locale=zh-CN')

        self.assertEqual(status, 200)
        self.assertEqual(payload['locale'], 'zh-CN')
        self.assertEqual(payload['content']['tabs'][0]['label'], '推荐')
        self.assertEqual(payload['content']['recommendLooks'][0]['title'], '都市通勤')
        self.assertEqual(payload['content']['schedule']['label'], '即将到来的日程')


if __name__ == '__main__':
    unittest.main()
