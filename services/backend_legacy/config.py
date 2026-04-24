import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PORT = int(os.environ.get("PORT", "8080"))


def resolve_webapp_dir():
    configured = os.environ.get("WEBAPP_DIR", "").strip()
    if not configured:
        return os.path.join(PROJECT_ROOT, "apps", "web-legacy")
    if os.path.isabs(configured):
        return configured
    return os.path.join(PROJECT_ROOT, configured)


WEBAPP_DIR = resolve_webapp_dir()
MAX_BODY_BYTES = int(os.environ.get("MAX_BODY_BYTES", "1048576"))
