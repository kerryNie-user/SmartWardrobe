from __future__ import annotations

import json
import os
import random
from typing import List, Tuple

from services.ai_blogger.topic.topic_types import Topic


class TopicSourcer:
    def __init__(self, topic_bank_path: str | None = None, rng_seed: int | None = None):
        self._rng = random.Random(rng_seed)
        self._topic_bank_path = topic_bank_path or os.path.join(os.path.dirname(__file__), "topic_bank.json")
        self._bank = self._load_topic_bank()

    def get_topics(self, count: int) -> List[Topic]:
        if count <= 0:
            return []

        candidates = list(self._bank)
        self._rng.shuffle(candidates)

        picked: List[Topic] = []
        used_ids: set[str] = set()
        used_combos: set[Tuple[str | None, str | None, str | None, str | None]] = set()

        def combo_of(topic: Topic) -> Tuple[str | None, str | None, str | None, str | None]:
            return (
                topic.axes.get("style"),
                topic.axes.get("item"),
                topic.axes.get("scene"),
                topic.axes.get("culture"),
            )

        for t in candidates:
            if t.topic_id in used_ids:
                continue
            c = combo_of(t)
            if c in used_combos:
                continue
            picked.append(t)
            used_ids.add(t.topic_id)
            used_combos.add(c)
            if len(picked) >= count:
                return picked

        for t in candidates:
            if len(picked) >= count:
                break
            if t.topic_id in used_ids:
                continue
            picked.append(t)
            used_ids.add(t.topic_id)

        return picked[:count]

    def _load_topic_bank(self) -> List[Topic]:
        with open(self._topic_bank_path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        topics: List[Topic] = []
        for item in raw:
            topics.append(
                Topic(
                    topic_id=str(item["topic_id"]),
                    title_zh=str(item["title_zh"]),
                    seed_queries_en=list(item.get("seed_queries_en", [])),
                    axes=dict(item.get("axes", {})),
                )
            )

        if not topics:
            raise ValueError("topic_bank is empty")

        return topics

