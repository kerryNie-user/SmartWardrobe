import os
from peewee import SqliteDatabase, Model

def get_db():
    db_path = os.environ.get("SQLITE_DB", os.path.join(os.path.dirname(__file__), 'data', 'smartwardrobe_lite.db'))
    # Ensure the data directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return SqliteDatabase(db_path)

db = get_db()

class BaseModel(Model):
    class Meta:
        database = db
