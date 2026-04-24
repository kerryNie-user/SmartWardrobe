import unittest
import json
from unittest.mock import patch, MagicMock
from services.ai_blogger.chain_runner import PromptChainRunner

class TestProfileLoading(unittest.TestCase):
    def test_default_profile_loads_editorial_styling(self):
        runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
        
        # Verify the profile is loaded correctly
        self.assertIsNotNone(runner.profile)
        self.assertEqual(runner.profile["id"], "editorial_styling")
        
        # Verify prompt templates are interpolated with constraints
        outline_prompt = runner.prompts.get("phase2_outline", "")
        self.assertIn("严格要求必须是 **10** 个段落", outline_prompt)
        self.assertIn("\"穿搭实操\"", outline_prompt)
        self.assertIn("lookbook_cards_3", outline_prompt)

    def test_custom_profile_loads_fashion_news(self):
        runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents", profile_name="fashion_news")
        
        self.assertEqual(runner.profile["id"], "fashion_news")
        
        outline_prompt = runner.prompts.get("phase2_outline", "")
        self.assertIn("严格输出 **3到5** 个段落", outline_prompt)
        self.assertIn("\"事件还原\"", outline_prompt)
        self.assertNotIn("lookbook_cards_3", outline_prompt)

    def test_custom_profile_loads_aesthetic_essay(self):
        runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents", profile_name="aesthetic_essay")
        
        self.assertEqual(runner.profile["id"], "aesthetic_essay")
        
        outline_prompt = runner.prompts.get("phase2_outline", "")
        self.assertIn("**6到8** 个段落", outline_prompt)
        self.assertIn("\"概念溯源\"", outline_prompt)
        self.assertNotIn("lookbook_cards_3", outline_prompt)

if __name__ == '__main__':
    unittest.main()