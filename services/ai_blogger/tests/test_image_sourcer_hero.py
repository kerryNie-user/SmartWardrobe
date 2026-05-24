import unittest
from io import BytesIO
import os
from pathlib import Path
from unittest.mock import patch, MagicMock
from PIL import Image
from services.ai_blogger.image_sourcer import get_image_candidates, get_pexels_candidates_multi
from services.ai_blogger.pipeline.images import ImageTracker


def _fake_image_response(color=(40, 90, 140)):
    image = Image.new("RGB", (64, 64), color)
    payload = BytesIO()
    image.save(payload, format="JPEG")
    response = MagicMock()
    response.status_code = 200
    response.headers = {"Content-Type": "image/jpeg"}
    response.content = payload.getvalue()
    return response

class TestImageSourcerHeroPoster(unittest.TestCase):
    @patch('services.ai_blogger.image_sourcer.get_pexels_candidates')
    def test_pexels_multi_rotates_variants_before_reusing_one_photo_cluster(self, mock_pexels):
        base = "white shirt trousers woman fashion"

        def fake_pexels(query, per_page=5):
            if query == base:
                return [
                    "https://images.pexels.com/photos/7945664/pexels-photo-7945664.jpeg",
                    "https://images.pexels.com/photos/7945663/pexels-photo-7945663.jpeg",
                ]
            if "pants" in query:
                return ["https://images.pexels.com/photos/8682792/pexels-photo-8682792.jpeg"]
            if "blouse" in query:
                return ["https://images.pexels.com/photos/7621066/pexels-photo-7621066.jpeg"]
            return []

        mock_pexels.side_effect = fake_pexels

        candidates = get_pexels_candidates_multi(base, per_page=4)

        self.assertEqual(candidates[0], "https://images.pexels.com/photos/7945664/pexels-photo-7945664.jpeg")
        self.assertIn("https://images.pexels.com/photos/8682792/pexels-photo-8682792.jpeg", candidates[:3])
        self.assertIn("https://images.pexels.com/photos/7621066/pexels-photo-7621066.jpeg", candidates[:3])
        self.assertEqual(candidates[-1], "https://images.pexels.com/photos/7945663/pexels-photo-7945663.jpeg")

    @patch('services.ai_blogger.image_sourcer.get_pexels_candidates')
    @patch('services.ai_blogger.image_sourcer.get_image_from_met')
    @patch('services.ai_blogger.image_sourcer.get_bing_candidates')
    def test_force_ai_does_not_return_generated_sources(self, mock_bing, mock_met, mock_pexels):
        mock_met.return_value = "http://met.com/art.jpg"
        mock_pexels.return_value = ["http://pexels.com/photo.jpg"]
        mock_bing.return_value = ["http://bing.com/photo.jpg"]

        candidates = get_image_candidates(
            query="vintage dress",
            config={"image_size": "landscape_16_9"},
            per_page=3,
            force_ai=True
        )

        self.assertTrue(mock_met.called)
        self.assertTrue(mock_pexels.called)
        self.assertFalse(mock_bing.called)
        self.assertGreater(len(candidates), 0)
        self.assertTrue(all(cand["source_type"] in {"met", "pexels"} for cand in candidates))
        self.assertNotIn("trae_ai", {cand["source_type"] for cand in candidates})

    @patch.dict(os.environ, {}, clear=False)
    @patch('services.ai_blogger.image_sourcer.get_pexels_candidates')
    @patch('services.ai_blogger.image_sourcer.get_image_from_met')
    @patch('services.ai_blogger.image_sourcer.get_bing_candidates')
    def test_bing_fallback_is_opt_in(self, mock_bing, mock_met, mock_pexels):
        os.environ.pop("AI_BLOGGER_ENABLE_BING_FALLBACK", None)
        mock_pexels.return_value = []
        mock_met.return_value = None
        mock_bing.return_value = ["https://bing.example.com/photo.jpg"]

        candidates = get_image_candidates(
            query="white shirt trousers woman fashion",
            config={"image_size": "portrait_4_3"},
            per_page=3,
        )

        self.assertEqual(candidates, [])
        self.assertFalse(mock_bing.called)

    @patch.dict(os.environ, {"AI_BLOGGER_ENABLE_BING_FALLBACK": "true"})
    @patch('services.ai_blogger.image_sourcer.get_pexels_candidates')
    @patch('services.ai_blogger.image_sourcer.get_image_from_met')
    @patch('services.ai_blogger.image_sourcer.get_bing_candidates')
    def test_bing_fallback_can_be_enabled_explicitly(self, mock_bing, mock_met, mock_pexels):
        mock_pexels.return_value = []
        mock_met.return_value = None
        mock_bing.return_value = ["https://bing.example.com/photo.jpg"]

        candidates = get_image_candidates(
            query="white shirt trousers woman fashion",
            config={"image_size": "portrait_4_3"},
            per_page=3,
        )

        self.assertEqual(candidates[0]["source_type"], "bing")
        self.assertEqual(candidates[0]["original_url"], "https://bing.example.com/photo.jpg")
        self.assertTrue(mock_bing.called)

    @patch('services.ai_blogger.pipeline.images.get_image_candidates')
    def test_image_tracker_uses_network_candidates(self, mock_get_candidates):
        mock_get_candidates.return_value = [
            {
                'source_type': 'bing',
                'original_url': 'https://example.com/fashion.jpg',
                'search_query': 'oversized blazer'
            }
        ]

        tracker = ImageTracker(images_dir="", max_images_total=1, download_images=True)
        with patch.object(tracker.session, 'get', return_value=_fake_image_response()) as mock_session_get:
            url, alt = tracker._resolve_media(
                {'search_keyword': 'oversized blazer', 'image_alt': 'Oversized blazer'},
                idx=0,
                p_idx=0,
                layout_name='hero_full_bleed'
            )

        self.assertTrue(mock_session_get.called)
        self.assertEqual(url, 'https://example.com/fashion.jpg')
        self.assertEqual(alt, 'Oversized blazer')
        self.assertEqual(tracker.image_details[0]['source_type'], 'bing')
        self.assertEqual(tracker.image_details[0]['original_url'], 'https://example.com/fashion.jpg')

    @patch('services.ai_blogger.pipeline.images.get_image_candidates')
    def test_image_tracker_skips_generated_candidates(self, mock_get_candidates):
        mock_get_candidates.return_value = [
            {
                'source_type': 'trae_ai',
                'original_url': 'https://generated.example.com/image.jpg',
                'search_query': 'green sleeveless jumpsuit waist tailoring',
            },
            {
                'source_type': 'pexels',
                'original_url': 'https://example.com/fashion-two.jpg',
                'search_query': 'green sleeveless jumpsuit waist tailoring',
            },
        ]

        tracker = ImageTracker(images_dir="", max_images_total=1, download_images=True)
        with patch.object(tracker.session, 'get', side_effect=lambda url, *args, **kwargs: _fake_image_response()) as mock_session_get:
            url, alt = tracker._resolve_media(
                {'search_keyword': 'green sleeveless jumpsuit waist tailoring', 'image_alt': 'Green sleeveless jumpsuit', 'image_caption': '中文图注'},
                idx=0,
                p_idx=0,
                layout_name='hero_full_bleed'
            )

        self.assertEqual(url, 'https://example.com/fashion-two.jpg')
        self.assertEqual(alt, 'Green sleeveless jumpsuit')
        self.assertEqual(tracker.image_details[0]['source_type'], 'pexels')
        self.assertEqual(tracker.image_details[0]['original_url'], 'https://example.com/fashion-two.jpg')
        self.assertEqual(mock_session_get.call_count, 1)

    @patch('services.ai_blogger.pipeline.images.get_image_candidates')
    def test_image_tracker_rotates_network_sources_within_one_article(self, mock_get_candidates):
        mock_get_candidates.return_value = [
            {
                'source_type': 'bing',
                'original_url': 'https://example.com/first.jpg',
                'search_query': 'green sleeveless jumpsuit waist tailoring',
            },
            {
                'source_type': 'pexels',
                'original_url': 'https://example.com/second.jpg',
                'search_query': 'green sleeveless jumpsuit waist tailoring',
            },
        ]

        tracker = ImageTracker(images_dir="", max_images_total=2, download_images=True)
        tracker.enable_perceptual_dedupe = False

        def fake_fetch(url, *args, **kwargs):
            if 'first.jpg' in url:
                return _fake_image_response((40, 90, 140))
            return _fake_image_response((180, 120, 70))

        with patch.object(tracker.session, 'get', side_effect=fake_fetch):
            first_url, _ = tracker._resolve_media(
                {'search_keyword': 'green sleeveless jumpsuit waist tailoring', 'image_alt': 'Green sleeveless jumpsuit', 'image_caption': '中文图注'},
                idx=0,
                p_idx=0,
                layout_name='hero_full_bleed',
            )
            second_url, _ = tracker._resolve_media(
                {'search_keyword': 'green sleeveless jumpsuit waist tailoring', 'image_alt': 'Green sleeveless jumpsuit', 'image_caption': '中文图注'},
                idx=0,
                p_idx=1,
                layout_name='split_image_left',
            )

        self.assertEqual(first_url, 'https://example.com/first.jpg')
        self.assertEqual(second_url, 'https://example.com/second.jpg')
        self.assertNotEqual(first_url, second_url)
        self.assertEqual(len(tracker.image_details), 2)
        self.assertNotEqual(tracker.image_details[0]['original_url'], tracker.image_details[1]['original_url'])
        self.assertEqual(tracker.image_details[0]['source_type'], 'bing')
        self.assertEqual(tracker.image_details[1]['source_type'], 'pexels')

    @patch('services.ai_blogger.pipeline.images.get_image_candidates')
    def test_network_rotation_does_not_escape_candidate_set(self, mock_get_candidates):
        mock_get_candidates.return_value = [
            {
                'source_type': 'bing',
                'original_url': 'https://example.com/first.jpg',
                'search_query': 'green sleeveless jumpsuit waist tailoring',
            },
            {
                'source_type': 'pexels',
                'original_url': 'https://example.com/second.jpg',
                'search_query': 'green sleeveless jumpsuit waist tailoring',
            },
        ]

        tracker = ImageTracker(images_dir="", max_images_total=3, download_images=True)
        tracker.enable_perceptual_dedupe = False

        def fake_fetch(url, *args, **kwargs):
            if 'first.jpg' in url:
                return _fake_image_response((40, 90, 140))
            return _fake_image_response((180, 120, 70))

        with patch.object(tracker.session, 'get', side_effect=fake_fetch):
            for p_idx in range(3):
                result = tracker._resolve_media(
                    {'search_keyword': 'green sleeveless jumpsuit waist tailoring', 'image_alt': 'Green sleeveless jumpsuit'},
                    idx=0,
                    p_idx=p_idx,
                    layout_name='split_image_left',
                )
                if p_idx < 2:
                    self.assertIn(result[0], {'https://example.com/first.jpg', 'https://example.com/second.jpg'})
                else:
                    self.assertEqual(result[0], '')

        original_names = {Path(detail['original_url']).stem for detail in tracker.image_details}
        self.assertEqual(len(tracker.image_details), 2)
        self.assertTrue(original_names.issubset({'first', 'second'}))
        self.assertIn('first', original_names)
        self.assertGreaterEqual(tracker.failed_images, 1)

if __name__ == '__main__':
    unittest.main()
