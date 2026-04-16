import unittest
from unittest.mock import MagicMock, patch

from services.ai_blogger.trend_scraper import scrape_feed

class TestTrendScraperImageExtraction(unittest.TestCase):
    @patch('services.ai_blogger.trend_scraper.feedparser.parse')
    def test_scrape_feed_extracts_image_url(self, mock_parse):
        mock_feed = MagicMock()
        mock_feed.feed = {"title": "Test Fashion Source"}
        
        mock_entry = MagicMock()
        mock_entry.get.side_effect = lambda key, default="": {
            "title": "Winter Coat Trends",
            "link": "http://example.com/winter-coats",
            "summary": "<p>This is a summary.</p><img src='https://example.com/images/coat.jpg' alt='coat'>",
        }.get(key, default)
        
        mock_entry.media_content = [{"url": "https://example.com/images/media.jpg"}]
        mock_entry.enclosures = [{"type": "image/jpeg", "href": "https://example.com/images/enclosure.jpg"}]
        
        mock_feed.entries = [mock_entry]
        mock_parse.return_value = mock_feed

        result = scrape_feed("http://fake-feed.com")
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["title"], "Winter Coat Trends")
        self.assertEqual(
            result[0]["image_urls"],
            [
                "https://example.com/images/media.jpg",
                "https://example.com/images/enclosure.jpg",
                "https://example.com/images/coat.jpg",
            ],
        )
        self.assertEqual(result[0]["image_url"], "https://example.com/images/media.jpg")
        
    @patch('services.ai_blogger.trend_scraper.feedparser.parse')
    def test_scrape_feed_extracts_image_from_summary(self, mock_parse):
        mock_feed = MagicMock()
        mock_feed.feed = {"title": "Test Fashion Source"}
        
        mock_entry = MagicMock()
        mock_entry.get.side_effect = lambda key, default="": {
            "title": "Summer Trends",
            "link": "http://example.com/summer",
            "summary": "Here is a <img src=\"https://example.com/summer.png\"/> picture.",
        }.get(key, default)
        mock_entry.media_content = []
        mock_entry.enclosures = []
        
        mock_feed.entries = [mock_entry]
        mock_parse.return_value = mock_feed

        result = scrape_feed("http://fake-feed.com")
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["image_urls"], ["https://example.com/summer.png"])
        self.assertEqual(result[0]["image_url"], "https://example.com/summer.png")

if __name__ == '__main__':
    unittest.main()
