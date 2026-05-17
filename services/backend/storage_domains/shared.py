import json
from pathlib import Path

DEBUG_USER = {
    'id': 'user-096fb511f3ff',
    'name': 'API Nova',
    'emailOrMobile': 'api-nova@example.com',
    'password': 'password123',
    'avatar': '/uploads/profile/elara-vance.jpg',
    'bio': 'Curating a digital archive of architectural silhouettes, neutral tailoring, and quietly radical texture studies.'
}

DEFAULT_PROFILE_AVATAR = '/uploads/profile/elara-vance.jpg'
LEGACY_PROFILE_AVATARS = {
    './images/profile/elara-vance.jpg',
    '/uploads/shared/elara-vance.jpg'
}

DEFAULT_SETTINGS = {
    'language': 'en-US',
    'display-mode': 'dark',
    'wardrobe-layout': 'grid',
    'temperature-unit': 'celsius',
    'public-profile': True,
    'outfit-reminders': True
}


def load_json_seed(name):
    file_path = Path(__file__).resolve().parents[1] / 'data' / name
    try:
        return json.loads(file_path.read_text(encoding='utf-8'))
    except Exception:
        return {}
