import json
import threading
import time
import uuid
from pathlib import Path


DEFAULT_DB = {
    'users': [],
    'profiles': {},
    'settings': {},
    'schedules': {},
    'favorites': {},
    'wardrobe': {}
}

DEBUG_USER = {
    'id': 'user-096fb511f3ff',
    'name': 'API Nova',
    'emailOrMobile': 'api-nova@example.com',
    'password': 'password123',
    'avatar': './images/profile/elara-vance.jpg',
    'bio': 'Curating a digital archive of architectural silhouettes, neutral tailoring, and quietly radical texture studies.'
}

DEFAULT_SETTINGS = {
    'language': 'en-US',
    'display-mode': 'dark',
    'wardrobe-layout': 'grid',
    'temperature-unit': 'celsius',
    'public-profile': True,
    'outfit-reminders': True
}


class JsonDatabase:
    def __init__(self, file_path):
        self.file_path = Path(file_path)
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._ensure()

    def _ensure(self):
        if not self.file_path.exists():
            self._write(self._with_debug_user(DEFAULT_DB))
            return

        try:
            raw = json.loads(self.file_path.read_text(encoding='utf-8'))
        except Exception:
            raw = {}

        next_data = {
            **DEFAULT_DB,
            **(raw if isinstance(raw, dict) else {})
        }
        self._write(self._with_debug_user(next_data))

    def _with_debug_user(self, data):
        next_data = {
            **DEFAULT_DB,
            **data
        }
        users = list(next_data.get('users', []))
        existing = next((user for user in users if user.get('emailOrMobile') == DEBUG_USER['emailOrMobile']), None)
        if existing:
            users = [DEBUG_USER if user.get('emailOrMobile') == DEBUG_USER['emailOrMobile'] else user for user in users]
        else:
            users.insert(0, { **DEBUG_USER })
        next_data['users'] = users
        next_data.setdefault('profiles', {})
        next_data['profiles'][DEBUG_USER['id']] = {
            'name': DEBUG_USER['name'],
            'bio': DEBUG_USER['bio'],
            'avatar': DEBUG_USER['avatar']
        }
        next_data.setdefault('settings', {})
        next_data['settings'][DEBUG_USER['id']] = {
            **DEFAULT_SETTINGS,
            **next_data['settings'].get(DEBUG_USER['id'], {})
        }
        return next_data

    def _read(self):
        with self._lock:
            return json.loads(self.file_path.read_text(encoding='utf-8'))

    def _write(self, data):
        with self._lock:
            self.file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        return data

    def _load(self):
        data = self._read()
        return {
            **DEFAULT_DB,
            **data
        }

    def create_user(self, payload):
        data = self._load()
        if any(user['emailOrMobile'] == payload['emailOrMobile'] for user in data['users']):
            raise ValueError('ACCOUNT_EXISTS')

        user_id = f"user-{uuid.uuid4().hex[:12]}"
        user = {
            'id': user_id,
            'name': payload.get('name') or 'Closet Twin',
            'emailOrMobile': payload['emailOrMobile'],
            'password': payload.get('password') or '',
            'avatar': './images/profile/elara-vance.jpg',
            'bio': ''
        }
        data['users'].insert(0, user)
        data['profiles'][user_id] = {
            'name': user['name'],
            'bio': user['bio'],
            'avatar': user['avatar']
        }
        data['settings'][user_id] = {
            **DEFAULT_SETTINGS
        }
        self._write(data)
        return self._public_user(user)

    def login_user(self, payload):
        data = self._load()
        user = next((item for item in data['users'] if item['emailOrMobile'] == payload.get('emailOrMobile')), None)
        if not user:
            raise LookupError('ACCOUNT_NOT_FOUND')
        if user.get('password') and user['password'] != payload.get('password'):
            raise PermissionError('INVALID_PASSWORD')
        return self._public_user(user)

    def _public_user(self, user):
        return {
            'id': user['id'],
            'name': user.get('name', 'Closet Twin'),
            'emailOrMobile': user.get('emailOrMobile', ''),
            'avatar': user.get('avatar', './images/profile/elara-vance.jpg'),
            'bio': user.get('bio', '')
        }

    def get_profile(self, user_id):
        data = self._load()
        if user_id in data['profiles']:
            return data['profiles'][user_id]
        user = next((item for item in data['users'] if item['id'] == user_id), None)
        if user:
            return {
                'name': user.get('name', 'Closet Twin'),
                'bio': user.get('bio', ''),
                'avatar': user.get('avatar', './images/profile/elara-vance.jpg')
            }
        return {
            'name': 'Closet Twin',
            'bio': '',
            'avatar': './images/profile/elara-vance.jpg'
        }

    def save_profile(self, user_id, payload):
        data = self._load()
        next_profile = {
            'name': payload.get('name') or 'Closet Twin',
            'bio': payload.get('bio') or '',
            'avatar': payload.get('avatar') or './images/profile/elara-vance.jpg'
        }
        data['profiles'][user_id] = next_profile
        data['users'] = [
            {
                **user,
                'name': next_profile['name'],
                'bio': next_profile['bio'],
                'avatar': next_profile['avatar']
            } if user['id'] == user_id else user
            for user in data['users']
        ]
        self._write(data)
        return next_profile

    def get_settings(self, user_id):
        data = self._load()
        return {
            **DEFAULT_SETTINGS,
            **data['settings'].get(user_id, {})
        }

    def save_settings(self, user_id, payload):
        data = self._load()
        next_settings = {
            **DEFAULT_SETTINGS,
            **data['settings'].get(user_id, {}),
            **payload
        }
        data['settings'][user_id] = next_settings
        self._write(data)
        return next_settings

    def list_schedules(self, user_id):
        data = self._load()
        return data['schedules'].get(user_id, [])

    def create_schedule(self, user_id, payload):
        data = self._load()
        item = {
            'id': payload.get('id') or f"schedule-{uuid.uuid4().hex[:12]}",
            'tab': payload.get('tab', 'upcoming'),
            'day': payload.get('day', ''),
            'label': payload.get('label', ''),
            'time': payload.get('time', ''),
            'title': payload.get('title', ''),
            'location': payload.get('location', ''),
            'tags': payload.get('tags') or [],
            'reminderEnabled': bool(payload.get('reminderEnabled')),
            'version': 1,
            'updatedAt': int(time.time() * 1000)
        }
        items = data['schedules'].setdefault(user_id, [])
        items.insert(0, item)
        self._write(data)
        return item

    def update_schedule(self, user_id, item_id, payload):
        data = self._load()
        items = data['schedules'].setdefault(user_id, [])
        for index, item in enumerate(items):
            if item['id'] == item_id:
                expected_version = payload.get('version')
                current_version = int(item.get('version', 1))
                if expected_version is not None and int(expected_version) != current_version:
                    raise ValueError('SCHEDULE_CONFLICT')
                items[index] = {
                    **item,
                    **payload,
                    'id': item_id,
                    'version': current_version + 1,
                    'updatedAt': int(time.time() * 1000)
                }
                self._write(data)
                return items[index]
        raise LookupError('SCHEDULE_NOT_FOUND')

    def delete_schedule(self, user_id, item_id):
        data = self._load()
        items = data['schedules'].setdefault(user_id, [])
        next_items = [item for item in items if item['id'] != item_id]
        data['schedules'][user_id] = next_items
        self._write(data)
        return {'deleted': True}

    def get_favorites(self, user_id):
        data = self._load()
        favorites = data['favorites'].get(user_id, {})
        return {
            'looks': favorites.get('looks', []),
            'posts': favorites.get('posts', [])
        }

    def add_favorite(self, user_id, favorite_type, item):
        data = self._load()
        favorites = data['favorites'].setdefault(user_id, {'looks': [], 'posts': []})
        normalized_type = 'posts' if favorite_type == 'posts' else 'looks'
        items = favorites.setdefault(normalized_type, [])
        items[:] = [entry for entry in items if entry.get('id') != item.get('id')]
        items.insert(0, {
            'id': item.get('id'),
            'title': item.get('title', ''),
            'subtitle': item.get('subtitle', ''),
            'image': item.get('image', ''),
            'href': item.get('href', ''),
            'savedAt': item.get('savedAt') or 0
        })
        self._write(data)
        return self.get_favorites(user_id)

    def remove_favorite(self, user_id, favorite_type, item_id):
        data = self._load()
        favorites = data['favorites'].setdefault(user_id, {'looks': [], 'posts': []})
        normalized_type = 'posts' if favorite_type == 'posts' else 'looks'
        favorites[normalized_type] = [item for item in favorites.get(normalized_type, []) if item.get('id') != item_id]
        self._write(data)
        return self.get_favorites(user_id)

    def list_wardrobe(self, user_id):
        data = self._load()
        return data['wardrobe'].get(user_id, [])

    def create_wardrobe_item(self, user_id, payload):
        data = self._load()
        item = {
            'id': payload.get('id') or f"wardrobe-{uuid.uuid4().hex[:12]}",
            'title': payload.get('title', ''),
            'category': payload.get('category', ''),
            'size': payload.get('size', ''),
            'color': payload.get('color', ''),
            'material': payload.get('material', ''),
            'image': payload.get('image', ''),
            'filter': payload.get('filter', ''),
            'favorite': bool(payload.get('favorite'))
        }
        items = data['wardrobe'].setdefault(user_id, [])
        items.insert(0, item)
        self._write(data)
        return item

    def update_wardrobe_item(self, user_id, item_id, payload):
        data = self._load()
        items = data['wardrobe'].setdefault(user_id, [])
        for index, item in enumerate(items):
            if item['id'] == item_id:
                items[index] = {
                    **item,
                    **payload,
                    'id': item_id
                }
                self._write(data)
                return items[index]
        raise LookupError('WARDROBE_NOT_FOUND')

    def delete_wardrobe_item(self, user_id, item_id):
        data = self._load()
        items = data['wardrobe'].setdefault(user_id, [])
        data['wardrobe'][user_id] = [item for item in items if item['id'] != item_id]
        self._write(data)
        return {'deleted': True}
