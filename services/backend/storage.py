import json
import threading
import time
import uuid
from copy import deepcopy
from pathlib import Path

from peewee import DoesNotExist
from .models import (
    User, UserSetting, WardrobeItem, ScheduleItem,
    Favorite, SocialEngagement, DiscoveryComment,
    MediaRecord, MediaUpload, ContentPost, ContentStory, TrendStripItem, RecommendLook
)
from .database import db

def load_json_seed(name):
    file_path = Path(__file__).resolve().parent / 'data' / name
    try:
        return json.loads(file_path.read_text(encoding='utf-8'))
    except Exception:
        return {}

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
    def __init__(self, file_path=None):
        if file_path is not None:
            db.init(file_path)
            db.connect(reuse_if_open=True)
            db.create_tables([
                User, UserSetting, WardrobeItem, ScheduleItem,
                Favorite, SocialEngagement, DiscoveryComment,
                MediaRecord, MediaUpload, ContentPost, ContentStory, TrendStripItem, RecommendLook
            ])
            self._ensure_contentpost_ai_column()
            self._ensure_contentpost_batch_column()
            self._ensure_scheduleitem_image_column()
        self._ensure_debug_user()
        
    def _ensure_contentpost_ai_column(self):
        try:
            cursor = db.execute_sql("PRAGMA table_info(contentpost);")
            columns = [row[1] for row in cursor.fetchall()]
            if 'ai_json' in columns:
                return
            db.execute_sql("ALTER TABLE contentpost ADD COLUMN ai_json TEXT;")
        except Exception:
            return

    def _ensure_contentpost_batch_column(self):
        try:
            cursor = db.execute_sql("PRAGMA table_info(contentpost);")
            columns = [row[1] for row in cursor.fetchall()]
            if 'batch_id' in columns:
                try:
                    db.execute_sql('CREATE INDEX IF NOT EXISTS "contentpost_batch_id" ON "contentpost" ("batch_id");')
                    db.execute_sql('REINDEX "contentpost_batch_id";')
                except Exception:
                    return
                return
            db.execute_sql("ALTER TABLE contentpost ADD COLUMN batch_id TEXT;")
            db.execute_sql('CREATE INDEX IF NOT EXISTS "contentpost_batch_id" ON "contentpost" ("batch_id");')
            db.execute_sql('REINDEX "contentpost_batch_id";')
        except Exception:
            return

    def _ensure_scheduleitem_image_column(self):
        try:
            cursor = db.execute_sql("PRAGMA table_info(scheduleitem);")
            columns = [row[1] for row in cursor.fetchall()]
            if 'image' in columns:
                return
            db.execute_sql('ALTER TABLE scheduleitem ADD COLUMN image VARCHAR(256);')
        except Exception:
            return

    def _ensure_debug_user(self):
        try:
            user = User.get(User.emailOrMobile == DEBUG_USER['emailOrMobile'])
        except DoesNotExist:
            user = User.create(
                id=DEBUG_USER['id'],
                name=DEBUG_USER['name'],
                emailOrMobile=DEBUG_USER['emailOrMobile'],
                password=DEBUG_USER['password'],
                avatar=DEBUG_USER['avatar'],
                bio=DEBUG_USER['bio']
            )
        try:
            UserSetting.get(UserSetting.user_id == user.id)
        except DoesNotExist:
            UserSetting.create(user_id=user.id, settings_json=DEFAULT_SETTINGS)

    def _normalize_ai_payload(self, ai_json, post):
        if not ai_json:
            return None
        try:
            from services.ai_blogger.protocol.normalize_ai_post import normalize_ai_post_v1
            title = ai_json.get('title') or post.title
            hero_url = (ai_json.get('hero') or {}).get('image_url') or post.hero_image
            tags = ai_json.get('tags') or post.tags_json or []
            locale = post.locale
            paragraphs = ai_json.get('paragraphs') or []
            return normalize_ai_post_v1(
                title=title,
                locale=locale,
                paragraphs=paragraphs,
                hero_image_url=hero_url,
                tags=tags
            )
        except Exception:
            return ai_json

    def _pick_fallback_ai_image(self, post_id: str) -> str:
        try:
            from pathlib import Path
            project_root = Path(__file__).resolve().parents[2]
            image_dir = project_root / 'services' / 'ai_blogger' / 'output' / 'images'
            if not image_dir.exists():
                return ''
            files = sorted([
                p.name
                for p in image_dir.iterdir()
                if p.is_file() and p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}
            ])
            if not files:
                return ''
            idx = abs(hash(post_id)) % len(files)
            return f"/ai-images/{files[idx]}"
        except Exception:
            return ''

    def _resolve_post_hero(self, post_data: dict) -> str:
        ai = post_data.get('ai')
        schema = str(ai.get('schema') or '').strip() if isinstance(ai, dict) else ''
        allow_ai_image_alias = schema == 'ct_ai_post_v1'
        hero = str(post_data.get('heroImage') or '').strip()
        if hero:
            if allow_ai_image_alias and hero.startswith('images/'):
                return f"/ai-images/{hero.split('/')[-1]}"
            return hero
        images = post_data.get('images') or []
        if images:
            first = str(images[0] or '').strip()
            if allow_ai_image_alias and first.startswith('images/'):
                return f"/ai-images/{first.split('/')[-1]}"
            return first
        return self._pick_fallback_ai_image(str(post_data.get('id') or ''))

    def regenerate_editorials(self, *, locale: str = 'all', limit: int = 0, dry_run: bool = False, update_time: bool = False, batch_id: str | None = None, skip_if_ai: bool = False):
        from datetime import datetime
        from services.ai_blogger.chain_runner import PromptChainRunner
        from services.ai_blogger.run_pipeline import ImageTracker
        from services.ai_blogger.protocol.normalize_ai_post import normalize_ai_post_v1

        def normalize_locale(value: str) -> str:
            return 'zh-CN' if value == 'zh-CN' else 'en-US'

        def unique_preserve(items):
            seen = set()
            out = []
            for it in items or []:
                s = str(it or '').strip()
                if not s or s in seen:
                    continue
                seen.add(s)
                out.append(s)
            return out

        def pick_description(ai_json):
            for p in ai_json.get('paragraphs', []) or []:
                t = str(p.get('text') or '').strip()
                if t:
                    return (t[:140].rstrip() + '...') if len(t) > 140 else t
            title = str(ai_json.get('title') or '').strip()
            return (title[:140].rstrip() + '...') if len(title) > 140 else title

        locales = ['zh-CN', 'en-US'] if locale == 'all' else [normalize_locale(locale)]
        posts = ContentPost.select().where(ContentPost.locale.in_(locales))
        editorials = [p for p in posts if 'editorial' in (p.tags_json or [])]
        if limit and int(limit) > 0:
            editorials = editorials[: int(limit)]

        resolved_batch_id = str(batch_id or datetime.now().strftime('%Y%m%d%H%M%S')).strip()
        report = {
            'locale': locale,
            'limit': int(limit or 0),
            'dryRun': bool(dry_run),
            'updateTime': bool(update_time),
            'batchId': resolved_batch_id,
            'total': len(editorials),
            'items': []
        }

        for p in editorials:
            started = int(time.time() * 1000)
            item = {'id': p.id, 'locale': p.locale, 'title': p.title, 'status': 'pending', 'imageCount': 0, 'error': None}
            try:
                if skip_if_ai and p.ai_json and isinstance(p.ai_json, dict):
                    schema = str(p.ai_json.get('schema') or '').strip()
                    hero = str(p.hero_image or '').strip()
                    if schema == 'ct_ai_post_v1' and hero:
                        if dry_run:
                            item['status'] = 'skipped'
                        else:
                            with db.atomic():
                                p.batch_id = resolved_batch_id
                                if update_time:
                                    p.time_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                p.save()
                            item['status'] = 'success'
                        item['imageCount'] = len(p.images_json or [])
                        report['items'].append({**item, 'elapsedMs': int(time.time() * 1000) - started})
                        continue

                runner = PromptChainRunner(profile_name='editorial_styling', locale=p.locale)
                chain = runner.run_chain(raw_topic=p.title, seed_material=None)
                raw_paragraphs = chain.get('paragraphs', []) or []

                from pathlib import Path
                project_root = Path(__file__).resolve().parents[2]
                images_dir = project_root / 'services' / 'ai_blogger' / 'output' / 'images'
                images_dir.mkdir(parents=True, exist_ok=True)
                tracker = ImageTracker(images_dir=str(images_dir), max_images_total=50, download_images=True)
                paragraph_images = {}
                paragraph_alts = {}
                for p_idx, para in enumerate(raw_paragraphs):
                    layout_name = str(para.get('layout_name') or '').strip()
                    queries = list(para.get('image_queries', []) or [])
                    for q in queries:
                        url, alt = tracker._resolve_media(q, idx=0, p_idx=p_idx, layout_name=layout_name, layout_type='portrait_4_3')
                        if not url:
                            continue
                        paragraph_images.setdefault(p_idx, []).append(url)
                        if alt:
                            paragraph_alts.setdefault(p_idx, []).append(alt)

                protocol_paragraphs = []
                for p_idx, para in enumerate(raw_paragraphs):
                    section_name = str(para.get('section_name', '') or '').strip()
                    text_val = str(para.get('text', '') or '').strip()
                    merged_text = f"{section_name} — {text_val}" if section_name else text_val
                    protocol_paragraphs.append({
                        'layout_name': para.get('layout_name') or '',
                        'text': merged_text,
                        'image_urls': paragraph_images.get(p_idx, []),
                        'image_alts': paragraph_alts.get(p_idx, [])
                    })

                hero_url = paragraph_images.get(0, [None])[0] or ''
                ai_json = normalize_ai_post_v1(
                    title=chain.get('title') or p.title,
                    locale=p.locale,
                    paragraphs=protocol_paragraphs,
                    hero_image_url=hero_url,
                    tags=unique_preserve(p.tags_json or ['editorial', 'ai-generated'])
                )

                all_images = []
                for urls in paragraph_images.values():
                    all_images.extend(urls)
                all_images = unique_preserve(all_images)
                item['imageCount'] = len(all_images)

                if dry_run:
                    item['status'] = 'dry_run'
                else:
                    with db.atomic():
                        p.ai_json = ai_json
                        p.hero_image = str((ai_json.get('hero') or {}).get('image_url') or '').strip()
                        p.images_json = all_images
                        p.description = pick_description(ai_json)
                        p.body_json = []
                        p.batch_id = resolved_batch_id
                        if update_time:
                            p.time_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                        p.save()
                    item['status'] = 'success'
            except Exception as exc:
                item['status'] = 'failed'
                item['error'] = str(exc)
            item['elapsedMs'] = int(time.time() * 1000) - started
            report['items'].append(item)

        return report

    def cleanup_editorials_keep_batch(self, *, locale: str = 'all', keep_batch_id: str | None = None, dry_run: bool = False):
        def normalize_locale(value: str) -> str:
            return 'zh-CN' if value == 'zh-CN' else 'en-US'

        locales = ['zh-CN', 'en-US'] if locale == 'all' else [normalize_locale(locale)]
        posts = ContentPost.select().where(ContentPost.locale.in_(locales))
        editorials = [p for p in posts if 'editorial' in (p.tags_json or [])]

        inferred_latest = None
        for p in editorials:
            bid = str(getattr(p, 'batch_id', '') or '').strip()
            if not bid:
                continue
            if inferred_latest is None or bid > inferred_latest:
                inferred_latest = bid

        resolved_keep = str(keep_batch_id or inferred_latest or '').strip()
        to_delete = [p.id for p in editorials if str(getattr(p, 'batch_id', '') or '').strip() != resolved_keep]

        deleted = 0
        if not dry_run and to_delete:
            deleted = ContentPost.delete().where(ContentPost.id.in_(to_delete)).execute()

        return {
            'locale': locale,
            'dryRun': bool(dry_run),
            'keepBatchId': resolved_keep,
            'totalEditorials': len(editorials),
            'toDelete': len(to_delete),
            'deleted': int(deleted)
        }

    def create_user(self, payload):
        try:
            User.get(User.emailOrMobile == payload['emailOrMobile'])
            raise ValueError('ACCOUNT_EXISTS')
        except DoesNotExist:
            pass

        user_id = f"user-{uuid.uuid4().hex[:12]}"
        user = User.create(
            id=user_id,
            name=payload.get('name') or 'Closet Twin',
            emailOrMobile=payload['emailOrMobile'],
            password=payload.get('password') or '',
            avatar='./images/profile/elara-vance.jpg',
            bio=''
        )
        
        UserSetting.create(
            user_id=user_id,
            settings_json=DEFAULT_SETTINGS
        )
        
        return self._public_user(user)

    def login_user(self, payload):
        try:
            user = User.get(User.emailOrMobile == payload.get('emailOrMobile'))
        except DoesNotExist:
            raise LookupError('ACCOUNT_NOT_FOUND')
            
        if user.password and user.password != payload.get('password'):
            raise PermissionError('INVALID_PASSWORD')
            
        return self._public_user(user)

    def _public_user(self, user):
        return {
            'id': user.id,
            'name': user.name or 'Closet Twin',
            'emailOrMobile': user.emailOrMobile or '',
            'avatar': user.avatar or './images/profile/elara-vance.jpg',
            'bio': user.bio or ''
        }

    def get_profile(self, user_id):
        try:
            user = User.get(User.id == user_id)
            return {
                'name': user.name or 'Closet Twin',
                'bio': user.bio or '',
                'avatar': user.avatar or './images/profile/elara-vance.jpg'
            }
        except DoesNotExist:
            return {
                'name': 'Closet Twin',
                'bio': '',
                'avatar': './images/profile/elara-vance.jpg'
            }

    def save_profile(self, user_id, payload):
        try:
            user = User.get(User.id == user_id)
            user.name = payload.get('name') or 'Closet Twin'
            user.bio = payload.get('bio') or ''
            user.avatar = payload.get('avatar') or './images/profile/elara-vance.jpg'
            user.save()
            return {
                'name': user.name,
                'bio': user.bio,
                'avatar': user.avatar
            }
        except DoesNotExist:
            raise LookupError('ACCOUNT_NOT_FOUND')

    def get_settings(self, user_id):
        try:
            setting = UserSetting.get(UserSetting.user_id == user_id)
            return {**DEFAULT_SETTINGS, **(setting.settings_json or {})}
        except DoesNotExist:
            return DEFAULT_SETTINGS

    def save_settings(self, user_id, payload):
        try:
            setting = UserSetting.get(UserSetting.user_id == user_id)
            current = setting.settings_json or {}
            next_settings = {**DEFAULT_SETTINGS, **current, **payload}
            setting.settings_json = next_settings
            setting.save()
            return next_settings
        except DoesNotExist:
            next_settings = {**DEFAULT_SETTINGS, **payload}
            UserSetting.create(user_id=user_id, settings_json=next_settings)
            return next_settings

    def list_schedules(self, user_id):
        schedules = ScheduleItem.select().where(ScheduleItem.user_id == user_id).order_by(ScheduleItem.updatedAt.desc())
        return [
            {
                'id': s.id,
                'tab': s.tab,
                'day': s.day,
                'label': s.label,
                'time': s.time,
                'title': s.title,
                'location': s.location,
                'image': s.image,
                'tags': s.tags_json or [],
                'reminderEnabled': s.reminderEnabled,
                'version': s.version,
                'updatedAt': s.updatedAt
            } for s in schedules
        ]

    def create_schedule(self, user_id, payload):
        item_id = payload.get('id') or f"schedule-{uuid.uuid4().hex[:12]}"
        now = int(time.time() * 1000)
        
        s = ScheduleItem.create(
            id=item_id,
            user_id=user_id,
            tab=payload.get('tab', 'upcoming'),
            day=payload.get('day', ''),
            label=payload.get('label', ''),
            time=payload.get('time', ''),
            title=payload.get('title', ''),
            location=payload.get('location', ''),
            image=payload.get('image', ''),
            tags_json=payload.get('tags') or [],
            reminderEnabled=bool(payload.get('reminderEnabled')),
            version=1,
            updatedAt=now
        )
        
        return {
            'id': s.id,
            'tab': s.tab,
            'day': s.day,
            'label': s.label,
            'time': s.time,
            'title': s.title,
            'location': s.location,
            'image': s.image,
            'tags': s.tags_json,
            'reminderEnabled': s.reminderEnabled,
            'version': s.version,
            'updatedAt': s.updatedAt
        }

    def update_schedule(self, user_id, item_id, payload):
        try:
            s = ScheduleItem.get((ScheduleItem.id == item_id) & (ScheduleItem.user_id == user_id))
            
            expected_version = payload.get('version')
            if expected_version is not None and int(expected_version) != s.version:
                raise ValueError('SCHEDULE_CONFLICT')
                
            s.tab = payload.get('tab', s.tab)
            s.day = payload.get('day', s.day)
            s.label = payload.get('label', s.label)
            s.time = payload.get('time', s.time)
            s.title = payload.get('title', s.title)
            s.location = payload.get('location', s.location)
            s.image = payload.get('image', s.image)
            s.tags_json = payload.get('tags', s.tags_json)
            s.reminderEnabled = bool(payload.get('reminderEnabled', s.reminderEnabled))
            s.version += 1
            s.updatedAt = int(time.time() * 1000)
            
            s.save()
            
            return {
                'id': s.id,
                'tab': s.tab,
                'day': s.day,
                'label': s.label,
                'time': s.time,
                'title': s.title,
                'location': s.location,
                'image': s.image,
                'tags': s.tags_json,
                'reminderEnabled': s.reminderEnabled,
                'version': s.version,
                'updatedAt': s.updatedAt
            }
        except DoesNotExist:
            raise LookupError('SCHEDULE_NOT_FOUND')

    def delete_schedule(self, user_id, item_id):
        ScheduleItem.delete().where((ScheduleItem.id == item_id) & (ScheduleItem.user_id == user_id)).execute()
        return {'deleted': True}

    def get_favorites(self, user_id):
        favs = Favorite.select().where(Favorite.user_id == user_id).order_by(Favorite.savedAt.desc())
        
        looks = []
        posts = []
        
        for f in favs:
            item = {
                'id': f.target_id,
                'title': f.title or '',
                'subtitle': f.subtitle or '',
                'image': f.image or '',
                'href': f.href or '',
                'savedAt': f.savedAt or 0
            }
            if f.target_type == 'posts':
                posts.append(item)
            else:
                looks.append(item)
                
        return {
            'looks': looks,
            'posts': posts
        }

    def add_favorite(self, user_id, favorite_type, item):
        target_type = 'posts' if favorite_type == 'posts' else 'looks'
        target_id = item.get('id')
        
        Favorite.delete().where(
            (Favorite.user_id == user_id) & 
            (Favorite.target_type == target_type) & 
            (Favorite.target_id == target_id)
        ).execute()
        
        Favorite.create(
            user_id=user_id,
            target_type=target_type,
            target_id=target_id,
            title=item.get('title', ''),
            subtitle=item.get('subtitle', ''),
            image=item.get('image', ''),
            href=item.get('href', ''),
            savedAt=item.get('savedAt') or int(time.time() * 1000)
        )
        
        return self.get_favorites(user_id)

    def remove_favorite(self, user_id, favorite_type, item_id):
        target_type = 'posts' if favorite_type == 'posts' else 'looks'
        Favorite.delete().where(
            (Favorite.user_id == user_id) & 
            (Favorite.target_type == target_type) & 
            (Favorite.target_id == item_id)
        ).execute()
        
        return self.get_favorites(user_id)

    def get_discovery_content(self, locale='en-US'):
        normalized_locale = 'zh-CN' if locale == 'zh-CN' else 'en-US'

        posts = ContentPost.select().where(ContentPost.locale == normalized_locale)
        editorials = []
        
        for p in posts:
            if 'editorial' in (p.tags_json or []):
                post_data = {
                    'id': p.id,
                    'author': p.author,
                    'time': p.time_str,
                    'title': p.title,
                    'description': p.description,
                    'body': p.body_json or [],
                    'ai': self._normalize_ai_payload(p.ai_json, p),
                    'tags': p.tags_json or [],
                    'heroImage': p.hero_image,
                    'images': p.images_json or [],
                    'stats': {
                        'likes': p.stats_likes or '0',
                        'comments': p.stats_comments or '0'
                    }
                }
                post_data['heroImage'] = self._resolve_post_hero(post_data)
                if post_data['heroImage'] and post_data['heroImage'] not in post_data['images']:
                    post_data['images'] = [post_data['heroImage'], *post_data['images']]
                editorials.append(post_data)

        # Specific trend strip for editorials
        editorial_trend_items = TrendStripItem.select().where((TrendStripItem.strip_type == 'editorial') & (TrendStripItem.locale == normalized_locale))
        editorial_trend_strip_items = [{
            'tag': t.tag,
            'title': t.title,
            'description': t.description,
            'image': t.image
        } for t in editorial_trend_items]
        
        editorial_trend_strip = {
            'title': 'Featured Editorials' if normalized_locale == 'en-US' else '编辑精选',
            'items': editorial_trend_strip_items
        } if editorial_trend_strip_items else None

        # For static/seed data
        discovery_content_seed = load_json_seed('discovery_content_seed.json')
        seed_data = discovery_content_seed.get(normalized_locale) or discovery_content_seed.get('en-US') or {}

        content = deepcopy(seed_data)
        
        # Clean up legacy mock data keys if they exist in the seed
        for key in ['tabs', 'hotspotStories', 'hotspotTrendStrip', 'postTrendStrip', 'communityPosts']:
            content.pop(key, None)
            
        content.update({
            'editorialTrendStrip': editorial_trend_strip if editorial_trend_strip else seed_data.get('editorialTrendStrip', None),
            'editorials': editorials if editorials else seed_data.get('editorials', []),
            'searchPlaceholder': {
                'editorials': 'HOT SEARCHES · STYLE GUIDE · TRENDS' if normalized_locale == 'en-US' else '热门搜索 · 穿搭指南 · 趋势解析'
            }
        })
        
        return {
            'locale': normalized_locale,
            'content': content
        }

    def get_home_content(self, locale='en-US'):
        normalized_locale = 'zh-CN' if locale == 'zh-CN' else 'en-US'
        
        trend_items = TrendStripItem.select().where((TrendStripItem.strip_type == 'home_picks') & (TrendStripItem.locale == normalized_locale))
        featured_looks = [{
            'id': t.id,
            'tag': t.tag,
            'title': t.title,
            'description': t.description,
            'image': t.image
        } for t in trend_items]

        recommend_items = RecommendLook.select().where(RecommendLook.locale == normalized_locale)
        recommend_looks = [{
            'id': r.id,
            'tag': r.tag,
            'title': r.title,
            'description': r.description,
            'image': r.image,
            'openLabel': r.open_label,
            'detailSerial': r.detail_serial,
            'detailTags': r.detail_tags_json or [],
            'breakdown': r.breakdown_json or []
        } for r in recommend_items]

        tabs = [
            {'key': 'recommend', 'label': 'Recommend' if normalized_locale == 'en-US' else '推荐', 'active': True},
            {'key': 'featured', 'label': 'Featured' if normalized_locale == 'en-US' else '精选', 'active': False}
        ]

        # For static/seed data like recommendLooks, weather, schedule
        home_content_seed = load_json_seed('home_content_seed.json')
        seed_data = home_content_seed.get(normalized_locale) or home_content_seed.get('en-US') or {}

        content = deepcopy(seed_data)
        content.update({
            'tabs': tabs,
            'recommendLooks': recommend_looks if recommend_looks else seed_data.get('recommendLooks', []),
            'featuredLooks': featured_looks if featured_looks else seed_data.get('featuredLooks', [])
        })

        return {
            'locale': normalized_locale,
            'content': content
        }

    def get_discovery_social(self, user_id):
        engagements = SocialEngagement.select().where(SocialEngagement.user_id == user_id)
        
        posts = {}
        authors = {}
        
        for e in engagements:
            if e.target_type == 'post_like':
                posts[e.target_id] = {'likedByUser': e.value}
            elif e.target_type == 'author_follow':
                authors[e.target_id] = {'followedByUser': e.value}
                
        return {
            'posts': posts,
            'authors': authors
        }

    def set_discovery_post_like(self, user_id, post_id, liked):
        with db.atomic():
            SocialEngagement.delete().where(
                (SocialEngagement.user_id == user_id) & 
                (SocialEngagement.target_type == 'post_like') & 
                (SocialEngagement.target_id == post_id)
            ).execute()
            
            SocialEngagement.create(
                user_id=user_id,
                target_type='post_like',
                target_id=post_id,
                value=bool(liked)
            )
            
        return self.get_discovery_social(user_id)

    def set_discovery_author_follow(self, user_id, author_id, followed):
        with db.atomic():
            SocialEngagement.delete().where(
                (SocialEngagement.user_id == user_id) & 
                (SocialEngagement.target_type == 'author_follow') & 
                (SocialEngagement.target_id == author_id)
            ).execute()
            
            SocialEngagement.create(
                user_id=user_id,
                target_type='author_follow',
                target_id=author_id,
                value=bool(followed)
            )
            
        return self.get_discovery_social(user_id)

    def get_discovery_comments(self, user_id):
        # We return comments only for this user
        comments = DiscoveryComment.select().where(DiscoveryComment.user_id == user_id).order_by(DiscoveryComment.created_at.desc())
        
        posts = {}
        for c in comments:
            posts.setdefault(c.post_id, []).append({
                'id': c.id,
                'author': c.author,
                'time': c.time_str,
                'body': c.body
            })
            
        return {
            'posts': posts
        }

    def create_discovery_comment(self, user_id, post_id, payload):
        comment = payload.get('comment') if isinstance(payload.get('comment'), dict) else payload
        body = str(comment.get('body', '')).strip()
        if not body:
            raise ValueError('DISCOVERY_COMMENT_BODY_REQUIRED')

        comment_id = comment.get('id') or f"comment-{uuid.uuid4().hex[:12]}"
        author = comment.get('author') or 'You'
        time_str = comment.get('time') or 'Just now'
        
        DiscoveryComment.create(
            id=comment_id,
            user_id=user_id,
            post_id=post_id,
            author=author,
            time_str=time_str,
            body=body
        )
        
        return {
            'id': comment_id,
            'author': author,
            'time': time_str,
            'body': body
        }

    def prepare_media_upload(self, user_id, payload):
        media_id = f"media-{uuid.uuid4().hex[:12]}"
        upload_token = f"upload-{uuid.uuid4().hex[:12]}"
        remote_url = f"/api/media/files/{media_id}"
        
        MediaRecord.create(
            id=media_id,
            user_id=user_id,
            mimeType=payload.get('mimeType') or 'application/octet-stream',
            fileName=payload.get('fileName') or '',
            contentBase64='',
            remoteUrl=remote_url
        )
        
        MediaUpload.create(
            token=upload_token,
            media_id=media_id,
            user_id=user_id,
            status='prepared'
        )
        
        return {
            'token': upload_token,
            'mediaId': media_id,
            'uploadUrl': f"/api/media/upload/{upload_token}",
            'remoteUrl': remote_url
        }

    def upload_media_content(self, user_id, token, payload):
        content_base64 = str(payload.get('contentBase64') or '').strip()
        if not content_base64:
            raise ValueError('MEDIA_CONTENT_REQUIRED')

        try:
            upload = MediaUpload.get(MediaUpload.token == token)
        except DoesNotExist:
            raise LookupError('MEDIA_UPLOAD_NOT_FOUND')
            
        if upload.user_id != user_id:
            raise PermissionError('MEDIA_UPLOAD_FORBIDDEN')

        try:
            record = MediaRecord.get(MediaRecord.id == upload.media_id)
        except DoesNotExist:
            raise LookupError('MEDIA_NOT_FOUND')

        record.contentBase64 = content_base64
        record.save()
        
        upload.status = 'uploaded'
        upload.save()
        
        return {
            'id': record.id,
            'remoteUrl': record.remoteUrl,
            'mimeType': record.mimeType,
            'fileName': record.fileName
        }

    def get_media_file(self, media_id):
        try:
            record = MediaRecord.get(MediaRecord.id == media_id)
            if not record.contentBase64:
                raise LookupError('MEDIA_NOT_FOUND')
                
            return {
                'mimeType': record.mimeType or 'application/octet-stream',
                'contentBase64': record.contentBase64
            }
        except DoesNotExist:
            raise LookupError('MEDIA_NOT_FOUND')

    def list_wardrobe(self, user_id):
        items = WardrobeItem.select().where(WardrobeItem.user_id == user_id).order_by(WardrobeItem.created_at.desc())
        return [
            {
                'id': i.id,
                'title': i.title or '',
                'category': i.category or '',
                'size': i.size or '',
                'color': i.color or '',
                'material': i.material or '',
                'image': i.image or '',
                'filter': i.filter_value or '',
                'favorite': i.favorite
            } for i in items
        ]

    def create_wardrobe_item(self, user_id, payload):
        item_id = payload.get('id') or f"wardrobe-{uuid.uuid4().hex[:12]}"
        
        i = WardrobeItem.create(
            id=item_id,
            user_id=user_id,
            title=payload.get('title', ''),
            category=payload.get('category', ''),
            size=payload.get('size', ''),
            color=payload.get('color', ''),
            material=payload.get('material', ''),
            image=payload.get('image', ''),
            filter_value=payload.get('filter', ''),
            favorite=bool(payload.get('favorite'))
        )
        
        return {
            'id': i.id,
            'title': i.title,
            'category': i.category,
            'size': i.size,
            'color': i.color,
            'material': i.material,
            'image': i.image,
            'filter': i.filter_value,
            'favorite': i.favorite
        }

    def update_wardrobe_item(self, user_id, item_id, payload):
        try:
            i = WardrobeItem.get((WardrobeItem.id == item_id) & (WardrobeItem.user_id == user_id))
            
            i.title = payload.get('title', i.title)
            i.category = payload.get('category', i.category)
            i.size = payload.get('size', i.size)
            i.color = payload.get('color', i.color)
            i.material = payload.get('material', i.material)
            i.image = payload.get('image', i.image)
            i.filter_value = payload.get('filter', i.filter_value)
            if 'favorite' in payload:
                i.favorite = bool(payload.get('favorite'))
                
            i.save()
            
            return {
                'id': i.id,
                'title': i.title,
                'category': i.category,
                'size': i.size,
                'color': i.color,
                'material': i.material,
                'image': i.image,
                'filter': i.filter_value,
                'favorite': i.favorite
            }
        except DoesNotExist:
            raise LookupError('WARDROBE_NOT_FOUND')

    def delete_wardrobe_item(self, user_id, item_id):
        WardrobeItem.delete().where((WardrobeItem.id == item_id) & (WardrobeItem.user_id == user_id)).execute()
        return {'deleted': True}

    def get_schedule_content(self, user_id, locale='en-US'):
        normalized_locale = 'zh-CN' if locale == 'zh-CN' else 'en-US'
        
        # Load static seed data for tabs, form, and views text/overview
        schedule_content_seed = load_json_seed('schedule_content_seed.json')
        seed_data = schedule_content_seed.get(normalized_locale) or schedule_content_seed.get('en-US') or {}
        
        # We need tabs, form, and views from seed
        content = {
            'tabs': deepcopy(seed_data.get('tabs', [])),
            'form': deepcopy(seed_data.get('form', {})),
            'views': {}
        }
        
        # Initialize views with empty groups from seed overviews
        seed_views = seed_data.get('views', {})
        for tab_key in ['upcoming', 'travel', 'archive']:
            view_seed = seed_views.get(tab_key, {})
            content['views'][tab_key] = {
                'overview': deepcopy(view_seed.get('overview', {})),
                'groups': []
            }
            
        # Helper to parse time to minutes for sorting
        def parse_time(time_str):
            if not time_str:
                return float('inf')
            import re
            match = re.search(r'(\d{1,2}):(\d{2})(?:\s*(AM|PM))?', time_str, re.IGNORECASE)
            if not match:
                return float('inf')
            hours = int(match.group(1))
            minutes = int(match.group(2))
            meridiem = (match.group(3) or '').upper()
            if meridiem == 'PM' and hours < 12:
                hours += 12
            if meridiem == 'AM' and hours == 12:
                hours = 0
            return hours * 60 + minutes

        # Fetch schedules from DB
        schedules = ScheduleItem.select().where(ScheduleItem.user_id == user_id)
        
        # Organize items by tab -> day_label -> events
        tab_map = { 'upcoming': {}, 'travel': {}, 'archive': {} }
        
        for s in schedules:
            tab = s.tab if s.tab in tab_map else 'upcoming'
            group_key = f"{s.day}|{s.label}"
            if group_key not in tab_map[tab]:
                tab_map[tab][group_key] = {
                    'day': s.day,
                    'label': s.label,
                    'events': []
                }
            
            tab_map[tab][group_key]['events'].append({
                'id': s.id,
                'time': s.time,
                'title': s.title,
                'location': s.location,
                'image': s.image,
                'tags': s.tags_json or [],
                'reminderEnabled': s.reminderEnabled,
                'version': s.version,
                'updatedAt': s.updatedAt,
                # For frontend compatibility, sometimes they expect tab/day/label in event too, but usually it's in group.
                'tab': tab,
                'day': s.day,
                'label': s.label
            })
            
        # Sort events within groups and sort groups within tabs
        for tab_key in tab_map:
            groups = list(tab_map[tab_key].values())
            # Sort groups by day (numerically if possible, else string)
            groups.sort(key=lambda g: int(g['day']) if str(g['day']).isdigit() else 0)
            
            for group in groups:
                # Sort events within group by time
                group['events'].sort(key=lambda e: parse_time(e['time']))
                
            content['views'][tab_key]['groups'] = groups
            
        # Update overview counts
        for tab_key in content['views']:
            total_events = sum(len(g['events']) for g in content['views'][tab_key]['groups'])
            if 'overview' in content['views'][tab_key]:
                content['views'][tab_key]['overview']['value'] = f"{total_events:02d}"
            
        return content
