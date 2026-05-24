import datetime
import re
import time
import uuid
from copy import deepcopy

from peewee import DoesNotExist

from ..models import ScheduleItem
from .shared import load_json_seed

UPCOMING_WINDOW_DAYS = 3
MONTH_MAP = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'sept': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
}
WEEKDAY_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']


def _today():
    return datetime.date.today()


def _date_key(date_value):
    return date_value.strftime('%Y-%m-%d')


def _parse_iso_date(value):
    if not value:
        return None
    try:
        return datetime.datetime.strptime(str(value).strip(), '%Y-%m-%d').date()
    except Exception:
        return None


def _resolve_month(label):
    if not label:
        return None
    text = str(label)
    zh = re.search(r'(\d{1,2})\s*月', text)
    if zh:
        month = int(zh.group(1))
        return month if 1 <= month <= 12 else None
    en = re.search(r'[A-Za-z]+', text)
    if not en:
        return None
    return MONTH_MAP.get(en.group(0).lower())


def _resolve_day(day_value, label=''):
    for candidate in (day_value, label):
        if not candidate:
            continue
        match = re.search(r'(\d{1,2})', str(candidate))
        if match:
            day = int(match.group(1))
            if 1 <= day <= 31:
                return day
    return None


def _resolve_year(label=''):
    match = re.search(r'\b(20\d{2}|19\d{2})\b', str(label or ''))
    return int(match.group(1)) if match else _today().year


def _resolve_date_from_fields(date_iso=None, day='', label=''):
    explicit = _parse_iso_date(date_iso)
    if explicit:
        return explicit

    month = _resolve_month(label)
    day_value = _resolve_day(day, label)
    if not month or not day_value:
        return None

    year = _resolve_year(label)
    try:
        return datetime.date(year, month, day_value)
    except Exception:
        return None


def _is_within_upcoming_window(date_value):
    if not date_value:
        return False
    delta = (date_value - _today()).days
    return 0 <= delta < UPCOMING_WINDOW_DAYS


def _resolve_tab_from_payload(payload, fallback_tab='upcoming'):
    date_value = _resolve_date_from_fields(
        payload.get('dateISO') or payload.get('eventDate') or payload.get('date') or payload.get('scheduledDate'),
        payload.get('day', ''),
        payload.get('label', '')
    )
    if date_value:
        return 'upcoming' if _is_within_upcoming_window(date_value) else 'archive'
    if payload.get('tab') == 'archive':
        return 'archive'
    return 'upcoming' if fallback_tab not in ('archive', 'travel') else 'archive'


def _format_date_parts(date_value, locale='en-US'):
    if not date_value:
        return {'day': '', 'label': '', 'dateISO': ''}
    if locale == 'zh-CN':
        return {
            'day': f"{date_value.day:02d}",
            'label': f"{date_value.month}月 / {WEEKDAY_ZH[date_value.weekday()]}",
            'dateISO': _date_key(date_value)
        }
    return {
        'day': f"{date_value.day:02d}",
        'label': f"{date_value.strftime('%b')} / {date_value.strftime('%a')}",
        'dateISO': _date_key(date_value)
    }


def _parse_time(time_str):
    if not time_str:
        return float('inf')
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


def _event_record(schedule_item, locale='en-US'):
    date_value = _resolve_date_from_fields(schedule_item.dateISO, schedule_item.day, schedule_item.label)
    date_parts = _format_date_parts(date_value, locale) if date_value else {'day': schedule_item.day or '', 'label': schedule_item.label or '', 'dateISO': schedule_item.dateISO or ''}
    tab = 'upcoming' if date_value and _is_within_upcoming_window(date_value) else 'archive'
    return {
        'id': schedule_item.id,
        'tab': tab,
        'dateISO': date_parts['dateISO'],
        'day': date_parts['day'] or schedule_item.day or '',
        'label': date_parts['label'] or schedule_item.label or '',
        'time': schedule_item.time,
        'title': schedule_item.title,
        'location': schedule_item.location,
        'image': schedule_item.image,
        'tags': schedule_item.tags_json or [],
        'reminderEnabled': schedule_item.reminderEnabled,
        'version': schedule_item.version,
        'updatedAt': schedule_item.updatedAt
    }


def _build_group_key(date_iso, day, label):
    return f"{date_iso or ''}|{day or ''}|{label or ''}"


def _group_events(events):
    groups = {}
    for event in events:
        key = _build_group_key(event.get('dateISO'), event.get('day'), event.get('label'))
        if key not in groups:
            groups[key] = {
                'dateISO': event.get('dateISO', ''),
                'day': event.get('day', ''),
                'label': event.get('label', ''),
                'events': []
            }
        groups[key]['events'].append(event)

    result = list(groups.values())
    result.sort(key=lambda group: _parse_iso_date(group.get('dateISO')) or datetime.date.max)
    for group in result:
        group['events'].sort(key=lambda event: _parse_time(event.get('time')))
    return result


class ScheduleMixin:
    def list_schedules(self, user_id):
        schedules = ScheduleItem.select().where(ScheduleItem.user_id == user_id).order_by(ScheduleItem.updatedAt.desc())
        return [_event_record(s) for s in schedules]

    def create_schedule(self, user_id, payload):
        item_id = payload.get('id') or f"schedule-{uuid.uuid4().hex[:12]}"
        now = int(time.time() * 1000)
        date_value = _resolve_date_from_fields(
            payload.get('dateISO'),
            payload.get('day', ''),
            payload.get('label', '')
        )
        date_parts = _format_date_parts(date_value, 'en-US') if date_value else {'day': payload.get('day', ''), 'label': payload.get('label', ''), 'dateISO': payload.get('dateISO', '')}
        tab = _resolve_tab_from_payload(payload, 'upcoming')

        s = ScheduleItem.create(
            id=item_id,
            user_id=user_id,
            tab=tab,
            dateISO=date_parts.get('dateISO', ''),
            day=date_parts.get('day', payload.get('day', '')),
            label=date_parts.get('label', payload.get('label', '')),
            time=payload.get('time', ''),
            title=payload.get('title', ''),
            location=payload.get('location', ''),
            image=payload.get('image', ''),
            tags_json=payload.get('tags') or [],
            reminderEnabled=bool(payload.get('reminderEnabled')),
            version=1,
            updatedAt=now
        )

        return _event_record(s)

    def update_schedule(self, user_id, item_id, payload):
        try:
            s = ScheduleItem.get((ScheduleItem.id == item_id) & (ScheduleItem.user_id == user_id))

            expected_version = payload.get('version')
            if expected_version is not None and int(expected_version) != s.version:
                raise ValueError('SCHEDULE_CONFLICT')

            date_value = _resolve_date_from_fields(
                payload.get('dateISO') or s.dateISO,
                payload.get('day', s.day),
                payload.get('label', s.label)
            )
            date_parts = _format_date_parts(date_value) if date_value else {
                'day': payload.get('day', s.day) or '',
                'label': payload.get('label', s.label) or '',
                'dateISO': payload.get('dateISO', s.dateISO) or ''
            }

            s.tab = _resolve_tab_from_payload(payload, s.tab or 'upcoming')
            s.dateISO = date_parts.get('dateISO', '')
            s.day = date_parts.get('day', s.day)
            s.label = date_parts.get('label', s.label)
            s.time = payload.get('time', s.time)
            s.title = payload.get('title', s.title)
            s.location = payload.get('location', s.location)
            s.image = payload.get('image', s.image)
            s.tags_json = payload.get('tags', s.tags_json)
            s.reminderEnabled = bool(payload.get('reminderEnabled', s.reminderEnabled))
            s.version += 1
            s.updatedAt = int(time.time() * 1000)

            s.save()

            return _event_record(s)
        except DoesNotExist:
            raise LookupError('SCHEDULE_NOT_FOUND')

    def delete_schedule(self, user_id, item_id):
        ScheduleItem.delete().where((ScheduleItem.id == item_id) & (ScheduleItem.user_id == user_id)).execute()
        return {'deleted': True}

    def get_schedule_content(self, user_id, locale='en-US'):
        normalized_locale = 'zh-CN' if locale == 'zh-CN' else 'en-US'

        schedule_content_seed = load_json_seed('schedule_content_seed.json')
        seed_data = schedule_content_seed.get(normalized_locale) or schedule_content_seed.get('en-US') or {}
        seed_views = seed_data.get('views', {})

        content = {
            'tabs': deepcopy(seed_data.get('tabs', [])),
            'form': deepcopy(seed_data.get('form', {})),
            'views': {}
        }

        for tab_key in ['upcoming', 'travel', 'archive']:
            view_seed = seed_views.get(tab_key, {})
            content['views'][tab_key] = {
                'overview': deepcopy(view_seed.get('overview', {})),
                'groups': []
            }

        schedules = ScheduleItem.select().where(ScheduleItem.user_id == user_id)
        upcoming_events = []
        history_events = []

        for schedule_item in schedules:
            event = _event_record(schedule_item, normalized_locale)
            if event['tab'] == 'upcoming':
                upcoming_events.append(event)
            else:
                history_events.append(event)

        content['views']['upcoming']['groups'] = _group_events(upcoming_events)
        content['views']['travel']['groups'] = []
        content['views']['archive']['groups'] = _group_events(history_events)

        for tab_key in content['views']:
            total_events = sum(len(group['events']) for group in content['views'][tab_key]['groups'])
            if 'overview' in content['views'][tab_key]:
                content['views'][tab_key]['overview']['value'] = f"{total_events:02d}"

        return content
