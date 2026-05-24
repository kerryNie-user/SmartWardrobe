from services.ai_blogger.pipeline.html_renderer import render_post_html
from services.ai_blogger.pipeline.images import ImageTracker


def test_no_duplicate_section_heading(tmp_path):
    tracker = ImageTracker(images_dir=str(tmp_path), max_images_total=0, download_images=False)
    html = render_post_html(
        idx=0,
        title="测试文章",
        post={
            "title": "测试文章",
            "paragraphs": [
                {
                    "section_name": "深度解析",
                    "text": "【深度解析】这段正文不应该重复显示章节名。",
                    "layout_name": "tip_box_rules",
                }
            ],
        },
        tracker=tracker,
        include_divider=False,
    )
    assert "<strong>深度解析</strong> - 【深度解析】" not in html
    assert "<strong>深度解析</strong> - 这段正文不应该重复显示章节名。" in html
