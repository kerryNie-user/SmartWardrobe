import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib import error, request

from services.backend.handler import create_handler
from services.backend.models import ContentPost
from services.backend.storage import JsonDatabase


class DiscoveryContentApiTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = JsonDatabase(Path(self.temp_dir.name) / 'db.json')
        web_root = Path(__file__).resolve().parents[3] / 'apps' / 'web'
        handler = create_handler(self.database, web_root)
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f'http://127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp_dir.cleanup()

    def request_json(self, path):
        req = request.Request(f'{self.base_url}{path}', method='GET')
        try:
            with request.urlopen(req) as response:
                return response.status, json.loads(response.read().decode('utf-8'))
        except error.HTTPError as exc:
            return exc.code, json.loads(exc.read().decode('utf-8'))

    def test_get_discovery_content_returns_default_en_us_shape(self):
        status, payload = self.request_json('/api/discovery/content')

        self.assertEqual(status, 200)
        self.assertIn('content', payload)
        self.assertEqual(payload['locale'], 'en-US')
        self.assertNotIn('tabs', payload['content'])
        self.assertNotIn('communityPosts', payload['content'])
        self.assertEqual(payload['content']['editorials'], [])
        self.assertIsNone(payload['content']['editorialTrendStrip'])
        self.assertEqual(payload['content']['searchPlaceholder']['editorials'], 'HOT SEARCHES · STYLE GUIDE · TRENDS')

    def test_get_discovery_content_supports_zh_cn_locale(self):
        status, payload = self.request_json('/api/discovery/content?locale=zh-CN')

        self.assertEqual(status, 200)
        self.assertEqual(payload['locale'], 'zh-CN')
        self.assertNotIn('tabs', payload['content'])
        self.assertNotIn('communityPosts', payload['content'])
        self.assertEqual(payload['content']['editorials'], [])
        self.assertIsNone(payload['content']['editorialTrendStrip'])
        self.assertEqual(payload['content']['searchPlaceholder']['editorials'], '热门搜索 · 穿搭指南 · 趋势解析')

    def test_get_discovery_content_uses_ai_posts_for_editorial_trend_strip(self):
        ContentPost.create(
            id='ai_post_contract_zh_0',
            author='SmartWardrobe AI Editor',
            time_str='2026-05-19 14:19:25',
            title='AI 编辑帖标题',
            description='AI 编辑帖摘要',
            body_json=[],
            ai_json={
                'schema': 'ct_ai_post_v1',
                'hero': {
                    'image_url': 'https://images.pexels.com/photos/7682071/pexels-photo-7682071.jpeg',
                    'caption': 'AI 编辑帖图片说明'
                },
                'paragraphs': []
            },
            tags_json=['editorial', 'ai-generated'],
            hero_image='https://images.pexels.com/photos/7682071/pexels-photo-7682071.jpeg',
            images_json=['https://images.pexels.com/photos/7682071/pexels-photo-7682071.jpeg'],
            stats_likes='0',
            stats_comments='0',
            locale='zh-CN',
            batch_id='contract_test'
        )

        status, payload = self.request_json('/api/discovery/content?locale=zh-CN')

        self.assertEqual(status, 200)
        content = payload['content']
        self.assertEqual(content['editorials'][0]['id'], 'ai_post_contract_zh_0')
        self.assertEqual(content['editorialTrendStrip']['items'][0]['title'], 'AI 编辑帖标题')
        self.assertNotEqual(content['editorialTrendStrip']['items'][0]['title'], '解构西装外套')


if __name__ == '__main__':
    unittest.main()
