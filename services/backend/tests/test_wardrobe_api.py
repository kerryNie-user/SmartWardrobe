import os
import shutil
import tempfile
import unittest
from pathlib import Path

from services.backend.database import db
from services.backend.init_db import init_db
from services.backend.storage import JsonDatabase


class WardrobeApiTest(unittest.TestCase):
    def setUp(self):
        self.tempdir = Path(tempfile.mkdtemp())
        self.db_path = self.tempdir / 'test.db'
        os.environ['SQLITE_DB'] = str(self.db_path)
        db.init(str(self.db_path))
        if db.is_closed():
            db.connect()
        init_db()
        self.storage = JsonDatabase(str(self.db_path))

    def tearDown(self):
        if not db.is_closed():
            db.close()
        shutil.rmtree(self.tempdir, ignore_errors=True)

    def test_wardrobe_item_persists_ai_json(self):
        created = self.storage.create_wardrobe_item('user-wardrobe', {
            'title': 'Pending Recognition Item',
            'category': 'Uncategorized',
            'image': 'data:image/png;base64,preview',
            'filter': 'uncategorized',
            'aiJson': {
                'schema': 'ct_wardrobe_scan_v1',
                'status': 'ready',
                'source': 'wardrobe-item-scanner',
                'tags': ['tailoring']
            }
        })

        self.assertEqual(created['aiJson']['status'], 'ready')

        items = self.storage.list_wardrobe('user-wardrobe')
        self.assertEqual(items[0]['aiJson']['source'], 'wardrobe-item-scanner')

        updated = self.storage.update_wardrobe_item('user-wardrobe', created['id'], {
            'aiJson': {
                'schema': 'ct_wardrobe_scan_v1',
                'status': 'unavailable',
                'source': 'wardrobe-item-scanner',
                'tags': []
            }
        })
        self.assertEqual(updated['aiJson']['status'], 'unavailable')


if __name__ == '__main__':
    unittest.main()
