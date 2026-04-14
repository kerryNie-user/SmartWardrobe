import os
import json

def load_config(config_path="services/ai_blogger/config.json"):
    """
    Loads configuration from a JSON file.
    Falls back to default settings if the file doesn't exist.
    """
    default_config = {
        "llm_provider": "real",
        "image_provider": "unsplash_source",
        "output_dir": "services/ai_blogger/output",
        "rss_feeds": [
            "https://www.vogue.com/feed/fashion",
            "https://www.gq.com/feed/style"
        ]
    }
    
    if not os.path.exists(config_path):
        return default_config
        
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            user_config = json.load(f)
            # Merge user config into default config
            merged = default_config.copy()
            merged.update(user_config)
            return merged
    except Exception as e:
        print(f"Error loading config {config_path}: {e}")
        return default_config
