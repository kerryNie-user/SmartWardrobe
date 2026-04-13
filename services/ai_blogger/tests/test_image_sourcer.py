import pytest
from services.ai_blogger.image_sourcer import get_image_for_topic

def test_get_image_for_topic_mock():
    # Use mock provider for predictable test output
    config = {"image_provider": "mock"}
    url = get_image_for_topic("vintage denim", config)
    
    assert isinstance(url, str)
    assert url.startswith("http")
    assert "placeholder" in url or "mock" in url

def test_get_image_for_topic_unsplash():
    # Test the real Unsplash Source URL builder
    config = {"image_provider": "unsplash_source"}
    url = get_image_for_topic("minimalist fashion", config)
    
    assert isinstance(url, str)
    assert url.startswith("https://source.unsplash.com")
    assert "minimalist,fashion" in url
