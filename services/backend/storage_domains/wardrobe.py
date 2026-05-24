import uuid

from peewee import DoesNotExist

from ..models import WardrobeItem


def _read_ai_payload(payload, default=None):
    for key in ('aiJson', 'ai_json', 'ai'):
        if key in payload:
            return payload.get(key)
    return default


def _serialize_wardrobe_item(item):
    return {
        'id': item.id,
        'title': item.title or '',
        'category': item.category or '',
        'size': item.size or '',
        'color': item.color or '',
        'material': item.material or '',
        'image': item.image or '',
        'filter': item.filter_value or '',
        'favorite': item.favorite,
        'aiJson': item.ai_json
    }


class WardrobeMixin:
    def list_wardrobe(self, user_id):
        items = WardrobeItem.select().where(WardrobeItem.user_id == user_id).order_by(WardrobeItem.created_at.desc())
        return [_serialize_wardrobe_item(i) for i in items]

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
            favorite=bool(payload.get('favorite')),
            ai_json=_read_ai_payload(payload)
        )
        
        return _serialize_wardrobe_item(i)

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
            i.ai_json = _read_ai_payload(payload, i.ai_json)
            if 'favorite' in payload:
                i.favorite = bool(payload.get('favorite'))
                
            i.save()
            
            return _serialize_wardrobe_item(i)
        except DoesNotExist:
            raise LookupError('WARDROBE_NOT_FOUND')

    def delete_wardrobe_item(self, user_id, item_id):
        WardrobeItem.delete().where((WardrobeItem.id == item_id) & (WardrobeItem.user_id == user_id)).execute()
        return {'deleted': True}
