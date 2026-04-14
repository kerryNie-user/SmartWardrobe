from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class Topic:
    topic_id: str
    title_zh: str
    seed_queries_en: List[str]
    axes: Dict[str, str]

