from __future__ import annotations

from io import BytesIO

from PIL import Image


def compute_ahash(content: bytes) -> int:
    img = Image.open(BytesIO(content))
    img = img.convert('L').resize((8, 8), Image.Resampling.BILINEAR)
    pixels = list(img.get_flattened_data())
    avg = sum(pixels) / 64.0
    value = 0
    for p in pixels:
        value = (value << 1) | (1 if p >= avg else 0)
    return value


class PerceptualDedupe:
    def __init__(self, threshold: int = 5):
        self.threshold = int(threshold)
        self._seen: list[int] = []

    def register(self, content: bytes) -> bool:
        h = compute_ahash(content)
        for prev in self._seen:
            if (h ^ prev).bit_count() <= self.threshold:
                return False
        self._seen.append(h)
        return True
