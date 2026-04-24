from http.server import ThreadingHTTPServer
from pathlib import Path

from . import config
from .handler import create_handler
from .storage import JsonDatabase


def create_server(host=None, port=None, web_root=None, data_file=None):
    resolved_web_root = Path(web_root or config.WEB_ROOT).resolve()
    resolved_data_file = Path(data_file or config.DATA_FILE).resolve()
    # Use smartwardrobe_lite.db for the sqlite database
    db_file = resolved_data_file.with_name('smartwardrobe_lite.db')
    database = JsonDatabase(db_file)
    handler_class = create_handler(database, resolved_web_root)
    return ThreadingHTTPServer((
        config.HOST if host is None else host,
        config.PORT if port is None else port
    ), handler_class)


def main():
    server = create_server()
    host, port = server.server_address
    print(f'Lite backend running at http://{host}:{port}')
    print(f'Serving frontend from: {config.WEB_ROOT}')
    print(f'Using sqlite database: {config.DATA_FILE.with_name("smartwardrobe_lite.db")}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nLite backend stopped.')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
