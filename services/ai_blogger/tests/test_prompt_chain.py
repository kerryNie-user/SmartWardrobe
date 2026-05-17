import pytest
from services.ai_blogger.chain_runner import PromptChainRunner

def test_prompt_chain_loading():
    runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
    assert "phase1_angle" in runner.prompts
    assert "phase2_outline" in runner.prompts
    assert "phase3_drafting" in runner.prompts

    # Check if the core rules from blogger_experience are conceptually in the prompts
    assert "angle_title" in runner.prompts["phase1_angle"]
    assert "10" in runner.prompts["phase2_outline"]
    assert "image_queries" in runner.prompts["phase3_drafting"]

from unittest.mock import patch, MagicMock

@patch('services.ai_blogger.llm_client.UniversalLLMClient.generate_json')
def test_prompt_chain_execution(mock_generate_json):
    # Mock LLM responses to avoid real API calls and 401 errors
    mock_generate_json.side_effect = [
        {"angle_title": "极简主义重塑", "style_en": "minimalist"}, # phase 1
        {"paragraphs": [{"section_name": "导语", "layout_name": "hero_full_bleed"}]}, # phase 2
        {"paragraphs": [{"section_name": "导语", "text": "内容", "image_queries": []}]} # phase 3
    ]
    
    runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
    result = runner.run_chain(raw_topic="极简风")
    assert result["title"] == "极简主义重塑"
    assert len(result["paragraphs"]) == 1
    assert len(result["paragraphs"][0].get("image_queries") or []) >= 1
