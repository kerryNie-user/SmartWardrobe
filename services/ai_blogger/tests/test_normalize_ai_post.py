from services.ai_blogger.protocol.normalize_ai_post import normalize_ai_post_v1


def test_gallery_layout_expands_into_alternating_splits():
    ai = normalize_ai_post_v1(
        title="T",
        locale="zh-CN",
        hero_image_url="",
        tags=["editorial"],
        paragraphs=[
            {
                "layout_name": "image_mosaic_3",
                "text": "段落文字",
                "image_urls": ["/ai-images/a.jpg", "/ai-images/b.jpg", "/ai-images/c.jpg"],
                "image_alts": ["A", "B", "C"],
            }
        ],
    )
    layouts = [p["layout"] for p in ai["paragraphs"]]
    assert layouts == ["split_image_left", "split_image_right", "split_image_left"]
    assert all(len(p["image_urls"]) == 1 for p in ai["paragraphs"])
    assert ai["hero"]["image_url"] == "/ai-images/a.jpg"


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
                "image_urls": ["/ai-images/a.jpg", "/ai-images/a.jpg", "/ai-images/b.jpg"],
                "image_alts": ["A", "A2", "B"],
            },
            {
                "layout_name": "text_dense",
                "text": "Second",
                "image_urls": ["/ai-images/b.jpg"],
                "image_alts": ["B2"],
            },
        ],
    )
    urls = [p["image_urls"][0] for p in ai["paragraphs"] if p["image_urls"]]
    assert urls == ["/ai-images/a.jpg", "/ai-images/b.jpg"]

