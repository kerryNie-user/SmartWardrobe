import base64
from urllib.parse import parse_qs, urlparse

from .contracts import ApiError, BytesResponse, JsonResponse


def _ensure_dict(value, code: str, message: str, details: dict):
    if not isinstance(value, dict):
        raise ApiError(500, code, message, details)
    return value


def _ensure_list(value, code: str, message: str, details: dict):
    if not isinstance(value, list):
        raise ApiError(500, code, message, details)
    return value


def _resolve_user_id(path: str, headers: dict | None = None, payload: dict | None = None) -> str:
    headers = headers or {}
    payload = payload or {}
    query = parse_qs(urlparse(path).query)
    return (
        headers.get('X-User-Id')
        or query.get('userId', [None])[0]
        or payload.get('userId')
        or 'guest'
    )


def handle_api_request(database, method: str, request_path: str, payload: dict | None = None, headers: dict | None = None):
    parsed = urlparse(request_path)
    path = parsed.path
    payload = payload or {}

    if method == 'GET' and path == '/api/health':
        return JsonResponse(200, {'status': 'ok'})

    if method == 'POST' and path == '/api/auth/register':
        user = _ensure_dict(database.create_user(payload), 'AUTH_CONTRACT_MISSING', 'Auth contract missing', {'path': 'user'})
        return JsonResponse(201, {'user': user})

    if method == 'POST' and path == '/api/auth/login':
        user = _ensure_dict(database.login_user(payload), 'AUTH_CONTRACT_MISSING', 'Auth contract missing', {'path': 'user'})
        return JsonResponse(200, {'user': user})

    user_id = _resolve_user_id(request_path, headers, payload)

    if method == 'GET' and path == '/api/profile':
        profile = _ensure_dict(database.get_profile(user_id), 'PROFILE_CONTRACT_MISSING', 'Profile contract missing', {'path': 'profile'})
        return JsonResponse(200, {'profile': profile})
    if method == 'POST' and path == '/api/profile':
        profile = _ensure_dict(database.save_profile(user_id, payload), 'PROFILE_CONTRACT_MISSING', 'Profile contract missing', {'path': 'profile'})
        return JsonResponse(200, {'profile': profile})

    if method == 'GET' and path == '/api/settings':
        settings = _ensure_dict(database.get_settings(user_id), 'SETTINGS_CONTRACT_MISSING', 'Settings contract missing', {'path': 'settings'})
        return JsonResponse(200, {'settings': settings})
    if method == 'POST' and path == '/api/settings':
        settings = _ensure_dict(database.save_settings(user_id, payload), 'SETTINGS_CONTRACT_MISSING', 'Settings contract missing', {'path': 'settings'})
        return JsonResponse(200, {'settings': settings})

    if method == 'GET' and path.startswith('/api/schedules/content'):
        locale = parse_qs(parsed.query).get('locale', ['en-US'])[0]
        content = _ensure_dict(database.get_schedule_content(user_id, locale), 'SCHEDULE_CONTRACT_MISSING', 'Schedule content contract missing', {'required': ['tabs', 'views']})
        if 'tabs' not in content or 'views' not in content:
            raise ApiError(500, 'SCHEDULE_CONTRACT_MISSING', 'Schedule content contract missing', {'required': ['tabs', 'views']})
        return JsonResponse(200, content)

    if method == 'GET' and path == '/api/schedules':
        items = _ensure_list(database.list_schedules(user_id), 'SCHEDULES_CONTRACT_MISSING', 'Schedules contract missing', {'path': 'items'})
        return JsonResponse(200, {'items': items})
    if method == 'POST' and path == '/api/schedules':
        item = _ensure_dict(database.create_schedule(user_id, payload), 'SCHEDULES_CONTRACT_MISSING', 'Schedules contract missing', {'path': 'item'})
        return JsonResponse(201, {'item': item})
    if path.startswith('/api/schedules/'):
        item_id = path.split('/')[-1]
        if method == 'PUT':
            item = _ensure_dict(database.update_schedule(user_id, item_id, payload), 'SCHEDULES_CONTRACT_MISSING', 'Schedules contract missing', {'path': 'item'})
            return JsonResponse(200, {'item': item})
        if method == 'DELETE':
            result = _ensure_dict(database.delete_schedule(user_id, item_id), 'SCHEDULES_CONTRACT_MISSING', 'Schedules contract missing', {'path': 'deleted'})
            return JsonResponse(200, result)

    if method == 'GET' and path == '/api/favorites':
        favorites = _ensure_dict(database.get_favorites(user_id), 'FAVORITES_CONTRACT_MISSING', 'Favorites contract missing', {'path': 'favorites'})
        return JsonResponse(200, {'favorites': favorites})
    if method == 'POST' and path == '/api/favorites':
        favorite_type = payload.get('type', 'looks')
        item = payload.get('item') or {}
        favorites = _ensure_dict(database.add_favorite(user_id, favorite_type, item), 'FAVORITES_CONTRACT_MISSING', 'Favorites contract missing', {'path': 'favorites'})
        return JsonResponse(200, {'favorites': favorites})
    if method == 'DELETE' and path.startswith('/api/favorites/'):
        _, _, _, favorite_type, item_id = path.split('/', 4)
        favorites = _ensure_dict(database.remove_favorite(user_id, favorite_type, item_id), 'FAVORITES_CONTRACT_MISSING', 'Favorites contract missing', {'path': 'favorites'})
        return JsonResponse(200, {'favorites': favorites})

    if method == 'GET' and path == '/api/discovery/social':
        return JsonResponse(200, {'social': database.get_discovery_social(user_id)})
    if method == 'POST' and path.startswith('/api/discovery/social/posts/') and path.endswith('/like'):
        post_id = path.split('/')[5]
        return JsonResponse(200, {'social': database.set_discovery_post_like(user_id, post_id, payload.get('liked'))})
    if method == 'POST' and path.startswith('/api/discovery/social/authors/') and path.endswith('/follow'):
        author_id = path.split('/')[5]
        return JsonResponse(200, {'social': database.set_discovery_author_follow(user_id, author_id, payload.get('followed'))})

    if method == 'GET' and path == '/api/discovery/content':
        locale = parse_qs(parsed.query).get('locale', ['en-US'])[0]
        result = _ensure_dict(database.get_discovery_content(locale), 'DISCOVERY_CONTRACT_MISSING', 'Discovery content contract missing', {'path': 'content'})
        content = result.get('content')
        if not isinstance(content, dict) or 'editorials' not in content:
            raise ApiError(500, 'DISCOVERY_CONTRACT_MISSING', 'Discovery content contract missing', {'path': 'content.editorials'})
        return JsonResponse(200, result)

    if method == 'POST' and path == '/api/admin/regenerate_editorials':
        locale = str(payload.get('locale', 'all') or 'all')
        limit = int(payload.get('limit') or 0)
        dry_run = bool(payload.get('dryRun', False))
        update_time = bool(payload.get('updateTime', False))
        batch_id = payload.get('batchId')
        skip_if_ai = bool(payload.get('skipIfAi', False))
        report = database.regenerate_editorials(locale=locale, limit=limit, dry_run=dry_run, update_time=update_time, batch_id=batch_id, skip_if_ai=skip_if_ai)
        return JsonResponse(200, {'report': report})

    if method == 'POST' and path == '/api/admin/cleanup_editorials':
        locale = str(payload.get('locale', 'all') or 'all')
        keep_batch_id = payload.get('keepBatchId')
        dry_run = bool(payload.get('dryRun', False))
        report = database.cleanup_editorials_keep_batch(locale=locale, keep_batch_id=keep_batch_id, dry_run=dry_run)
        return JsonResponse(200, {'report': report})

    if method == 'GET' and path == '/api/home/content':
        locale = parse_qs(parsed.query).get('locale', ['en-US'])[0]
        result = _ensure_dict(database.get_home_content(locale), 'HOME_CONTRACT_MISSING', 'Home content contract missing', {'path': 'content'})
        content = result.get('content')
        if not isinstance(content, dict) or 'tabs' not in content:
            raise ApiError(500, 'HOME_CONTRACT_MISSING', 'Home content contract missing', {'path': 'content.tabs'})
        return JsonResponse(200, result)

    if method == 'GET' and path == '/api/discovery/comments':
        return JsonResponse(200, {'comments': database.get_discovery_comments(user_id)})
    if method == 'POST' and path.startswith('/api/discovery/comments/posts/'):
        post_id = path.split('/')[-1]
        return JsonResponse(201, {'comment': database.create_discovery_comment(user_id, post_id, payload)})

    if method == 'POST' and path == '/api/media/prepare':
        upload = _ensure_dict(database.prepare_media_upload(user_id, payload), 'MEDIA_CONTRACT_MISSING', 'Media upload contract missing', {'path': 'upload'})
        if not upload.get('token') or not upload.get('remoteUrl'):
            raise ApiError(500, 'MEDIA_CONTRACT_MISSING', 'Media upload contract missing', {'path': 'upload'})
        return JsonResponse(201, {'upload': upload})
    if method == 'POST' and path.startswith('/api/media/upload/'):
        token = path.split('/')[-1]
        media = _ensure_dict(database.upload_media_content(user_id, token, payload), 'MEDIA_CONTRACT_MISSING', 'Media contract missing', {'path': 'media'})
        if not media.get('remoteUrl'):
            raise ApiError(500, 'MEDIA_CONTRACT_MISSING', 'Media contract missing', {'path': 'media'})
        return JsonResponse(201, {'media': media})
    if method == 'GET' and path.startswith('/api/media/files/'):
        media_id = path.split('/')[-1]
        media_file = _ensure_dict(database.get_media_file(media_id), 'MEDIA_CONTRACT_MISSING', 'Media file contract missing', {'path': 'media'})
        if 'mimeType' not in media_file or 'contentBase64' not in media_file:
            raise ApiError(500, 'MEDIA_CONTRACT_MISSING', 'Media file contract missing', {'path': 'media'})
        return BytesResponse(
            200,
            media_file['mimeType'],
            base64.b64decode(media_file['contentBase64'])
        )

    if method == 'GET' and path == '/api/wardrobe':
        items = _ensure_list(database.list_wardrobe(user_id), 'WARDROBE_CONTRACT_MISSING', 'Wardrobe contract missing', {'path': 'items'})
        return JsonResponse(200, {'items': items})
    if method == 'POST' and path == '/api/wardrobe':
        item = payload.get('item') or payload
        created = _ensure_dict(database.create_wardrobe_item(user_id, item), 'WARDROBE_CONTRACT_MISSING', 'Wardrobe contract missing', {'path': 'item'})
        return JsonResponse(201, {'item': created})
    if path.startswith('/api/wardrobe/'):
        item_id = path.split('/')[-1]
        if method == 'PUT':
            item = payload.get('item') or payload
            updated = _ensure_dict(database.update_wardrobe_item(user_id, item_id, item), 'WARDROBE_CONTRACT_MISSING', 'Wardrobe contract missing', {'path': 'item'})
            return JsonResponse(200, {'item': updated})
        if method == 'DELETE':
            result = _ensure_dict(database.delete_wardrobe_item(user_id, item_id), 'WARDROBE_CONTRACT_MISSING', 'Wardrobe contract missing', {'path': 'deleted'})
            return JsonResponse(200, result)

    raise ApiError(404, 'NOT_FOUND', 'Route not found', {'path': path, 'method': method})
