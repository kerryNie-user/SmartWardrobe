import pytest
from services.ai_blogger.chain_runner import PromptChainRunner

def test_prompt_chain_loading():
    runner = PromptChainRunner(prompts_dir="services/ai_blogger_new/prompts")
    assert "phase1_angle" in runner.prompts
    assert "phase2_outline" in runner.prompts
    assert "phase3_drafting" in runner.prompts

    # Check if the core rules from blogger_experience are conceptually in the prompts
    assert "angle_title" in runner.prompts["phase1_angle"]
    assert "10" in runner.prompts["phase2_outline"]
    assert "image_queries" in runner.prompts["phase3_drafting"]

def test_prompt_chain_execution():
    runner = PromptChainRunner(prompts_dir="services/ai_blogger_new/prompts")
    result = runner.run_chain(raw_topic="极简风")
    
    # Verify the output structure as defined by the Prompt Chain
    assert "metadata" in result
    assert "title" in result
    assert "paragraphs" in result
    
    # Verify Phase 1 angle was preserved
    assert "angle_title" in result["metadata"]
    assert "极简风" in result["metadata"]["angle_title"]
    
    # Verify Phase 3 drafting output
    assert len(result["paragraphs"]) >= 10
    assert "image_queries" in result["paragraphs"][0]
    assert "layout_name" in result["paragraphs"][0]
    
    # Verify editorial tone (third-level vocabulary from toolkit)
    content_text = "".join(p["text"] for p in result["paragraphs"])
    assert "肌理" in content_text or "垂坠" in content_text or "生单宁" in content_text
    assert "呼吸感" in content_text or "空间感" in content_text
