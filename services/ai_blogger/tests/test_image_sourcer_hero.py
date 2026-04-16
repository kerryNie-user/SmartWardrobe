import unittest
from unittest.mock import patch, MagicMock
from services.ai_blogger.image_sourcer import get_image_candidates

class TestImageSourcerHeroPoster(unittest.TestCase):
    @patch('services.ai_blogger.image_sourcer.get_pexels_candidates')
    @patch('services.ai_blogger.image_sourcer.get_image_from_met')
    def test_force_ai_skips_real_sources(self, mock_met, mock_pexels):
        # Setup mocks to return valid data if they were called
        mock_met.return_value = "http://met.com/art.jpg"
        mock_pexels.return_value = ["http://pexels.com/photo.jpg"]
        
        # Call with force_ai=True
        candidates = get_image_candidates(
            query="vintage dress",
            config={"image_size": "landscape_16_9"},
            per_page=3,
            force_ai=True
        )
        
        # Verify that real sources were NOT called
        self.assertFalse(mock_met.called, "Met API should not be called when force_ai is True")
        self.assertFalse(mock_pexels.called, "Pexels API should not be called when force_ai is True")
        
        # Verify that we still got candidates (from AI fallback)
        self.assertGreater(len(candidates), 0, "Should return AI generated candidates")
        
        # Verify that ALL candidates are from trae_ai and have the correct image_size
        for cand in candidates:
            self.assertEqual(cand["source_type"], "trae_ai")
            self.assertIn("image_size=landscape_16_9", cand["original_url"])

if __name__ == '__main__':
    unittest.main()