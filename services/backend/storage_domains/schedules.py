import time
import uuid
from copy import deepcopy

from peewee import DoesNotExist

from ..models import ScheduleItem
from .shared import load_json_seed


class ScheduleMixin:
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
