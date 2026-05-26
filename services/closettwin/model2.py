import importlib
import os
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from .contract import ModelCallResult, ModelLifecycleState


SUPPORTED_FUNCTIONS = {
    'offline_graph_update',
    'daily_recommendation',
    'online_daily_recommendation',
    'feedback_update',
    'online_feedback_update',
}


def _error_result(code: str, message: str, details: dict[str, Any] | None = None, status: str = ModelLifecycleState.ERROR):
    return ModelCallResult(
        ok=False,
        data={},
        error={
            'code': code,
            'message': message,
            'details': details or {},
        },
        status=status,
    )


@contextmanager
def _temporary_sys_path(path: Path):
    value = str(path)
    inserted = value not in sys.path
    if inserted:
        sys.path.insert(0, value)
    try:
        yield
    finally:
        if inserted:
            try:
                sys.path.remove(value)
            except ValueError:
                pass


class ClosetTwinModel2Adapter:
    def __init__(self, repo_path: str | None = None, engine: Any | None = None):
        configured = repo_path or os.getenv('CLOSETTWIN_MODEL2_PATH', '')
        self.repo_path = Path(configured).expanduser().resolve() if configured else None
        self._engine = engine
        self._state = ModelLifecycleState.STOPPED
        self._last_error = ''

    def start(self) -> str:
        if self._engine is not None:
            self._state = ModelLifecycleState.READY
            self._last_error = ''
            return self._state

        if not self.repo_path:
            self._state = ModelLifecycleState.UNAVAILABLE
            self._last_error = 'CLOSETTWIN_MODEL2_PATH is not configured'
            return self._state

        if not self.repo_path.exists():
            self._state = ModelLifecycleState.UNAVAILABLE
            self._last_error = f'Model2 path does not exist: {self.repo_path}'
            return self._state

        try:
            with _temporary_sys_path(self.repo_path):
                module = importlib.import_module('src.algorithm_engine')
                self._engine = module.AlgorithmEngine()
            self._state = ModelLifecycleState.READY
            self._last_error = ''
            return self._state
        except Exception as error:
            self._state = ModelLifecycleState.UNAVAILABLE
            self._last_error = str(error)
            return self._state

    def stop(self) -> str:
        self._engine = None
        self._state = ModelLifecycleState.STOPPED
        return self._state

    def status(self) -> str:
        if self._state == ModelLifecycleState.STOPPED:
            return self.start()
        return self._state

    def call(self, function_name: str, payload: dict[str, Any]) -> ModelCallResult:
        normalized = self._normalize_function(function_name)
        if normalized not in SUPPORTED_FUNCTIONS:
            return _error_result(
                'MODEL_FUNCTION_NOT_FOUND',
                'Unknown Model2 function',
                {'function': function_name},
            )

        state = self.status()
        if state != ModelLifecycleState.READY or self._engine is None:
            return _error_result(
                'MODEL_UNAVAILABLE',
                'Model2 adapter is unavailable',
                {'reason': self._last_error},
                status=state,
            )

        try:
            if normalized == 'offline_graph_update':
                data = self._engine.offline_graph_update(payload)
            elif normalized == 'online_daily_recommendation':
                data = self._engine.online_daily_recommendation(payload)
            else:
                data = self._engine.online_feedback_update(payload)
            return ModelCallResult(ok=True, data=data)
        except Exception as error:
            self._state = ModelLifecycleState.ERROR
            self._last_error = str(error)
            return _error_result(
                'MODEL_CALL_FAILED',
                'Model2 call failed',
                {'function': function_name, 'message': str(error)},
            )

    @staticmethod
    def _normalize_function(function_name: str) -> str:
        if function_name == 'daily_recommendation':
            return 'online_daily_recommendation'
        if function_name == 'feedback_update':
            return 'online_feedback_update'
        return function_name
