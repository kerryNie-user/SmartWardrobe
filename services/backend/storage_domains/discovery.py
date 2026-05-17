import uuid
from copy import deepcopy

from ..database import db
from ..models import ContentPost, DiscoveryComment, RecommendLook, SocialEngagement, TrendStripItem
from .shared import load_json_seed


class DiscoveryMixin:
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
