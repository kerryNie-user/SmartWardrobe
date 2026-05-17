import os
import sys

# Ensure backend package can be imported correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from services.backend.database import db
from services.backend.models import ALL_MODELS

def init_db():
    print("Connecting to database...")
    db.connect(reuse_if_open=True)

    print("Creating tables...")
    db.create_tables(ALL_MODELS)

    print("Database initialization complete.")

if __name__ == '__main__':
    init_db()
