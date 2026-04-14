from __future__ import annotations

import hashlib


class ImageDedupe:
    def __init__(self):
        self._seen: set[str] = set()

    def register(self, content: bytes) -> bool:
        h = hashlib.sha1(content).hexdigest()
        if h in self._seen:
            return False
        self._seen.add(h)
        return True

