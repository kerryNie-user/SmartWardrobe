import os
import json
import pytest
from services.ai_blogger.utils.config import load_config

def test_load_config_with_missing_file():
    # Test fallback config when no custom config exists
    config = load_config("nonexistent_config.json")
    assert config['llm_provider'] == 'mock'
    assert config['image_provider'] == 'unsplash_source'
    assert 'output_dir' in config

def test_load_config_with_valid_file(tmp_path):
    # Test valid custom config loading
    config_file = tmp_path / "test_config.json"
    custom_config = {"llm_provider": "openai", "openai_api_key": "test_key"}
    config_file.write_text(json.dumps(custom_config))
    
    config = load_config(str(config_file))
    assert config['llm_provider'] == 'openai'
    assert config['openai_api_key'] == 'test_key'
    assert config['image_provider'] == 'unsplash_source' # Should still inherit defaults
