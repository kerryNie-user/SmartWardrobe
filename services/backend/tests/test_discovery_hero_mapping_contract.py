import os
import tempfile
import unittest
from pathlib import Path

from services.backend.database import db
from services.backend.storage import JsonDatabase


class DiscoveryHeroMappingContractTest(unittest.TestCase):
    def setUp(self):
        db_path = Path(tempfile.mkdtemp()) / "test.db"
        os.environ["SQLITE_DB"] = str(db_path)
        self.storage = JsonDatabase(str(db_path))

    def tearDown(self):
        if not db.is_closed():
            db.close()

        db_path = os.environ.get("SQLITE_DB")
        if db_path and os.path.exists(db_path):
            os.remove(db_path)

    def test_ai_post_rejects_local_image_aliases(self):
        post_data = {
            "id": "post-1",
            "ai": {"schema": "ct_ai_post_v1"},
            "heroImage": "images/foo.jpg",
            "images": []
        }
        assert self.storage._resolve_post_hero(post_data) == ""

    def test_ai_post_uses_network_image_from_candidates(self):
        post_data = {
            "id": "post-1",
            "ai": {"schema": "ct_ai_post_v1"},
            "heroImage": "images/foo.jpg",
            "images": ["https://example.com/network.jpg"]
        }
        assert self.storage._resolve_post_hero(post_data) == "https://example.com/network.jpg"

    def test_non_ai_post_keeps_web_images_prefix(self):
        post_data = {
            "id": "post-2",
            "ai": None,
            "heroImage": "images/foo.jpg",
            "images": []
        }
        assert self.storage._resolve_post_hero(post_data) == "images/foo.jpg"


if __name__ == "__main__":
    unittest.main()
