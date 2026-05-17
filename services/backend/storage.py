from .database import db
from .models import ALL_MODELS
from .storage_domains import (
    AccountMixin,
    DiscoveryMixin,
    EditorialAdminMixin,
    FavoritesMixin,
    MediaMixin,
    ScheduleMixin,
    SchemaMixin,
    WardrobeMixin,
    load_json_seed,
)
from .storage_domains.shared import (
    DEBUG_USER,
    DEFAULT_PROFILE_AVATAR,
    DEFAULT_SETTINGS,
    LEGACY_PROFILE_AVATARS,
)


class JsonDatabase(
    SchemaMixin,
    AccountMixin,
    ScheduleMixin,
    FavoritesMixin,
    DiscoveryMixin,
    MediaMixin,
    WardrobeMixin,
    EditorialAdminMixin,
):
    def __init__(self, file_path=None):
        if file_path is not None:
            db.init(file_path)
            db.connect(reuse_if_open=True)
            db.create_tables(ALL_MODELS)
            self._ensure_contentpost_ai_column()
            self._ensure_contentpost_batch_column()
            self._ensure_scheduleitem_image_column()
        self._ensure_debug_user()


__all__ = [
    'JsonDatabase',
    'load_json_seed',
    'DEBUG_USER',
    'DEFAULT_PROFILE_AVATAR',
    'DEFAULT_SETTINGS',
    'LEGACY_PROFILE_AVATARS',
]
