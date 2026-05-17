import os
import tempfile
import unittest
from pathlib import Path

from services.backend.database import db
from services.backend.storage import JsonDatabase


class ProfileAvatarContractTest(unittest.TestCase):
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

    def test_legacy_avatar_path_is_normalized_on_read(self):
        user = self.storage.create_user({
            "name": "Reader",
            "emailOrMobile": "reader@example.com",
            "password": "secret"
        })

        assert user["avatar"] == "/uploads/profile/elara-vance.jpg"

        profile = self.storage.get_profile(user["id"])
        assert profile["avatar"] == "/uploads/profile/elara-vance.jpg"

    def test_legacy_avatar_path_is_normalized_on_save(self):
        user = self.storage.create_user({
            "name": "Editor",
            "emailOrMobile": "editor@example.com",
            "password": "secret"
        })

        profile = self.storage.save_profile(user["id"], {
            "name": "Editor",
            "bio": "Updated",
            "avatar": "./images/profile/elara-vance.jpg"
        })

        assert profile["avatar"] == "/uploads/profile/elara-vance.jpg"


if __name__ == "__main__":
    unittest.main()
