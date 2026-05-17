import uuid

from peewee import DoesNotExist

from ..models import User, UserSetting
from .shared import DEFAULT_PROFILE_AVATAR, DEFAULT_SETTINGS, LEGACY_PROFILE_AVATARS


class AccountMixin:
    def _normalize_profile_avatar(self, value: str | None) -> str:
        avatar = str(value or '').strip()
        if not avatar or avatar in LEGACY_PROFILE_AVATARS:
            return DEFAULT_PROFILE_AVATAR
        return avatar

    def create_user(self, payload):
        try:
            User.get(User.emailOrMobile == payload['emailOrMobile'])
            raise ValueError('ACCOUNT_EXISTS')
        except DoesNotExist:
            pass

        user_id = f"user-{uuid.uuid4().hex[:12]}"
        user = User.create(
            id=user_id,
            name=payload.get('name') or 'Closet Twin',
            emailOrMobile=payload['emailOrMobile'],
            password=payload.get('password') or '',
            avatar=DEFAULT_PROFILE_AVATAR,
            bio=''
        )
        
        UserSetting.create(
            user_id=user_id,
            settings_json=DEFAULT_SETTINGS
        )
        
        return self._public_user(user)

    def login_user(self, payload):
        try:
            user = User.get(User.emailOrMobile == payload.get('emailOrMobile'))
        except DoesNotExist:
            raise LookupError('ACCOUNT_NOT_FOUND')
            
        if user.password and user.password != payload.get('password'):
            raise PermissionError('INVALID_PASSWORD')
            
        return self._public_user(user)

    def _public_user(self, user):
        return {
            'id': user.id,
            'name': user.name or 'Closet Twin',
            'emailOrMobile': user.emailOrMobile or '',
            'avatar': self._normalize_profile_avatar(user.avatar),
            'bio': user.bio or ''
        }

    def get_profile(self, user_id):
        try:
            user = User.get(User.id == user_id)
            return {
                'name': user.name or 'Closet Twin',
                'bio': user.bio or '',
                'avatar': self._normalize_profile_avatar(user.avatar)
            }
        except DoesNotExist:
            return {
                'name': 'Closet Twin',
                'bio': '',
                'avatar': DEFAULT_PROFILE_AVATAR
            }

    def save_profile(self, user_id, payload):
        try:
            user = User.get(User.id == user_id)
            user.name = payload.get('name') or 'Closet Twin'
            user.bio = payload.get('bio') or ''
            user.avatar = self._normalize_profile_avatar(payload.get('avatar'))
            user.save()
            return {
                'name': user.name,
                'bio': user.bio,
                'avatar': self._normalize_profile_avatar(user.avatar)
            }
        except DoesNotExist:
            raise LookupError('ACCOUNT_NOT_FOUND')

    def get_settings(self, user_id):
        try:
            setting = UserSetting.get(UserSetting.user_id == user_id)
            return {**DEFAULT_SETTINGS, **(setting.settings_json or {})}
        except DoesNotExist:
            return DEFAULT_SETTINGS

    def save_settings(self, user_id, payload):
        try:
            setting = UserSetting.get(UserSetting.user_id == user_id)
            current = setting.settings_json or {}
            next_settings = {**DEFAULT_SETTINGS, **current, **payload}
            setting.settings_json = next_settings
            setting.save()
            return next_settings
        except DoesNotExist:
            next_settings = {**DEFAULT_SETTINGS, **payload}
            UserSetting.create(user_id=user_id, settings_json=next_settings)
            return next_settings
