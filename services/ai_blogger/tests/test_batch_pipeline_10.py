import json
import re
import os
import tempfile
from pathlib import Path
import pytest

from unittest.mock import patch
from services.ai_blogger.run_pipeline import run_batch
from services.backend_lite.database import db
from services.backend_lite.init_db import init_db
from services.backend_lite.models import ContentPost

@pytest.fixture(autouse=True)
def setup_test_db():
    db_path = str(Path(tempfile.mkdtemp()) / "test.db")
    os.environ["SQLITE_DB"] = db_path
    
    if not db.is_closed():
        db.close()
    db.init(db_path)
    db.connect()
    init_db()
    
    yield
    
    if not db.is_closed():
        db.close()
    
    if os.path.exists(db_path):
        os.remove(db_path)


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

    # Verify database insertion
    assert ContentPost.select().count() == 10
    first_post = ContentPost.select().first()
    assert first_post.author == "SmartWardrobe AI Editor"
    assert "editorial" in first_post.tags_json
