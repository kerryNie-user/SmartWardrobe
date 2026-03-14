import datetime
import re

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
_CN_MOBILE_RE = re.compile(r"^1[3-9]\d{9}$")


def truthy_env(env, name, default=False):
    val = env.get(name)
    if val is None:
        return default
    return str(val).strip().lower() in ("1", "true", "yes", "y", "on")


def safe_client_id(raw):
    if not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val or len(val) > 64:
        return None
    if not all(c.isalnum() or c in ("-", "_") for c in val):
        return None
    return val


def safe_entity_type(raw):
    if raw in ("outfit", "pick"):
        return raw
    return None


def safe_entity_id(raw):
    if raw is None:
        return None
    val = str(raw).strip()
    if not val or len(val) > 64:
        return None
    if not all(c.isalnum() or c in ("-", "_") for c in val):
        return None
    return val


def safe_schedule_id(raw):
    return safe_entity_id(raw)


def safe_namespace(raw):
    if not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val or len(val) > 64:
        return None
    if not all(c.isalnum() or c in ("-", "_", ".", ":") for c in val):
        return None
    return val


def safe_kv_key(raw):
    if not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val or len(val) > 128:
        return None
    if not all(c.isalnum() or c in ("-", "_", ".", ":") for c in val):
        return None
    return val


def safe_name(raw):
    if not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val or len(val) > 128:
        return None
    return val


def safe_email_or_mobile(raw):
    if not isinstance(raw, str):
        return (None, None)
    val = raw.strip()
    if not val or len(val) > 254:
        return (None, None)
    if _EMAIL_RE.match(val):
        return (val.lower(), None)
    if _CN_MOBILE_RE.match(val):
        return (None, val)
    return (None, None)


def parse_iso_datetime_utc(raw):
    if raw is None:
        return None
    if not isinstance(raw, str):
        raw = str(raw)
    val = raw.strip()
    if not val or len(val) > 64:
        return None
    try:
        s = val[:-1] + "+00:00" if val.endswith("Z") else val
        dt = datetime.datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.astimezone(datetime.timezone.utc)
    except Exception:
        return None


def mysql_datetime3(dt):
    if not isinstance(dt, datetime.datetime):
        return None
    return dt.strftime("%Y-%m-%d %H:%M:%S.%f")[:23]

