from http.server import ThreadingHTTPServer
from pathlib import Path
import logging
from logging.handlers import RotatingFileHandler

from . import config
from .handler import create_handler
from .storage import JsonDatabase


def create_server(host=None, port=None, web_root=None, data_file=None):
    resolved_web_root = Path(web_root or config.WEB_ROOT).resolve()
    resolved_data_file = Path(data_file or config.DATA_FILE).resolve()
    db_file = resolved_data_file.with_name('smartwardrobe.db')
    database = JsonDatabase(db_file)
    handler_class = create_handler(database, resolved_web_root)
    return ThreadingHTTPServer((
        config.HOST if host is None else host,
        config.PORT if port is None else port
    ), handler_class)


def main():
    log_dir = Path(config.PROJECT_ROOT) / 'services' / 'backend' / 'output' / 'logs'
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / 'backend.log'

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

    has_file_handler = any(
        isinstance(handler, RotatingFileHandler) and getattr(handler, "baseFilename", None) == str(log_file)
        for handler in root_logger.handlers
    )
    if not has_file_handler:
        file_handler = RotatingFileHandler(str(log_file), maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8")
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

    server = create_server()
    host, port = server.server_address
    logging.info(f'Backend running at http://{host}:{port}')
    logging.info(f'Serving frontend from: {config.WEB_ROOT}')
    logging.info(f'Using sqlite database: {config.DATA_FILE.with_name("smartwardrobe.db")}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logging.info('Backend stopped.')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
