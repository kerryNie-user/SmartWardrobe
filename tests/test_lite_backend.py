import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib import error, request


class LiteBackendTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from services.backend_lite.server import create_server

        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.data_file = Path(cls.temp_dir.name) / 'db.json'
        cls.server = create_server(host='127.0.0.1', port=0, web_root=Path('/Users/kerry-mac/SmartWardrobe/apps/web-new'), data_file=cls.data_file)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        cls.temp_dir.cleanup()

    def api(self, path, method='GET', payload=None, headers=None):
        url = f'http://127.0.0.1:{self.port}{path}'
        body = None if payload is None else json.dumps(payload).encode('utf-8')
        req = request.Request(url, data=body, method=method)
        req.add_header('Content-Type', 'application/json')
        for key, value in (headers or {}).items():
            req.add_header(key, value)
        try:
            with request.urlopen(req, timeout=5) as response:
                content = response.read().decode('utf-8')
                return response.status, json.loads(content) if content else {}
        except error.HTTPError as exc:
            content = exc.read().decode('utf-8')
            return exc.code, json.loads(content) if content else {}

    def test_health_endpoint(self):
        status, payload = self.api('/api/health')
        self.assertEqual(status, 200)
        self.assertEqual(payload['status'], 'ok')

    def test_empty_database_is_seeded_with_debug_account(self):
        from services.backend_lite.storage import JsonDatabase

        db_file = Path(self.temp_dir.name) / 'seeded-db.json'
        database = JsonDatabase(db_file)
        seeded = database.login_user({
            'emailOrMobile': 'api-nova@example.com',
            'password': 'password123'
        })
        self.assertEqual(seeded['name'], 'API Nova')

    def test_auth_profile_settings_schedule_favorites_and_wardrobe_flow(self):
        status, register_payload = self.api('/api/auth/register', method='POST', payload={
            'name': 'Nova',
            'emailOrMobile': 'nova@example.com',
            'password': 'password123'
        })
        self.assertEqual(status, 201)
        user_id = register_payload['user']['id']

        status, login_payload = self.api('/api/auth/login', method='POST', payload={
            'emailOrMobile': 'nova@example.com',
            'password': 'password123'
        })
        self.assertEqual(status, 200)
        self.assertEqual(login_payload['user']['id'], user_id)

        status, profile_payload = self.api('/api/profile', method='POST', payload={
            'userId': user_id,
            'name': 'Nova Lane',
            'bio': 'Frontend first',
            'avatar': './images/profile/elara-vance.jpg'
        })
        self.assertEqual(status, 200)
        self.assertEqual(profile_payload['profile']['name'], 'Nova Lane')

        status, settings_payload = self.api('/api/settings', method='POST', payload={
            'userId': user_id,
            'language': 'zh-CN',
            'display-mode': 'light',
            'wardrobe-layout': 'list',
            'temperature-unit': 'fahrenheit',
            'public-profile': False,
            'outfit-reminders': True
        })
        self.assertEqual(status, 200)
        self.assertEqual(settings_payload['settings']['language'], 'zh-CN')

        status, schedule_payload = self.api('/api/schedules', method='POST', payload={
            'userId': user_id,
            'tab': 'upcoming',
            'day': '31',
            'label': 'Oct / Thu',
            'time': '09:30 AM — 11:00 AM',
            'title': 'Studio Breakfast',
            'location': 'Le Marais',
            'tags': ['Wool Coat'],
            'reminderEnabled': True
        })
        self.assertEqual(status, 201)
        schedule_id = schedule_payload['item']['id']

        status, _ = self.api(f'/api/schedules/{schedule_id}', method='PUT', payload={
            'userId': user_id,
            'title': 'Studio Breakfast Updated'
        })
        self.assertEqual(status, 200)

        status, favorites_payload = self.api('/api/favorites', method='POST', payload={
            'userId': user_id,
            'type': 'looks',
            'item': {
                'id': 'urban-commute',
                'title': 'Urban Commute'
            }
        })
        self.assertEqual(status, 200)
        self.assertEqual(len(favorites_payload['favorites']['looks']), 1)

        status, wardrobe_payload = self.api('/api/wardrobe', method='POST', payload={
            'userId': user_id,
            'item': {
                'title': 'Wool Trench',
                'category': 'Outerwear',
                'size': 'M',
                'color': 'Oatmeal',
                'material': 'Wool Blend',
                'filter': 'outerwear',
                'favorite': True
            }
        })
        self.assertEqual(status, 201)
        wardrobe_id = wardrobe_payload['item']['id']

        status, _ = self.api(f'/api/wardrobe/{wardrobe_id}', method='PUT', payload={
            'userId': user_id,
            'item': {
                'title': 'Wool Trench Updated'
            }
        })
        self.assertEqual(status, 200)

        status, schedules_payload = self.api(f'/api/schedules?userId={user_id}')
        self.assertEqual(status, 200)
        self.assertEqual(schedules_payload['items'][0]['title'], 'Studio Breakfast Updated')

        status, favorites_payload = self.api(f'/api/favorites?userId={user_id}')
        self.assertEqual(status, 200)
        self.assertEqual(favorites_payload['favorites']['looks'][0]['id'], 'urban-commute')

        status, wardrobe_payload = self.api(f'/api/wardrobe?userId={user_id}')
        self.assertEqual(status, 200)
        self.assertEqual(wardrobe_payload['items'][0]['title'], 'Wool Trench Updated')

        status, _ = self.api(f'/api/favorites/looks/urban-commute?userId={user_id}', method='DELETE')
        self.assertEqual(status, 200)

        status, _ = self.api(f'/api/schedules/{schedule_id}?userId={user_id}', method='DELETE')
        self.assertEqual(status, 200)

        status, _ = self.api(f'/api/wardrobe/{wardrobe_id}?userId={user_id}', method='DELETE')
        self.assertEqual(status, 200)

    def test_serves_new_static_files(self):
        with request.urlopen(f'http://127.0.0.1:{self.port}/index.html', timeout=5) as response:
            html = response.read().decode('utf-8')
        self.assertIn('CLOSETTWIN', html)


if __name__ == '__main__':
    unittest.main()
