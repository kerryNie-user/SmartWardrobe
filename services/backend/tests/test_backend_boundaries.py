import base64
from pathlib import Path

import pytest

from services.backend.http import ApiError, BytesResponse, JsonResponse, handle_api_request, serve_upload_asset


class FakeDatabase:
    def __init__(self):
        self.profile_user_id = None

    def get_profile(self, user_id):
        self.profile_user_id = user_id
        return {'id': user_id, 'displayName': 'Boundary User'}

    def get_media_file(self, media_id):
        return {
            'id': media_id,
            'mimeType': 'image/png',
            'contentBase64': base64.b64encode(b'profile-bytes').decode('utf-8')
        }


def test_handler_remains_http_adapter_only():
    handler_source = (Path(__file__).resolve().parents[1] / 'handler.py').read_text(encoding='utf-8')
    backend_root = Path(__file__).resolve().parents[1]

    assert 'handle_api_request' in handler_source
    assert 'serve_upload_asset' in handler_source
    assert 'serve_ai_image_asset' in handler_source
    assert 'def serve_upload' not in handler_source
    assert 'def serve_ai_images' not in handler_source
    assert 'database.get_profile' not in handler_source
    assert 'database.list_wardrobe' not in handler_source
    assert (backend_root / 'http' / 'routes.py').exists()
    assert (backend_root / 'http' / 'assets.py').exists()
    assert (backend_root / 'http' / 'contracts.py').exists()
    assert not (backend_root / 'api_routes.py').exists()
    assert not (backend_root / 'file_assets.py').exists()
    assert not (backend_root / 'http_contracts.py').exists()


def test_storage_remains_domain_facade_only():
    backend_root = Path(__file__).resolve().parents[1]
    storage_source = (backend_root / 'storage.py').read_text(encoding='utf-8')

    assert 'class JsonDatabase(' in storage_source
    assert 'StorageMixin' not in storage_source
    assert 'def get_profile' not in storage_source
    assert 'def list_wardrobe' not in storage_source
    assert (backend_root / 'storage_domains' / 'accounts.py').exists()
    assert (backend_root / 'storage_domains' / 'discovery.py').exists()
    assert (backend_root / 'storage_domains' / 'wardrobe.py').exists()


def test_api_routes_expose_json_response_contract():
    database = FakeDatabase()

    response = handle_api_request(
        database,
        'GET',
        '/api/profile',
        headers={'X-User-Id': 'user-contract'}
    )

    assert isinstance(response, JsonResponse)
    assert response.status == 200
    assert response.payload == {'profile': {'id': 'user-contract', 'displayName': 'Boundary User'}}
    assert database.profile_user_id == 'user-contract'


def test_api_routes_expose_bytes_response_contract():
    response = handle_api_request(FakeDatabase(), 'GET', '/api/media/files/media-1')

    assert isinstance(response, BytesResponse)
    assert response.status == 200
    assert response.content_type == 'image/png'
    assert response.body == b'profile-bytes'


def test_api_routes_report_unknown_route_through_contract_error():
    with pytest.raises(ApiError) as exc_info:
        handle_api_request(FakeDatabase(), 'GET', '/api/missing')

    assert exc_info.value.status == 404
    assert exc_info.value.code == 'NOT_FOUND'


def test_upload_asset_contract_and_traversal_guard(tmp_path):
    image_path = tmp_path / 'preview.png'
    image_path.write_bytes(b'image-bytes')

    response = serve_upload_asset('/uploads/preview.png', uploads_root=tmp_path)

    assert isinstance(response, BytesResponse)
    assert response.status == 200
    assert response.content_type == 'image/png'
    assert response.body == b'image-bytes'
    assert response.headers['Cache-Control'] == 'public, max-age=31536000'

    with pytest.raises(ApiError) as exc_info:
        serve_upload_asset('/uploads/../secret.txt', uploads_root=tmp_path)

    assert exc_info.value.status == 403
    assert exc_info.value.code == 'FORBIDDEN'
