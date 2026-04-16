import feedparser

def get_latest_trends(config):
    """
    Fetches the latest fashion news/trends from configured RSS feeds.
    """
    trends = []
    feeds = config.get("rss_feeds", [])
    
    for feed_url in feeds:
        try:
            feed = feedparser.parse(feed_url)
            # Limit to top 3 articles per feed to avoid context window explosion
            for entry in feed.entries[:3]:
                trends.append({
                    "title": entry.get("title", ""),
                    "summary": entry.get("summary", ""),
                    "source": feed.feed.get("title", feed_url)
                })
        except Exception as e:
            print(f"Error fetching feed {feed_url}: {e}")
            
    return trends
