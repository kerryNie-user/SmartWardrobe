import unittest
from unittest.mock import patch, MagicMock
from services.ai_blogger.image_sourcer import get_bing_candidates
import json

class TestBingImageSourcer(unittest.TestCase):
    @patch('requests.get')
    def test_bing_domain_deduplication(self, mock_get):
        # Mock requests.get to return fake HTML with m="{...}" tags
        mock_response = MagicMock()
        mock_response.status_code = 200
        
        # Simulate Bing returning 4 images, 3 of which are from gettyimages
        m1 = json.dumps({"murl": "https://media.gettyimages.com/photos/1.jpg", "purl": "https://www.gettyimages.com/"}).replace('"', '&quot;')
        m2 = json.dumps({"murl": "https://media.gettyimages.com/photos/2.jpg", "purl": "https://www.gettyimages.com/"}).replace('"', '&quot;')
        m3 = json.dumps({"murl": "https://media.gettyimages.com/photos/3.jpg", "purl": "https://www.gettyimages.com/"}).replace('"', '&quot;')
        m4 = json.dumps({"murl": "https://vogue.com/photos/4.jpg", "purl": "https://www.vogue.com/"}).replace('"', '&quot;')
        
        html_content = f'''
        <a class="iusc" m="{m1}"></a>
        <a class="iusc" m="{m2}"></a>
        <a class="iusc" m="{m3}"></a>
        <a class="iusc" m="{m4}"></a>
        '''
        mock_response.text = html_content
        mock_get.return_value = mock_response
        
        # We also mock random.shuffle to keep the order predictable for testing
        with patch('random.shuffle', lambda x: x):
            with patch('random.choice', lambda x: x[0] if x else ""):
                with patch('time.sleep', return_value=None):
                    candidates = get_bing_candidates("Dior SS25", per_page=5)
        
        print(f"Candidates: {candidates}")
        # Since we use fake random.choice for User-Agent it's picking the first one
        # Should only return 2 images because of domain deduplication
        self.assertEqual(len(candidates), 2)
        self.assertEqual(candidates[0], "https://media.gettyimages.com/photos/1.jpg")
        self.assertEqual(candidates[1], "https://vogue.com/photos/4.jpg")

if __name__ == '__main__':
    unittest.main()