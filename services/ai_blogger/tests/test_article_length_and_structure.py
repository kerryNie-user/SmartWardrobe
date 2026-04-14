from services.ai_blogger.chain_runner import PromptChainRunner


def test_article_has_min_10_paragraphs_and_sections():
    runner = PromptChainRunner(prompts_dir="services/ai_blogger_new/prompts")
    result = runner.run_chain(raw_topic="测试选题", llm_provider="mock")

    paragraphs = result.get("paragraphs", [])
    assert len(paragraphs) >= 10

    section_names = [p.get("section_name") for p in paragraphs]
    required = {"导语", "深度解析", "穿搭实操", "穿搭误区", "结语"}
    assert required.issubset(set(section_names))


def test_each_paragraph_has_min_length_and_layout_contract():
    runner = PromptChainRunner(prompts_dir="services/ai_blogger_new/prompts")
    result = runner.run_chain(raw_topic="测试选题", llm_provider="mock")

    for p in result.get("paragraphs", []):
        assert isinstance(p.get("text"), str)
        assert len(p["text"]) >= 200
        assert isinstance(p.get("layout_name"), str)
        assert isinstance(p.get("image_queries"), list)

