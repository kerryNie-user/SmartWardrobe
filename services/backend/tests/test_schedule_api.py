import pytest
import json
from services.backend.storage import JsonDatabase
from services.backend.handler import create_handler
from http.server import HTTPServer
import threading
import requests
import time

@pytest.fixture
def db_storage(tmp_path):
    """Provide a fresh storage instance for each test."""
    db_path = tmp_path / "test_schedule.db"
    storage = JsonDatabase(str(db_path))
    # Create debug user
    storage._ensure_debug_user()
    return storage

def test_get_schedule_content_empty_fallback(db_storage):
    """When DB has no schedules, get_schedule_content should return empty groups."""
    user_id = 'user-096fb511f3ff'
    content = db_storage.get_schedule_content(user_id, locale='en-US')
    
    assert 'tabs' in content
    assert 'views' in content
    assert 'form' in content
    
    # Check tabs structure
    assert content['tabs'][0]['key'] == 'upcoming'
    
    # Check views structure
    assert 'upcoming' in content['views']
    assert 'groups' in content['views']['upcoming']
    assert len(content['views']['upcoming']['groups']) == 0

def test_get_schedule_content_with_data_sorting(db_storage):
    """When DB has schedules, get_schedule_content should group and sort them correctly."""
    user_id = 'user-096fb511f3ff'
    
    # Create out-of-order events
    db_storage.create_schedule(user_id, {
        'tab': 'upcoming',
        'day': '26',
        'label': 'Oct / Sat',
        'time': '10:00 AM',
        'title': 'Event B'
    })
    
    db_storage.create_schedule(user_id, {
        'tab': 'upcoming',
        'day': '24',
        'label': 'Oct / Thu',
        'time': '11:00 AM',
        'title': 'Event A2'
    })
    
    db_storage.create_schedule(user_id, {
        'tab': 'upcoming',
        'day': '24',
        'label': 'Oct / Thu',
        'time': '09:00 AM',
        'title': 'Event A1'
    })
    
    content = db_storage.get_schedule_content(user_id, locale='en-US')
    groups = content['views']['upcoming']['groups']
    
    # Should group by day and sort by day -> time
    assert len(groups) == 2
    assert groups[0]['day'] == '24'
    assert groups[1]['day'] == '26'
    
    # Check time sorting within the same day
    assert len(groups[0]['events']) == 2
    assert groups[0]['events'][0]['title'] == 'Event A1'
    assert groups[0]['events'][1]['title'] == 'Event A2'

def test_get_schedule_content_localization(db_storage):
    """Check if schedule content is properly localized."""
    user_id = 'user-096fb511f3ff'
    
    content_zh = db_storage.get_schedule_content(user_id, locale='zh-CN')
    assert content_zh['tabs'][0]['label'] == '即将到来'
    assert content_zh['form']['actions']['save'] == '保存日程'
    
    content_en = db_storage.get_schedule_content(user_id, locale='en-US')
    assert content_en['tabs'][0]['label'] == 'Upcoming'
    assert content_en['form']['actions']['save'] == 'Save Event'

@pytest.fixture
def live_server(db_storage):
    handler_class = create_handler(db_storage, directory="apps/web")
    server = HTTPServer(('127.0.0.1', 0), handler_class)
    port = server.server_address[1]
    
    thread = threading.Thread(target=server.serve_forever)
    thread.daemon = True
    thread.start()
    
    yield f"http://127.0.0.1:{port}"
    
    server.shutdown()
    server.server_close()
    thread.join(timeout=1)

def test_api_schedules_content(live_server):
    """Test the HTTP GET endpoint for schedule content."""
    # Since we use the DEBUG_USER, the auth handler will default to it when NO auth header is passed
    resp = requests.get(f"{live_server}/api/schedules/content?locale=en-US")
    assert resp.status_code == 200
    data = resp.json()
    assert 'tabs' in data
    assert 'views' in data
    assert 'upcoming' in data['views']
