from pathlib import Path

from services.ai_blogger.pipeline.html_renderer import build_report_articles_and_html
from services.ai_blogger.pipeline.images import ImageTracker as PipelineImageTracker
from services.ai_blogger.run_pipeline import ImageTracker, run_batch


ROOT = Path(__file__).resolve().parents[3]


def test_run_pipeline_keeps_public_entrypoints_compatible():
    assert callable(run_batch)
    assert ImageTracker is PipelineImageTracker


def test_run_pipeline_stays_as_thin_orchestrator():
    source = ROOT.joinpath("services/ai_blogger/run_pipeline.py").read_text(encoding="utf-8")

    assert "class ImageTracker" not in source
    assert "ThreadPoolExecutor" not in source
    assert "ContentPost.create" not in source
    assert "requests.Session" not in source


def test_ai_blogger_pipeline_modules_have_explicit_responsibilities():
    pipeline_dir = ROOT / "services" / "ai_blogger" / "pipeline"
    expected_modules = {
        "config.py",
        "topics.py",
        "generation.py",
        "images.py",
        "html_renderer.py",
        "persistence.py",
        "reporting.py",
    }

    assert expected_modules.issubset({path.name for path in pipeline_dir.glob("*.py")})


def test_quality_failed_post_is_not_rendered_as_deliverable_html(tmp_path):
    tracker = PipelineImageTracker(images_dir=str(tmp_path), max_images_total=0, download_images=False)
    post = {
        "title": "Bad post",
        "_quality_gate_failed": True,
        "quality_report": {
            "missing_hero": False,
            "missing_media": [{"paragraph_index": 0, "search_query": "bad image"}],
            "forbidden_claims": [{"paragraph_index": 0, "term": "OfficeRebel"}],
            "paragraph_too_long": [],
            "quality_gate_status": "failed",
        },
        "paragraphs": [{"text": "OfficeRebel", "layout_name": "hero_full_bleed", "image_queries": []}],
    }

    report_articles, html = build_report_articles_and_html([(0, "Bad post", post, None)], tracker)

    assert html == ""
    assert report_articles[0]["status"] == "failed"
    assert report_articles[0]["quality_report"]["missing_media"][0]["search_query"] == "bad image"
    assert report_articles[0]["quality_report"]["forbidden_claims"][0]["term"] == "OfficeRebel"


def test_missing_rendered_media_fails_quality_gate(tmp_path):
    tracker = PipelineImageTracker(images_dir=str(tmp_path), max_images_total=0, download_images=True)
    post = {
        "title": "Missing image post",
        "paragraphs": [
            {
                "text": "short body",
                "layout_name": "hero_full_bleed",
                "image_queries": [{"search_keyword": "green jumpsuit"}],
            }
        ],
    }

    report_articles, html = build_report_articles_and_html([(0, "Missing image post", post, None)], tracker)

    assert html == ""
    assert report_articles[0]["status"] == "failed"
    assert report_articles[0]["quality_report"]["missing_media"][0]["search_query"] == "green jumpsuit"
