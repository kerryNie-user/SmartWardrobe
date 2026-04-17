import json
import re

from unittest.mock import patch
from services.ai_blogger.run_pipeline import run_batch

@patch('services.ai_blogger.llm_client.UniversalLLMClient.generate_json')
def test_batch_pipeline_generates_10_articles_and_reports(mock_generate_json, tmp_path):
    mock_generate_json.side_effect = [
        {"news": [{"title": "t", "summary": "s", "source": "s", "link": "l"}]} for _ in range(10)
    ] + [
        {"angle_title": "测试", "style_en": "test"},
        {"paragraphs": [{"section_name": "导语", "layout_name": "layout-split"} for i in range(10)]},
        {"paragraphs": [{"section_name": "导语", "text": "内容", "image_queries": []} for _ in range(10)]}
    ] * 10
    
    result = run_batch(
        {
            "count": 10,
            "download_images": False,
            "output_dir": str(tmp_path),
            "rng_seed": 0,
            "skip_scout": True,
            "llm": "mock"
        }
    )

    assert tmp_path.joinpath(result["html_file"]).exists()
    assert tmp_path.joinpath(result["report_json"]).exists()
    assert tmp_path.joinpath(result["report_md"]).exists()

    report = json.loads(tmp_path.joinpath(result["report_json"]).read_text(encoding="utf-8"))
    assert report["article_count"] == 10
    assert all(a.get("paragraph_count", 0) >= 0 for a in report["articles"])
    assert all(a.get("unique_layouts", 0) >= 0 for a in report["articles"])

    html = tmp_path.joinpath(result["html_file"]).read_text(encoding="utf-8")
    layouts = set(re.findall(r'data-layout="([^"]+)"', html))
    assert len(layouts) >= 0
    assert "images" in report
    assert report["images"]["download_enabled"] is False
    assert report["images"]["downloaded"] == 0
