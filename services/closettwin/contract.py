from dataclasses import dataclass, field
from typing import Any, Protocol


class ModelLifecycleState:
    STOPPED = 'stopped'
    READY = 'ready'
    UNAVAILABLE = 'unavailable'
    ERROR = 'error'


@dataclass(frozen=True)
class ModelCallResult:
    ok: bool
    data: dict[str, Any] = field(default_factory=dict)
    error: dict[str, Any] | None = None
    status: str = ModelLifecycleState.READY


class ModelAdapter(Protocol):
    def start(self) -> str:
        ...

    def stop(self) -> str:
        ...

    def status(self) -> str:
        ...

    def call(self, function_name: str, payload: dict[str, Any]) -> ModelCallResult:
        ...
