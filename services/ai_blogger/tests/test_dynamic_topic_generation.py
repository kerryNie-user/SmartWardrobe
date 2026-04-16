import unittest
from unittest.mock import patch, MagicMock
from services.ai_blogger.run_pipeline import run_batch

class TestDynamicTopicGeneration(unittest.TestCase):
    @patch('services.ai_blogger.run_pipeline.UniversalLLMClient')
    @patch('services.ai_blogger.run_pipeline.TopicSourcer')
    def test_topic_prompt_contains_profile_info(self, mock_sourcer_class, mock_llm_client_class):
        # Setup Mock LLM Client
        mock_llm_instance = MagicMock()
        mock_llm_client_class.return_value = mock_llm_instance
        # Mock generate_json to return a valid dummy title so it doesn't fail
        mock_llm_instance.generate_json.return_value = {"titles": ["Test Fashion News"]}

        # Run pipeline with fashion_news profile
        config = {
            "count": 1,
            "profile": "fashion_news",
            "download_images": False,
            "output_dir": "test_output",
            "rng_seed": 0
        }
        
        # In run_pipeline, it should call llm_client.generate_json(system_prompt, user_prompt)
        run_batch(config)
        
        # Verify the call was made
        self.assertTrue(mock_llm_instance.generate_json.called)
        
        # Get the arguments passed to generate_json
        args, kwargs = mock_llm_instance.generate_json.call_args
        system_prompt = args[0]
        user_prompt = args[1]
        
        # Verify the user_prompt contains the profile name and visual strategy
        # Expecting "时尚新闻与趋势解读" and its visual strategy (e.g., runway, SS25)
        self.assertIn("时尚新闻与趋势解读", user_prompt, "Profile name not injected into topic generation prompt")
        self.assertIn("runway", user_prompt, "Visual strategy not injected into topic generation prompt")

if __name__ == '__main__':
    unittest.main()