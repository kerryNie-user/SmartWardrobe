from __future__ import annotations

import random
from typing import List

from services.ai_blogger.layouts.layout_types import LayoutDefinition


class LayoutRegistry:
    def __init__(self, rng_seed: int | None = None):
        self._rng = random.Random(rng_seed)
        self._layouts = self._default_layouts()

    def list_layout_names(self) -> List[str]:
        return [l.name for l in self._layouts]

    def get_layout(self, name: str) -> LayoutDefinition:
        for l in self._layouts:
            if l.name == name:
                return l
        raise KeyError(name)

    def pick_layouts_for_article(self, paragraph_count: int, min_unique: int = 6) -> List[str]:
        if paragraph_count <= 0:
            return []

        pool = self.list_layout_names()
        if not pool:
            raise ValueError("layout registry is empty")

        if paragraph_count >= len(pool):
            shuffled_all = list(pool)
            self._rng.shuffle(shuffled_all)
            remaining = paragraph_count - len(shuffled_all)
            if remaining <= 0:
                return shuffled_all[:paragraph_count]
            rest = [self._rng.choice(pool) for _ in range(remaining)]
            out = shuffled_all + rest
            self._rng.shuffle(out)
            return out[:paragraph_count]

        unique_target = max(1, min(min_unique, len(pool), paragraph_count))

        shuffled = list(pool)
        self._rng.shuffle(shuffled)
        picked_unique = shuffled[:unique_target]

        remaining = paragraph_count - len(picked_unique)
        if remaining <= 0:
            return picked_unique[:paragraph_count]

        rest: List[str] = []
        for _ in range(remaining):
            rest.append(self._rng.choice(pool))

        out = picked_unique + rest
        self._rng.shuffle(out)
        return out[:paragraph_count]

    def _default_layouts(self) -> List[LayoutDefinition]:
        return [
            LayoutDefinition(name="hero_full_bleed", images_required=1, params_schema={}),
            LayoutDefinition(name="split_image_text", images_required=1, params_schema={}),
            LayoutDefinition(name="float_left_photo", images_required=1, params_schema={}),
            LayoutDefinition(name="float_right_photo", images_required=1, params_schema={}),
            LayoutDefinition(name="pull_quote_center", images_required=0, params_schema={}),
            LayoutDefinition(name="tip_box_rules", images_required=0, params_schema={}),
            LayoutDefinition(name="lookbook_cards_3", images_required=3, params_schema={}),
            LayoutDefinition(name="image_mosaic_3", images_required=3, params_schema={})
        ]
