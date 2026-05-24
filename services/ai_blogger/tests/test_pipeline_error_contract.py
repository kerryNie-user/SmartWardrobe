import json
import os
import tempfile
from pathlib import Path

import pytest

from services.ai_blogger.run_pipeline import run_batch
from services.ai_blogger.pipeline.images import ImageTracker
from services.ai_blogger.pipeline.persistence import persist_content_posts
from services.backend.database import db
from services.backend.init_db import init_db
from services.backend.models import ContentPost


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


def test_run_batch_report_contains_errors_list_and_perceptual_counter(tmp_path):
    result = run_batch(
        {
            "count": 1,
            "download_images": False,
            "output_dir": str(tmp_path),
            "rng_seed": 0,
            "llm": "none",
            "locale": "en-US"
        }
    )

    report = json.loads(tmp_path.joinpath(result["report_json"]).read_text(encoding="utf-8"))
    assert "errors" in report
    assert isinstance(report["errors"], list)
    assert "images" in report
    assert "duplicate_perceptual" in report["images"]


def test_offline_batch_without_network_images_is_not_persisted(tmp_path):
    result = run_batch(
        {
            "count": 1,
            "download_images": False,
            "output_dir": str(tmp_path),
            "rng_seed": 0,
            "llm": "none",
            "locale": "zh-CN",
        }
    )

    report = json.loads(tmp_path.joinpath(result["report_json"]).read_text(encoding="utf-8"))

    assert ContentPost.select().count() == 0
    assert report["articles"][0]["status"] == "failed"
    assert report["articles"][0]["quality_report"]["missing_hero"] is True
    assert any(error.get("code") == "CONTENT_QUALITY_FAILED" for error in report["errors"])


def test_persistence_rejects_post_when_required_media_resolution_fails(tmp_path):
    tracker = ImageTracker(images_dir=str(tmp_path), max_images_total=0, download_images=True)
    post = {
        "title": "Missing required media",
        "quality_report": {
            "missing_hero": False,
            "missing_media": [],
            "forbidden_claims": [],
            "paragraph_too_long": [],
            "theme_drift": [],
            "quality_gate_status": "passed",
        },
        "paragraphs": [
            {
                "text": "short body",
                "layout_name": "hero_full_bleed",
                "image_queries": [{"search_keyword": "green jumpsuit"}],
            }
        ],
    }

    error = persist_content_posts(
        results=[(0, "Missing required media", post, None)],
        tracker=tracker,
        locale="zh-CN",
        ts="20260519000000",
    )

    assert error["code"] == "CONTENT_QUALITY_FAILED"
    assert error["details"]["failures"][0]["quality_report"]["missing_media"][0]["search_query"] == "green jumpsuit"
    assert post["quality_report"]["quality_gate_status"] == "failed"
    assert ContentPost.select().count() == 0
