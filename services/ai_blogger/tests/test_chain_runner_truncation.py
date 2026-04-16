import unittest
import json
from unittest.mock import patch, MagicMock
from services.ai_blogger.chain_runner import PromptChainRunner

class TestChainRunnerTruncation(unittest.TestCase):
    @patch('services.ai_blogger.llm_client.UniversalLLMClient')
    def test_llm_truncation_handling(self, mock_llm_client_class):
        mock_llm_client = MagicMock()
        mock_llm_client_class.return_value = mock_llm_client
        
        runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
        
        outline_input = {
            "angle_title": "Test Angle",
            "style_en": "street style",
            "paragraphs": [
                {"section_name": "P1", "layout_name": "hero_full_bleed"},
                {"section_name": "P2", "layout_name": "split_image_text"},
                {"section_name": "P3", "layout_name": "float_left_photo"}
            ]
        }
        
        mock_llm_client.generate_json.return_value = {
            "paragraphs": [
                {"section_name": "P1", "text": "Text 1", "image_queries": ["q1"]},
                {"section_name": "P2", "text": "Text 2", "image_queries": ["q2"]}
            ]
        }
        
        result = runner._call_llm(
            system_prompt="sys", 
            user_input=json.dumps(outline_input), 
            phase="3"
        )
        
        self.assertEqual(len(result["paragraphs"]), 2)
        self.assertEqual(result["paragraphs"][0]["text"], "Text 1")
        self.assertEqual(result["paragraphs"][1]["text"], "Text 2")
        
        self.assertEqual(mock_llm_client.generate_json.call_count, 2)

    @patch('services.ai_blogger.llm_client.UniversalLLMClient')
    def test_conclusion_section_enforcement(self, mock_llm_client_class):
        mock_llm_client = MagicMock()
        mock_llm_client_class.return_value = mock_llm_client
        
        runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
        
        # Mock phase 2 output where the last section is NOT "结语"
        outline_input = {
            "angle_title": "Test Angle",
            "style_en": "street style",
            "paragraphs": [
                {"section_name": "导语", "layout_name": "hero_full_bleed"},
                {"section_name": "深度解析", "layout_name": "split_image_text"},
                {"section_name": "总结", "layout_name": "float_left_photo"} # Note: "总结" instead of "结语"
            ]
        }
        
        mock_llm_client.generate_json.return_value = {
            "paragraphs": [
                {"section_name": "导语", "text": "Intro", "image_queries": []},
                {"section_name": "深度解析", "text": "Deep Dive", "image_queries": []},
                {"section_name": "总结", "text": "Final thoughts", "image_queries": []}
            ]
        }
        
        result = runner._call_llm(
            system_prompt="sys", 
            user_input=json.dumps(outline_input), 
            phase="3"
        )
        
        self.assertEqual(len(result["paragraphs"]), 3)
        # The last paragraph's section_name should be forced to "结语"
        self.assertEqual(result["paragraphs"][-1]["section_name"], "结语")

if __name__ == '__main__':
    unittest.main()
