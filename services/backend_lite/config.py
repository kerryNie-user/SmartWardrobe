import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
HOST = os.environ.get('LITE_BACKEND_HOST', '127.0.0.1')
PORT = int(os.environ.get('LITE_BACKEND_PORT', '8140'))
WEB_ROOT = Path(os.environ.get('LITE_BACKEND_WEB_ROOT', str(PROJECT_ROOT / 'apps' / 'web-new'))).resolve()
DATA_FILE = Path(os.environ.get('LITE_BACKEND_DATA_FILE', str(PROJECT_ROOT / 'services' / 'backend_lite' / 'data' / 'db.json'))).resolve()
