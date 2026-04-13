import os
import json
from datetime import datetime
from services.ai_blogger.utils.config import load_config
from services.ai_blogger.trend_scraper import get_latest_trends
from services.ai_blogger.content_generator import generate_blog_post
from services.ai_blogger.image_sourcer import get_image_for_topic

def run_pipeline(config=None):
    """
    The main orchestrator.
    Scrape Trends -> Generate Content -> Source Images -> Save to Output Dir.
    """
    if config is None:
        config = load_config()
        
    print("1. Scraping Trends...")
    trends = get_latest_trends(config)
    
    print("2. Generating Editorial Content...")
    post = generate_blog_post(trends, config)
    
    print("3. Sourcing Real Images...")
    for p in post.get("paragraphs", []):
        if "image_query" in p:
            # Sourcing the image based on the LLM's suggested query
            p["image_url"] = get_image_for_topic(p["image_query"], config)
            
    # Add metadata
    post["date"] = datetime.now().isoformat()
    
    print("4. Saving Artifacts...")
    output_dir = config.get("output_dir", "services/ai_blogger/output")
    os.makedirs(output_dir, exist_ok=True)
    
    date_str = datetime.now().strftime("%Y-%m-%d")
    filename = f"blog_{date_str}.json"
    filepath = os.path.join(output_dir, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(post, f, indent=4, ensure_ascii=False)
        
    print(f"Pipeline complete! Artifact saved to: {filepath}")
    return filepath

if __name__ == "__main__":
    # If run directly as a script
    run_pipeline()
