from pathlib import Path
from io import BytesIO
from unittest.mock import MagicMock, patch

from PIL import Image

from services.ai_blogger.pipeline.html_renderer import render_post_html
from services.ai_blogger.pipeline.images import ImageTracker


ROOT = Path(__file__).resolve().parents[3]
AGENTS_DIR = ROOT / "services" / "ai_blogger" / "agents"


def test_prompt_chain_contains_smartwardrobe_contract_terms():
    topic_prompt = AGENTS_DIR.joinpath("@agent_topic_generator.md").read_text(encoding="utf-8")
    angle_prompt = AGENTS_DIR.joinpath("@agent_angle_editor.md").read_text(encoding="utf-8")
    outline_prompt = AGENTS_DIR.joinpath("@agent_outline_planner.md").read_text(encoding="utf-8")
    draft_prompt = AGENTS_DIR.joinpath("@agent_draft_writer.md").read_text(encoding="utf-8")

    assert "Bing / Pexels" in topic_prompt
    assert "网络图库 API" in topic_prompt
    assert "图库中高概率存在的大类造型" in topic_prompt
    assert "一个标题只能有一个主造型锚点" in topic_prompt
    assert "标题禁止出现精确数字" in topic_prompt
    assert "话题标签" in topic_prompt
    assert "SmartWardrobe" in angle_prompt
    assert "reader_promise" in angle_prompt
    assert "editorial_lens" in angle_prompt
    assert "visual_anchor" in angle_prompt
    assert "primary_outfit" in angle_prompt
    assert "图库可稳定搜索" in angle_prompt
    assert "wardrobe_action" not in angle_prompt
    assert "reader_job" in outline_prompt
    assert "evidence_type" in outline_prompt
    assert "image_alt" in draft_prompt
    assert "主题一致性" in draft_prompt
    assert "图片和正文一致" in draft_prompt
    assert "80-140" in draft_prompt
    assert "2025-2026" in draft_prompt
    assert "趋势观察" in draft_prompt
    assert "衣橱延续" in draft_prompt
    assert "可见服装" in draft_prompt
    assert "涩谷" in draft_prompt
    assert "2026 钩子" in draft_prompt
    assert "Bing / Pexels / 其他网络图库 API" in draft_prompt
    assert "禁止使用本地资产或生成图" in draft_prompt
    assert "不要输出 HTML 标签" in draft_prompt


def test_html_renderer_escapes_model_generated_text(tmp_path):
    tracker = ImageTracker(images_dir=str(tmp_path), max_images_total=0, download_images=False)
    html = render_post_html(
        idx=0,
        title="Fallback",
        post={
            "title": "Title <script>alert(1)</script>",
            "paragraphs": [
                {
                    "section_name": "导语<script>",
                    "text": "Text <img src=x onerror=alert(1)>",
                    "layout_name": "hero_full_bleed",
                    "image_queries": [],
                },
                {
                    "section_name": "清单",
                    "text": "- Check <shoulder>\n- Keep & reuse",
                    "layout_name": "list_bullets",
                    "image_queries": [],
                },
            ],
        },
        tracker=tracker,
        include_divider=False,
    )

    assert "<script>" not in html
    assert "<img src=x" not in html
    assert "Title &lt;script&gt;alert(1)&lt;/script&gt;" in html
    assert "<li>Check &lt;shoulder&gt;</li>" in html
    assert "<li>Keep &amp; reuse</li>" in html


def test_image_tracker_prefers_contextual_alt_text(tmp_path):
    tracker = ImageTracker(images_dir=str(tmp_path), max_images_total=0, download_images=False)
    url, alt = tracker._resolve_media(
        {
            "search_keyword": "boxy blazer",
            "image_caption": "Longer caption",
            "image_alt": "A boxy blazer balancing wide trousers & loafers",
        },
        idx=0,
        p_idx=0,
        layout_name="hero_full_bleed",
    )

    assert url == ""
    assert alt == "A boxy blazer balancing wide trousers & loafers"
    assert alt != "Longer caption"


def _fake_image_response():
    image = Image.new("RGB", (64, 64), (32, 64, 96))
    payload = BytesIO()
    image.save(payload, format="JPEG")
    response = MagicMock()
    response.status_code = 200
    response.headers = {"Content-Type": "image/jpeg"}
    response.content = payload.getvalue()
    return response


@patch("services.ai_blogger.pipeline.images.get_image_candidates")
def test_image_tracker_uses_network_candidate_without_local_assets(mock_get_candidates, tmp_path):
    tracker = ImageTracker(images_dir=str(tmp_path), max_images_total=1, download_images=True)
    mock_get_candidates.return_value = [
        {
            "source_type": "bing",
            "original_url": "https://example.com/fashion.jpg",
            "search_query": "leather fabric texture",
        }
    ]

    with patch.object(tracker.session, "get", return_value=_fake_image_response()) as mock_session_get:
        url, alt = tracker._resolve_media(
            {
                "search_keyword": "leather fabric texture",
                "image_alt": "A fictitious luxury trench story",
                "image_caption": "A made-up brand case",
            },
            idx=0,
            p_idx=0,
            layout_name="hero_full_bleed",
        )

    assert url == "https://example.com/fashion.jpg"
    assert alt == "A fictitious luxury trench story"
    assert tracker.image_details[0]["source_type"] == "bing"
    assert tracker.image_details[0]["original_url"] == "https://example.com/fashion.jpg"
    assert mock_session_get.called


@patch("services.ai_blogger.pipeline.images.get_image_candidates")
def test_image_tracker_skips_generated_candidates_even_if_returned(mock_get_candidates, tmp_path):
    tracker = ImageTracker(images_dir=str(tmp_path), max_images_total=1, download_images=True)
    mock_get_candidates.return_value = [
        {
            "source_type": "trae_ai",
            "original_url": "https://generated.example.com/image.jpg",
            "search_query": "boxy blazer",
        },
        {
            "source_type": "bing",
            "original_url": "https://example.com/fashion.jpg",
            "search_query": "boxy blazer",
        },
    ]

    def fake_fetch(url, *args, **kwargs):
        assert "generated.example.com" not in url
        return _fake_image_response()

    with patch.object(tracker.session, "get", side_effect=fake_fetch) as mock_session_get:
        url, alt = tracker._resolve_media(
            {
                "search_keyword": "boxy blazer",
                "image_alt": "Boxy blazer",
                "image_caption": "A boxy blazer balancing wide trousers",
            },
            idx=0,
            p_idx=0,
            layout_name="hero_full_bleed",
        )

    assert url == "https://example.com/fashion.jpg"
    assert alt == "Boxy blazer"
    assert tracker.image_details[0]["source_type"] == "bing"
    assert len(tracker.image_details) == 1
    assert mock_session_get.call_count == 1


def test_media_block_does_not_render_text_placeholder_for_missing_image(tmp_path):
    tracker = ImageTracker(images_dir=str(tmp_path), max_images_total=0, download_images=True)

    html = tracker.render_media_block(
        {
            "search_keyword": "silver sequin evening gown",
            "image_alt": "silver sequin evening gown",
        },
        idx=0,
        p_idx=0,
        layout_name="hero_full_bleed",
    )

    assert html == ""
    assert tracker.missing_image_details[0]["search_query"] == "silver sequin evening gown"


def test_trae_pending_placeholder_is_rejected(tmp_path):
    tracker = ImageTracker(images_dir=str(tmp_path), max_images_total=1, download_images=True)
    image = Image.new("RGB", (1832, 1832), (232, 233, 236))
    payload = BytesIO()
    image.save(payload, format="JPEG")

    assert tracker._looks_like_pending_ai_placeholder(payload.getvalue(), "trae_ai")
    assert not tracker._looks_like_pending_ai_placeholder(payload.getvalue(), "pexels")
