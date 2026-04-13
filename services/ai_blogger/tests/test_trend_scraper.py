import pytest
from services.ai_blogger.trend_scraper import get_latest_trends

def test_get_latest_trends_mock():
    # Use a mock feed for reliable testing
    mock_config = {
        "rss_feeds": ["mock_feed"]
    }
    
    trends = get_latest_trends(mock_config)
    assert isinstance(trends, list)
    assert len(trends) > 0
    assert 'title' in trends[0]
    assert 'summary' in trends[0]
