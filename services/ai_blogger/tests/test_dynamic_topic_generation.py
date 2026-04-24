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
            "rng_seed": 0,
            "llm": "mock",
            "skip_scout": True  # Assuming we can mock skip_scout, or just test general topic generation
        }
        
        # In run_pipeline, it should call llm_client.generate_json(system_prompt, user_prompt)
        run_batch(config)
        
        # Verify the call was made
        self.assertTrue(mock_llm_instance.generate_json.called)
        
        # Get the arguments passed to generate_json
        # Since run_batch now calls news scout first, we need to inspect the calls
        calls = mock_llm_instance.generate_json.call_args_list
        found_topic_gen = False
        for call in calls:
            args, kwargs = call
            system_prompt = args[0]
            user_prompt = args[1]
            if "时尚新闻" in user_prompt or "profile" in user_prompt.lower():
                found_topic_gen = True
                self.assertTrue("runway" in user_prompt or "时尚" in user_prompt, "Visual strategy not injected into topic generation prompt")
                break
                
        self.assertTrue(found_topic_gen, "Profile name not injected into topic generation prompt")

if __name__ == '__main__':
    unittest.main()