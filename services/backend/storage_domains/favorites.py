import time

from ..models import Favorite


class FavoritesMixin:
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
