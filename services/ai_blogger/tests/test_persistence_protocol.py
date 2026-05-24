from services.ai_blogger.pipeline.persistence import _protocol_paragraphs


def test_protocol_paragraphs_keep_captions_without_section_label_prefix():
    paragraphs = [
        {
            "section_name": "导语",
            "text": "这段正文不应再被拼接模块标签。",
            "layout_name": "image_mosaic_3",
        }
    ]

    protocol = _protocol_paragraphs(
        paragraphs,
        {0: ["https://example.com/a.jpg"]},
        {0: ["Alt text"]},
        {0: ["中文图注"]},
    )

    assert protocol[0]["text"] == "这段正文不应再被拼接模块标签。"
    assert protocol[0]["image_captions"] == ["中文图注"]
