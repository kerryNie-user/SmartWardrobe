import os
import pytest
from services.ai_blogger.chain_runner import PromptChainRunner

@pytest.mark.skipif(not os.getenv("LLM_API_KEY"), reason="Requires LLM_API_KEY")
def test_real_llm_chain_integration():
    runner = PromptChainRunner()
    topic = "测试：秋冬羊绒大衣的极简穿搭"
    
    # We expect 'deepseek' provider to connect to API
    # Since this uses real credits, we only run it when explicitly asked.
    result = runner.run_chain(topic, llm_provider="deepseek")
    
    assert "metadata" in result
    assert "paragraphs" in result
    
    paragraphs = result["paragraphs"]
    assert len(paragraphs) > 0
    assert "layout_name" in paragraphs[0]
    assert "text" in paragraphs[0]
