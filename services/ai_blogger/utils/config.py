import os
import json

def load_config(config_path="services/ai_blogger/config.json"):
    """
    Loads configuration from a JSON file.
    Falls back to default settings if the file doesn't exist.
    """
    default_config = {
        "llm_provider": "real",
        "image_provider": "auto",
        "output_dir": "services/ai_blogger/output",
        "rss_feeds": [
            "https://news.google.com/rss/search?q=haute%20couture%20OR%20fashion%20week%20OR%20runway%20show&hl=en-US&gl=US&ceid=US:en",
            "https://news.google.com/rss/search?q=creative%20director%20fashion%20brand%20OR%20luxury%20brand%20announcement&hl=en-US&gl=US&ceid=US:en",
            "https://news.google.com/rss/search?q=Dior%20OR%20Chanel%20OR%20Valentino%20OR%20Prada%20fashion%20news&hl=en-US&gl=US&ceid=US:en"
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
