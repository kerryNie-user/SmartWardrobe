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
    MediaRecord, MediaUpload
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
                MediaRecord, MediaUpload
            ])
        self._ensure_debug_user()
        
    def _ensure_debug_user(self):
        try:
            User.get(User.emailOrMobile == DEBUG_USER['emailOrMobile'])
        except DoesNotExist:
            User.create(
                id=DEBUG_USER['id'],
                name=DEBUG_USER['name'],
                emailOrMobile=DEBUG_USER['emailOrMobile'],
                password=DEBUG_USER['password'],
                avatar=DEBUG_USER['avatar'],
                bio=DEBUG_USER['bio']
            )
            UserSetting.create(
                user_id=DEBUG_USER['id'],
                settings_json=DEFAULT_SETTINGS
            )

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
        discovery_content = load_json_seed('discovery_content_seed.json')
        normalized_locale = 'zh-CN' if locale == 'zh-CN' else 'en-US'
        content = discovery_content.get(normalized_locale) or discovery_content.get('en-US') or {}
        return {
            'locale': normalized_locale,
            'content': deepcopy(content)
        }

    def get_home_content(self, locale='en-US'):
        home_content = load_json_seed('home_content_seed.json')
        normalized_locale = 'zh-CN' if locale == 'zh-CN' else 'en-US'
        content = home_content.get(normalized_locale) or home_content.get('en-US') or {}
        return {
            'locale': normalized_locale,
            'content': deepcopy(content)
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
