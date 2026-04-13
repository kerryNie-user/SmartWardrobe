import os
import json
import pytest
from datetime import datetime

from services.ai_blogger.content_generator import generate_blog_post
from services.ai_blogger.main import run_pipeline

def test_generate_blog_post_mock():
    # Use mock provider for predictable test output
    config = {"llm_provider": "mock"}
    trends = [
        {"title": "Test Trend 1", "summary": "Test Summary 1", "source": "Test Source"}
    ]
    
    post = generate_blog_post(trends, config)
    
    assert isinstance(post, dict)
    assert 'title' in post
    assert 'paragraphs' in post
    assert len(post['paragraphs']) > 0
    assert 'text' in post['paragraphs'][0]
    assert 'image_query' in post['paragraphs'][0]

def test_run_pipeline(tmp_path):
    # Test the entire orchestrator
    mock_config = {
        "llm_provider": "mock",
        "image_provider": "mock",
        "rss_feeds": ["mock_feed"],
        "output_dir": str(tmp_path)
    }
    
    output_file = run_pipeline(mock_config)
    
    assert os.path.exists(output_file)
    
    with open(output_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    assert 'title' in data
    assert 'date' in data
    assert 'paragraphs' in data
    assert len(data['paragraphs']) > 0
    
    # Check that image_url was successfully populated by image_sourcer
    first_paragraph = data['paragraphs'][0]
    assert 'image_url' in first_paragraph
    assert first_paragraph['image_url'].startswith('http')
