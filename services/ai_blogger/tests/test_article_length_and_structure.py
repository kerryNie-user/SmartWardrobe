from services.ai_blogger.chain_runner import PromptChainRunner


from unittest.mock import patch

@patch('services.ai_blogger.llm_client.UniversalLLMClient.generate_json')
def test_article_has_min_10_paragraphs_and_sections(mock_generate_json):
    # Setup mock to return a 10 paragraph structure with all required sections
    mock_generate_json.side_effect = [
        {"angle_title": "测试", "style_en": "test"},
        {"paragraphs": [
            {"section_name": "导语", "layout_name": "hero_full_bleed"},
            {"section_name": "深度解析", "layout_name": "layout-split"},
            {"section_name": "深度解析", "layout_name": "layout-split"},
            {"section_name": "深度解析", "layout_name": "layout-split"},
            {"section_name": "穿搭实操", "layout_name": "layout-split"},
            {"section_name": "穿搭实操", "layout_name": "layout-split"},
            {"section_name": "穿搭实操", "layout_name": "layout-split"},
            {"section_name": "穿搭误区", "layout_name": "layout-split"},
            {"section_name": "穿搭误区", "layout_name": "layout-split"},
            {"section_name": "结语", "layout_name": "layout-split"}
        ]},
        {"paragraphs": [
            {"section_name": "导语", "text": "A" * 200, "image_queries": []},
            {"section_name": "深度解析", "text": "A" * 200, "image_queries": []},
            {"section_name": "深度解析", "text": "A" * 200, "image_queries": []},
            {"section_name": "深度解析", "text": "A" * 200, "image_queries": []},
            {"section_name": "穿搭实操", "text": "A" * 200, "image_queries": []},
            {"section_name": "穿搭实操", "text": "A" * 200, "image_queries": []},
            {"section_name": "穿搭实操", "text": "A" * 200, "image_queries": []},
            {"section_name": "穿搭误区", "text": "A" * 200, "image_queries": []},
            {"section_name": "穿搭误区", "text": "A" * 200, "image_queries": []},
            {"section_name": "结语", "text": "A" * 200, "image_queries": []}
        ]}
    ]
    
    runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
    result = runner.run_chain(raw_topic="测试选题")

    paragraphs = result.get("paragraphs", [])
    assert len(paragraphs) >= 10

    section_names = [p.get("section_name") for p in paragraphs]
    required = {"导语", "深度解析", "穿搭实操", "穿搭误区", "结语"}
    assert required.issubset(set(section_names))
    assert all(len(p.get("image_queries") or []) >= 1 for p in paragraphs)


@patch('services.ai_blogger.llm_client.UniversalLLMClient.generate_json')
def test_each_paragraph_has_min_length_and_layout_contract(mock_generate_json):
    mock_generate_json.side_effect = [
        {"angle_title": "测试", "style_en": "test"},
        {"paragraphs": [
            {"section_name": "导语", "layout_name": "hero_full_bleed"},
        ]},
        {"paragraphs": [
            {"section_name": "导语", "text": "A" * 200, "image_queries": [{"search_keyword": "test"}]},
        ]}
    ]
    runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
    result = runner.run_chain(raw_topic="测试选题")

    for p in result.get("paragraphs", []):
        assert isinstance(p.get("text"), str)
        assert len(p["text"]) >= 200
        assert isinstance(p.get("layout_name"), str)
        assert isinstance(p.get("image_queries"), list)
