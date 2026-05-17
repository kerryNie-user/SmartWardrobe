import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib import request

from services.backend.handler import create_handler
from services.backend.storage import JsonDatabase


class FaviconRouteTest(unittest.TestCase):
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

    def test_favicon_returns_no_content(self):
        req = request.Request(f'{self.base_url}/favicon.ico', method='GET')
        with request.urlopen(req) as response:
            self.assertEqual(response.status, 204)
            self.assertEqual(response.read(), b'')


if __name__ == '__main__':
    unittest.main()
