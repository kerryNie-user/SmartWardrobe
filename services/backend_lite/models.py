import datetime
import json
from peewee import CharField, TextField, BooleanField, IntegerField, DateTimeField, BigIntegerField, AutoField
from .database import BaseModel

class JSONField(TextField):
    def db_value(self, value):
        return json.dumps(value) if value is not None else None

    def python_value(self, value):
        if value is not None:
            return json.loads(value)
        return None

class User(BaseModel):
    id = CharField(max_length=64, primary_key=True)
    name = CharField(max_length=128)
    emailOrMobile = CharField(max_length=128, unique=True)
    password = CharField(max_length=128, null=True)
    avatar = CharField(max_length=256, null=True)
    bio = TextField(null=True)
    created_at = DateTimeField(default=datetime.datetime.now)

class UserSetting(BaseModel):
    user_id = CharField(max_length=64, primary_key=True)
    settings_json = JSONField()

class WardrobeItem(BaseModel):
    id = CharField(max_length=64, primary_key=True)
    user_id = CharField(max_length=64, index=True)
    title = CharField(max_length=128, null=True)
    category = CharField(max_length=64, null=True)
    size = CharField(max_length=32, null=True)
    color = CharField(max_length=64, null=True)
    material = CharField(max_length=64, null=True)
    image = CharField(max_length=256, null=True)
    filter_value = CharField(max_length=128, null=True)
    favorite = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.datetime.now)

class ScheduleItem(BaseModel):
    id = CharField(max_length=64, primary_key=True)
    user_id = CharField(max_length=64, index=True)
    tab = CharField(max_length=32, null=True)
    day = CharField(max_length=32, null=True)
    label = CharField(max_length=64, null=True)
    time = CharField(max_length=32, null=True)
    title = CharField(max_length=128, null=True)
    location = CharField(max_length=256, null=True)
    tags_json = JSONField(null=True)
    reminderEnabled = BooleanField(default=False)
    version = IntegerField(default=1)
    updatedAt = BigIntegerField()

class Favorite(BaseModel):
    id = AutoField()
    user_id = CharField(max_length=64, index=True)
    target_type = CharField(max_length=32) # 'looks' or 'posts'
    target_id = CharField(max_length=64)
    title = CharField(max_length=128, null=True)
    subtitle = CharField(max_length=128, null=True)
    image = CharField(max_length=256, null=True)
    href = CharField(max_length=256, null=True)
    savedAt = BigIntegerField(null=True)
    
    class Meta:
        indexes = (
            (('user_id', 'target_type', 'target_id'), True),
        )

class SocialEngagement(BaseModel):
    id = AutoField()
    user_id = CharField(max_length=64, index=True)
    target_type = CharField(max_length=32) # 'post_like', 'author_follow'
    target_id = CharField(max_length=64)
    value = BooleanField(default=False)
    
    class Meta:
        indexes = (
            (('user_id', 'target_type', 'target_id'), True),
        )

class DiscoveryComment(BaseModel):
    id = CharField(max_length=64, primary_key=True)
    user_id = CharField(max_length=64, index=True)
    post_id = CharField(max_length=64, index=True)
    author = CharField(max_length=128, null=True)
    time_str = CharField(max_length=64, null=True)
    body = TextField()
    created_at = DateTimeField(default=datetime.datetime.now)

class MediaRecord(BaseModel):
    id = CharField(max_length=64, primary_key=True)
    user_id = CharField(max_length=64, index=True)
    mimeType = CharField(max_length=128)
    fileName = CharField(max_length=256, null=True)
    contentBase64 = TextField(null=True)
    remoteUrl = CharField(max_length=256)
    
class MediaUpload(BaseModel):
    token = CharField(max_length=64, primary_key=True)
    media_id = CharField(max_length=64)
    user_id = CharField(max_length=64)
    status = CharField(max_length=32)

class ContentPost(BaseModel):
    id = CharField(max_length=64, primary_key=True)
    author = CharField(max_length=128)
    time_str = CharField(max_length=64)
    title = CharField(max_length=128)
    description = TextField()
    body_json = JSONField(null=True)
    tags_json = JSONField(null=True)
    hero_image = CharField(max_length=256)
    images_json = JSONField(null=True)
    stats_likes = CharField(max_length=64, null=True)
    stats_comments = CharField(max_length=64, null=True)
    locale = CharField(max_length=16, index=True)

class ContentStory(BaseModel):
    id = CharField(max_length=64, primary_key=True)
    tag = CharField(max_length=64)
    meta_info = CharField(max_length=64, null=True)
    title = CharField(max_length=128)
    description = TextField()
    image = CharField(max_length=256)
    locale = CharField(max_length=16, index=True)

class TrendStripItem(BaseModel):
    id = CharField(max_length=64, primary_key=True)
    strip_type = CharField(max_length=32, index=True) # e.g. 'hotspot', 'post', 'home_picks'
    tag = CharField(max_length=64)
    title = CharField(max_length=128)
    description = TextField()
    image = CharField(max_length=256)
    locale = CharField(max_length=16, index=True)
