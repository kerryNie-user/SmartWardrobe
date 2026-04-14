from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Any


@dataclass(frozen=True)
class LayoutDefinition:
    name: str
    images_required: int
    params_schema: Dict[str, Any]

