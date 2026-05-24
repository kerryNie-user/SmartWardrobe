import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from services.backend.database import db
from services.backend.init_db import init_db
from services.backend.models import User
from services.backend.server import create_server
from services.backend.storage import JsonDatabase
from services.backend.storage_domains.shared import DEBUG_USER


class FakeServer:
    def __init__(self, address, handler_class):
        self.server_address = address
        self.handler_class = handler_class


class ServerStartupContractTest(unittest.TestCase):
    def test_create_server_creates_database_directory_and_uses_requested_host_port(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_file = Path(tmp_dir) / "nested" / "db.json"
            web_root = Path(tmp_dir) / "web"
            web_root.mkdir(parents=True, exist_ok=True)

            with patch('services.backend.server.SmartWardrobeHTTPServer', FakeServer):
                server = create_server(
                    host='127.0.0.1',
                    port=8150,
                    web_root=web_root,
                    data_file=data_file
                )

            assert data_file.parent.exists()
            assert server.server_address == ('127.0.0.1', 8150)

    def test_debug_user_bootstrap_accepts_existing_legacy_user_id(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "legacy.db"
            if not db.is_closed():
                db.close()
            db.init(str(db_path))
            db.connect()
            try:
                init_db()
                User.create(
                    id=DEBUG_USER['id'],
                    name='ClosetTwin 用户',
                    emailOrMobile='member@closettwin.local',
                    password='password123',
                    avatar='',
                    bio=''
                )

                JsonDatabase(str(db_path))

                users = list(User.select().where(User.id == DEBUG_USER['id']))
                assert len(users) == 1
                assert users[0].emailOrMobile == 'member@closettwin.local'
            finally:
                if not db.is_closed():
                    db.close()


if __name__ == "__main__":
    unittest.main()
