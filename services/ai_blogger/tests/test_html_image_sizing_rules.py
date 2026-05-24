from services.ai_blogger.pipeline.html_renderer import load_html_template


def test_html_image_sizing_rules():
    html = load_html_template()
    assert "object-fit: cover" in html
