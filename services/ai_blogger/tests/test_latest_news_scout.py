from unittest.mock import MagicMock, patch

from services.ai_blogger.run_pipeline import run_batch


@patch("services.ai_blogger.run_pipeline.UniversalLLMClient")
def test_fashion_news_uses_llm_search_for_seed_material(mock_llm_client_class, tmp_path):
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
        "output_dir": str(tmp_path),
        "max_images_total": 0,
        "rng_seed": 0,
    }

    run_batch(config)

    assert mock_llm.generate_json.called
    args, kwargs = mock_llm.generate_json.call_args
    assert "enable_search" in kwargs
    assert kwargs["enable_search"]
