from services.ai_blogger.pipeline.html_renderer import render_post_html
from services.ai_blogger.pipeline.images import ImageTracker


def test_html_layout_rendering_classes(tmp_path):
    tracker = ImageTracker(images_dir=str(tmp_path), max_images_total=0, download_images=False)

    html = render_post_html(
        idx=0,
        title="测试",
        post={
            "title": "测试",
            "paragraphs": [
                {
                    "section_name": "导语",
                    "layout_name": "split_image_left",
                    "text": "内容",
                    "image_urls": ["https://example.com/fashion.jpg"],
                    "image_alts": ["Fashion image"],
                }
            ],
        },
        tracker=tracker,
        include_divider=False,
    )

    assert 'data-layout="split_image_left"' in html
    assert 'class="layout-split"' in html
    assert 'src="https://example.com/fashion.jpg"' in html
