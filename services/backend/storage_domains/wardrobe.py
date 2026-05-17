import uuid

from peewee import DoesNotExist

from ..models import WardrobeItem


class WardrobeMixin:
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
