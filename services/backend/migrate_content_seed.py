import json
import os
import sys

# Ensure backend package can be imported correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from services.backend.database import db
from services.backend.models import ContentPost, ContentStory, TrendStripItem, RecommendLook

def load_json(filename):
    file_path = os.path.join(os.path.dirname(__file__), 'data', filename)
    if not os.path.exists(file_path):
        print(f"File {file_path} not found.")
        return None
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def migrate_content():
    discovery_data = load_json('discovery_content_seed.json')
    home_data = load_json('home_content_seed.json')

    if not discovery_data and not home_data:
        print("No content data found to migrate.")
        return

    print("Connecting to SQLite database...")
    db.connect()

    with db.atomic():
        # Migrate Discovery Content
        if discovery_data:
            for locale, content in discovery_data.items():
                print(f"Migrating discovery content for locale: {locale}")
                
                # Migrate hotspotStories
                stories = content.get('hotspotStories', [])
                for story in stories:
                    try:
                        ContentStory.get(ContentStory.id == story['id'])
                    except ContentStory.DoesNotExist:
                        ContentStory.create(
                            id=story['id'],
                            tag=story.get('tag', ''),
                            meta_info=story.get('meta', ''),
                            title=story.get('title', ''),
                            description=story.get('description', ''),
                            image=story.get('image', ''),
                            locale=locale
                        )

                # Migrate hotspotTrendStrip
                trend_strip = content.get('hotspotTrendStrip', {})
                if trend_strip:
                    for item in trend_strip.get('items', []):
                        item_id = f"trend_hotspot_{item.get('title', '').replace(' ', '_').lower()}_{locale}"
                        try:
                            TrendStripItem.get(TrendStripItem.id == item_id)
                        except TrendStripItem.DoesNotExist:
                            TrendStripItem.create(
                                id=item_id,
                                strip_type='hotspot',
                                tag=item.get('tag', ''),
                                title=item.get('title', ''),
                                description=item.get('description', ''),
                                image=item.get('image', ''),
                                locale=locale
                            )

                # Migrate communityPosts
                posts = content.get('communityPosts', [])
                for post in posts:
                    try:
                        ContentPost.get(ContentPost.id == post['id'])
                    except ContentPost.DoesNotExist:
                        ContentPost.create(
                            id=post['id'],
                            author=post.get('author', ''),
                            time_str=post.get('time', ''),
                            title=post.get('title', ''),
                            description=post.get('description', ''),
                            body_json=post.get('body', []),
                            tags_json=post.get('tags', []),
                            hero_image=post.get('heroImage', ''),
                            images_json=post.get('images', []),
                            stats_likes=post.get('stats', {}).get('likes', '0'),
                            stats_comments=post.get('stats', {}).get('comments', '0'),
                            locale=locale
                        )

        # Migrate Home Content
        if home_data:
            for locale, content in home_data.items():
                print(f"Migrating home content for locale: {locale}")
                
                # Migrate recommendLooks
                recommends = content.get('recommendLooks', [])
                for idx, item in enumerate(recommends):
                    try:
                        RecommendLook.get(RecommendLook.id == item['id'])
                    except RecommendLook.DoesNotExist:
                        RecommendLook.create(
                            id=item['id'],
                            tag=item.get('tag', ''),
                            title=item.get('title', ''),
                            description=item.get('description', ''),
                            image=item.get('image', ''),
                            open_label=item.get('openLabel', ''),
                            detail_serial=item.get('detailSerial', ''),
                            detail_tags_json=item.get('detailTags', []),
                            breakdown_json=item.get('breakdown', []),
                            locale=locale
                        )

                # Migrate featuredLooks as TrendStripItem
                picks = content.get('featuredLooks', [])
                for idx, item in enumerate(picks):
                    item_id = f"home_pick_{idx}_{locale}"
                    try:
                        TrendStripItem.get(TrendStripItem.id == item_id)
                    except TrendStripItem.DoesNotExist:
                        TrendStripItem.create(
                            id=item_id,
                            strip_type='home_picks',
                            tag=item.get('tag', ''),
                            title=item.get('title', ''),
                            description=item.get('description', ''),  # Use description
                            image=item.get('image', ''),
                            locale=locale
                        )

    print("Content data migration completed successfully.")

if __name__ == '__main__':
    migrate_content()
