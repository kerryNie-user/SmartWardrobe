from services.ai_blogger.protocol.normalize_ai_post import normalize_ai_post_v1


def test_gallery_layout_is_preserved_with_captions():
    ai = normalize_ai_post_v1(
        title="T",
        locale="zh-CN",
        hero_image_url="",
        tags=["editorial"],
        paragraphs=[
            {
                "layout_name": "image_mosaic_3",
                "text": "段落文字",
                "image_urls": ["https://example.com/a.jpg", "https://example.com/b.jpg", "https://example.com/c.jpg"],
                "image_alts": ["A", "B", "C"],
                "image_captions": ["图注A", "图注B", "图注C"],
            }
        ],
    )
    layouts = [p["layout"] for p in ai["paragraphs"]]
    assert layouts == ["gallery_3"]
    assert ai["paragraphs"][0]["image_urls"] == ["https://example.com/a.jpg", "https://example.com/b.jpg", "https://example.com/c.jpg"]
    assert ai["paragraphs"][0]["image_captions"] == ["图注A", "图注B", "图注C"]
    assert ai["hero"]["image_url"] == "https://example.com/a.jpg"
    assert ai["hero"]["caption"] == "图注A"


def test_dedupe_images_across_blocks():
    ai = normalize_ai_post_v1(
        title="T",
        locale="en-US",
        hero_image_url="",
        tags=["editorial"],
        paragraphs=[
            {
                "layout_name": "lookbook_cards_3",
                "text": "First",
                "image_urls": ["https://example.com/a.jpg", "https://example.com/a.jpg", "https://example.com/b.jpg"],
                "image_alts": ["A", "A2", "B"],
                "image_captions": ["Caption A", "Caption A2", "Caption B"],
            },
            {
                "layout_name": "text_dense",
                "text": "Second",
                "image_urls": ["https://example.com/b.jpg"],
                "image_alts": ["B2"],
                "image_captions": ["Caption B2"],
            },
        ],
    )
    urls = [url for p in ai["paragraphs"] for url in p.get("image_urls", [])]
    assert urls == ["https://example.com/a.jpg", "https://example.com/b.jpg"]
