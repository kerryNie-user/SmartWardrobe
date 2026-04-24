import os
import sys

# Ensure backend_lite package can be imported correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from services.backend_lite.database import db
from services.backend_lite.models import (
    User, UserSetting, WardrobeItem, ScheduleItem,
    Favorite, SocialEngagement, DiscoveryComment,
    MediaRecord, MediaUpload
)

def init_db():
    print("Connecting to database...")
    db.connect()
    
    models = [
        User, UserSetting, WardrobeItem, ScheduleItem,
        Favorite, SocialEngagement, DiscoveryComment,
        MediaRecord, MediaUpload
    ]
    
    print("Creating tables...")
    db.create_tables(models)
    
    print("Database initialization complete.")

if __name__ == '__main__':
    init_db()
