import feedparser
import re
import ssl

def scrape_feed(feed_url: str) -> list[dict]:
    if hasattr(ssl, "_create_unverified_context"):
        ssl._create_default_https_context = ssl._create_unverified_context

    feed = feedparser.parse(feed_url)
    source = feed.feed.get("title", feed_url)
    results = []

    for entry in feed.entries[:3]:
        image_urls = []

        if hasattr(entry, "media_content") and entry.media_content:
            for media in entry.media_content:
                url = media.get("url")
                if url:
                    image_urls.append(url)

        if hasattr(entry, "enclosures") and entry.enclosures:
            for enclosure in entry.enclosures:
                if enclosure.get("type", "").startswith("image/"):
                    url = enclosure.get("href") or enclosure.get("url")
                    if url:
                        image_urls.append(url)

        summary = entry.get("summary", "")
        if summary:
            image_urls.extend(re.findall(r'<img[^>]+src=["\'](.*?)["\']', summary, re.IGNORECASE))

        unique_image_urls = []
        for url in image_urls:
            if url and url not in unique_image_urls:
                unique_image_urls.append(url)

        clean_summary = re.sub(r"<[^>]+>", "", summary).strip()

        results.append(
            {
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "summary": clean_summary,
                "source": source,
                "image_urls": unique_image_urls,
                "image_url": unique_image_urls[0] if unique_image_urls else None,
            }
        )

    return results


def get_latest_trends(config) -> list[dict]:
    trends = []
    feeds = config.get("rss_feeds", [])

    for feed_url in feeds:
        try:
            trends.extend(scrape_feed(feed_url))
        except Exception as e:
            print(f"Error fetching feed {feed_url}: {e}")

    return trends
