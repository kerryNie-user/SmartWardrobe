from peewee import DoesNotExist

from ..database import db
from ..models import User, UserSetting
from .shared import DEBUG_USER, DEFAULT_SETTINGS


class SchemaMixin:
    def _ensure_contentpost_ai_column(self):
        try:
            cursor = db.execute_sql("PRAGMA table_info(contentpost);")
            columns = [row[1] for row in cursor.fetchall()]
            if 'ai_json' in columns:
                return
            db.execute_sql("ALTER TABLE contentpost ADD COLUMN ai_json TEXT;")
        except Exception:
            return

    def _ensure_contentpost_batch_column(self):
        try:
            cursor = db.execute_sql("PRAGMA table_info(contentpost);")
            columns = [row[1] for row in cursor.fetchall()]
            if 'batch_id' in columns:
                try:
                    db.execute_sql('CREATE INDEX IF NOT EXISTS "contentpost_batch_id" ON "contentpost" ("batch_id");')
                    db.execute_sql('REINDEX "contentpost_batch_id";')
                except Exception:
                    return
                return
            db.execute_sql("ALTER TABLE contentpost ADD COLUMN batch_id TEXT;")
            db.execute_sql('CREATE INDEX IF NOT EXISTS "contentpost_batch_id" ON "contentpost" ("batch_id");')
            db.execute_sql('REINDEX "contentpost_batch_id";')
        except Exception:
            return

    def _ensure_scheduleitem_image_column(self):
        try:
            cursor = db.execute_sql("PRAGMA table_info(scheduleitem);")
            columns = [row[1] for row in cursor.fetchall()]
            if 'image' in columns:
                return
            db.execute_sql('ALTER TABLE scheduleitem ADD COLUMN image VARCHAR(256);')
        except Exception:
            return

    def _ensure_debug_user(self):
        try:
            user = User.get(User.emailOrMobile == DEBUG_USER['emailOrMobile'])
        except DoesNotExist:
            user = User.create(
                id=DEBUG_USER['id'],
                name=DEBUG_USER['name'],
                emailOrMobile=DEBUG_USER['emailOrMobile'],
                password=DEBUG_USER['password'],
                avatar=DEBUG_USER['avatar'],
                bio=DEBUG_USER['bio']
            )
        try:
            UserSetting.get(UserSetting.user_id == user.id)
        except DoesNotExist:
            UserSetting.create(user_id=user.id, settings_json=DEFAULT_SETTINGS)
