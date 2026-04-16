import unittest
from unittest.mock import patch, MagicMock
from services.ai_blogger.image_sourcer import get_ddgs_candidates

class TestDDGSImageSourcer(unittest.TestCase):
    @patch('services.ai_blogger.image_sourcer.DDGS')
    def test_ddgs_domain_deduplication(self, mock_ddgs_class):
        # Mock DDGS to return images from the same domain
        mock_ddgs_instance = MagicMock()
        mock_ddgs_class.return_value.__enter__.return_value = mock_ddgs_instance
        
        # Simulate DDGS returning 4 images, 3 of which are from gettyimages
        mock_ddgs_instance.images.return_value = [
            {"image": "https://media.gettyimages.com/photos/1.jpg", "url": "https://www.gettyimages.com/"},
            {"image": "https://media.gettyimages.com/photos/2.jpg", "url": "https://www.gettyimages.com/"},
            {"image": "https://media.gettyimages.com/photos/3.jpg", "url": "https://www.gettyimages.com/"},
            {"image": "https://vogue.com/photos/4.jpg", "url": "https://www.vogue.com/"}
        ]
        
        # Call the function, asking for 5 images
        # We also mock random.shuffle to keep the order predictable for testing
        with patch('random.shuffle', lambda x: x):
            with patch('random.choice', return_value=""):
                candidates = get_ddgs_candidates("Dior SS25", per_page=5)
        
        # Should only return 2 images because of domain deduplication
        self.assertEqual(len(candidates), 2)
        self.assertEqual(candidates[0], "https://media.gettyimages.com/photos/1.jpg")
        self.assertEqual(candidates[1], "https://vogue.com/photos/4.jpg")

if __name__ == '__main__':
    unittest.main()