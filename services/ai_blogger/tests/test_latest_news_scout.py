import unittest
from unittest.mock import MagicMock, patch

from services.ai_blogger.run_pipeline import run_batch


class TestLatestNewsScout(unittest.TestCase):
    @patch("services.ai_blogger.run_pipeline.UniversalLLMClient")
    def test_fashion_news_uses_llm_search_for_seed_material(self, mock_llm_client_class):
        mock_llm = MagicMock()
        mock_llm_client_class.return_value = mock_llm
        mock_llm.generate_json.return_value = {
            "news": [
                {
                    "title": "测试新闻标题",
                    "summary": "测试新闻摘要，包含品牌、人物、地点与系列名。",
                    "source": "TestSource",
                    "link": "https://example.com/news",
                    "published_at": "2026-04-16",
                }
            ]
        }

        config = {
            "count": 1,
            "profile": "fashion_news",
            "download_images": False,
            "output_dir": "services/ai_blogger/output_test",
            "max_images_total": 0,
            "rng_seed": 0,
        }

        run_batch(config)

        self.assertTrue(mock_llm.generate_json.called)
        args, kwargs = mock_llm.generate_json.call_args
        self.assertIn("enable_search", kwargs)
        self.assertTrue(kwargs["enable_search"])


if __name__ == "__main__":
    unittest.main()

