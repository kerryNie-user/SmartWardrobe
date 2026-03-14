import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("PORT", "8080"))
WEBAPP_DIR = os.path.join(PROJECT_ROOT, "App", "WebApp")
MAX_BODY_BYTES = int(os.environ.get("MAX_BODY_BYTES", "1048576"))

