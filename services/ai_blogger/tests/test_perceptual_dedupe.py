from io import BytesIO

from PIL import Image

from services.ai_blogger.metrics.perceptual_dedupe import PerceptualDedupe


def _make_image_bytes(color: tuple[int, int, int], block: tuple[int, int, int] | None = None, block_side: str = 'left') -> bytes:
    img = Image.new('RGB', (64, 64), color=color)
    if block is not None:
        if block_side == 'left':
            img.paste(block, (0, 0, 32, 64))
        else:
            img.paste(block, (32, 0, 64, 64))
    buf = BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def test_perceptual_dedupe_rejects_identical_images():
    dedupe = PerceptualDedupe(threshold=0)
    a = _make_image_bytes((255, 255, 255))
    b = _make_image_bytes((255, 255, 255))
    assert dedupe.register(a) is True
    assert dedupe.register(b) is False


def test_perceptual_dedupe_allows_distinct_images():
    dedupe = PerceptualDedupe(threshold=0)
    a = _make_image_bytes((255, 255, 255), block=(0, 0, 0), block_side='left')
    b = _make_image_bytes((255, 255, 255), block=(0, 0, 0), block_side='right')
    assert dedupe.register(a) is True
    assert dedupe.register(b) is True
