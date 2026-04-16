import feedparser
import re
import ssl

def get_latest_trends(config):
    """
    Fetches the latest fashion news/trends from configured RSS feeds.
    """
    if hasattr(ssl, '_create_unverified_context'):
        ssl._create_default_https_context = ssl._create_unverified_context

    trends = []
    feeds = config.get("rss_feeds", [])
    
    for feed_url in feeds:
        try:
            feed = feedparser.parse(feed_url)
            # Limit to top 3 articles per feed to avoid context window explosion
            for entry in feed.entries[:3]:
                image_url = None
                
                # 1. Try to get image from media_content or enclosures
                if hasattr(entry, 'media_content') and entry.media_content:
                    image_url = entry.media_content[0].get('url')
                elif hasattr(entry, 'enclosures') and entry.enclosures:
                    for enclosure in entry.enclosures:
                        if enclosure.get('type', '').startswith('image/'):
                            image_url = enclosure.get('href')
                            break
                
                # 2. Fallback: Parse <img> tag from summary using regex
                summary = entry.get("summary", "")
                if not image_url and summary:
                    img_match = re.search(r'<img[^>]+src=["\'](.*?)["\']', summary, re.IGNORECASE)
                    if img_match:
                        image_url = img_match.group(1)
                
                # 3. Clean summary: Remove HTML tags for the text summary
                clean_summary = re.sub(r'<[^>]+>', '', summary).strip()
                
                trends.append({
                    "title": entry.get("title", ""),
                    "summary": clean_summary,
                    "source": feed.feed.get("title", feed_url),
                    "image_url": image_url
                })
        except Exception as e:
            print(f"Error fetching feed {feed_url}: {e}")
            
    return trends
