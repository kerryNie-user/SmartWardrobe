import mimetypes
from pathlib import Path

from .contracts import ApiError, BytesResponse


def _forbid_traversal(path: str):
    if '..' in path or path.startswith('/'):
        raise ApiError(403, 'FORBIDDEN', 'Forbidden')


def serve_upload_asset(request_path: str, uploads_root: Path | None = None) -> BytesResponse:
    file_path = request_path[9:]
    _forbid_traversal(file_path)

    root = uploads_root or (Path(__file__).resolve().parents[1] / 'uploads')
    full_path = root / file_path
    if not full_path.exists() or not full_path.is_file():
        raise ApiError(404, 'NOT_FOUND', 'File not found')

    mime_type, _ = mimetypes.guess_type(str(full_path))
    return BytesResponse(
        status=200,
        content_type=mime_type or 'application/octet-stream',
        body=full_path.read_bytes(),
        headers={
            'Cache-Control': 'public, max-age=31536000'
        }
    )


def serve_ai_image_asset(request_path: str, project_root: Path | None = None) -> BytesResponse:
    if '..' in request_path:
        raise ApiError(403, 'FORBIDDEN', 'Forbidden')

    filename = request_path.split('/')[-1]
    root = project_root or Path(__file__).resolve().parents[3]
    image_path = root / 'services' / 'ai_blogger' / 'output' / 'images' / filename
    if not image_path.exists() or not image_path.is_file():
        raise ApiError(404, 'NOT_FOUND', 'Not found')

    content_type = 'image/jpeg'
    suffix = image_path.suffix.lower()
    if suffix == '.png':
        content_type = 'image/png'
    elif suffix == '.webp':
        content_type = 'image/webp'

    return BytesResponse(
        status=200,
        content_type=content_type,
        body=image_path.read_bytes()
    )
