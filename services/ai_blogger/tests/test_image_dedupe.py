from services.ai_blogger.metrics.image_dedupe import ImageDedupe


def test_image_dedupe_hash_detects_duplicates():
    dedupe = ImageDedupe()

    b1 = b"fake-image-bytes-1"
    b2 = b"fake-image-bytes-1"
    b3 = b"fake-image-bytes-2"

    assert dedupe.register(b1) is True
    assert dedupe.register(b2) is False
    assert dedupe.register(b3) is True

