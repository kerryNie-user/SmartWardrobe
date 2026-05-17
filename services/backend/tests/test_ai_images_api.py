import os
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib import error, request

from services.backend.handler import create_handler
from services.backend.database import db
from services.backend.init_db import init_db

class AiImagesApiTest(unittest.TestCase):
    def setUp(self):
        self.db_path = Path(tempfile.mkdtemp()) / "test.db"
        os.environ["SQLITE_DB"] = str(self.db_path)
        db.init(str(self.db_path))
        if db.is_closed():
            db.connect()
        init_db()
        
        self.project_root = Path(__file__).resolve().parents[3]
        self.web_root = self.project_root / 'apps' / 'web'
        
        handler = create_handler(None, self.web_root)
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f'http://127.0.0.1:{self.server.server_port}'
        
        self.ai_images_dir = self.project_root / 'services' / 'ai_blogger' / 'output' / 'images'
        self.ai_images_dir.mkdir(parents=True, exist_ok=True)
        
        self.test_image_path = self.ai_images_dir / 'test_ai_image.jpg'
        with open(self.test_image_path, 'wb') as f:
            f.write(b'fake-ai-image-content')

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        
        if self.test_image_path.exists():
            os.remove(self.test_image_path)
        
        if not db.is_closed():
            db.close()
        if self.db_path.exists():
            os.remove(self.db_path)

    def request_file(self, path):
        req = request.Request(f'{self.base_url}{path}', method='GET')
        try:
            with request.urlopen(req) as response:
                return response.status, response.read()
        except error.HTTPError as exc:
            return exc.code, exc.read()

    def test_serve_ai_images_returns_file_content(self):
        status, content = self.request_file('/ai-images/test_ai_image.jpg')
        self.assertEqual(status, 200)
        self.assertEqual(content, b'fake-ai-image-content')

    def test_serve_ai_images_returns_404_for_missing_file(self):
        status, _ = self.request_file('/ai-images/missing_image.jpg')
        self.assertEqual(status, 404)

    def test_serve_ai_images_prevents_directory_traversal(self):
        status, _ = self.request_file('/ai-images/../test_ai_image.jpg')
        self.assertEqual(status, 403)

if __name__ == '__main__':
    unittest.main()
