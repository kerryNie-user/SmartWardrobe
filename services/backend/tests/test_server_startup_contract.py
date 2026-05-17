import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from services.backend.server import create_server


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


if __name__ == "__main__":
    unittest.main()
