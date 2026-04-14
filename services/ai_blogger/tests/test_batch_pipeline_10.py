import json
import re

from services.ai_blogger.run_pipeline import run_batch


def test_batch_pipeline_generates_10_articles_and_reports(tmp_path):
    result = run_batch(
        {
            "count": 10,
            "llm_provider": "mock",
            "download_images": False,
            "output_dir": str(tmp_path),
            "rng_seed": 0
        }
    )

    assert tmp_path.joinpath(result["html_file"]).exists()
    assert tmp_path.joinpath(result["report_json"]).exists()
    assert tmp_path.joinpath(result["report_md"]).exists()

    report = json.loads(tmp_path.joinpath(result["report_json"]).read_text(encoding="utf-8"))
    assert report["article_count"] == 10
    assert all(a["paragraph_count"] >= 10 for a in report["articles"])
    assert all(a["unique_layouts"] >= 6 for a in report["articles"])

    html = tmp_path.joinpath(result["html_file"]).read_text(encoding="utf-8")
    layouts = set(re.findall(r'data-layout="([^"]+)"', html))
    assert len(layouts) >= 6
    assert "images" in report
    assert report["images"]["download_enabled"] is False
    assert report["images"]["downloaded"] == 0
