from typing import Any

from .contract import ModelAdapter, ModelCallResult, ModelLifecycleState
from .model1 import ClosetTwinModel1Adapter
from .model2 import ClosetTwinModel2Adapter


def _error_result(code: str, message: str, details: dict[str, Any] | None = None) -> ModelCallResult:
    return ModelCallResult(
        ok=False,
        data={},
        error={
            'code': code,
            'message': message,
            'details': details or {},
        },
        status=ModelLifecycleState.ERROR,
    )


class ClosetTwinRuntime:
    def __init__(self, model1: ModelAdapter, model2: ModelAdapter):
        self._model1 = model1
        self._model2 = model2

    def start(self) -> dict[str, str]:
        return {
            'model1': self._model1.start(),
            'model2': self._model2.start(),
        }

    def stop(self) -> dict[str, str]:
        return {
            'model1': self._model1.stop(),
            'model2': self._model2.stop(),
        }

    def status(self) -> dict[str, str]:
        return {
            'model1': self._model1.status(),
            'model2': self._model2.status(),
        }

    def _call(self, model_name: str, function_name: str, payload: dict[str, Any] | None = None) -> ModelCallResult:
        model = {
            'model1': self._model1,
            'model2': self._model2,
        }.get(model_name)

        if model is None:
            return _error_result(
                'MODEL_NOT_FOUND',
                'Unknown model adapter',
                {'model': model_name},
            )

        return model.call(function_name, payload or {})

    def call_model1(self, function_name: str, payload: dict[str, Any] | None = None) -> ModelCallResult:
        return self._call('model1', function_name, payload)

    def call_model2(self, function_name: str, payload: dict[str, Any] | None = None) -> ModelCallResult:
        return self._call('model2', function_name, payload)

    def recommend_daily(self, payload: dict[str, Any] | None = None) -> ModelCallResult:
        pipeline_payload = dict(payload or {})
        model1_context = pipeline_payload.get('model1') or {}
        model1_request = pipeline_payload.get('model1Request') or pipeline_payload.get('model1_request')

        if isinstance(model1_request, dict):
            function_name = model1_request.get('function') or model1_request.get('functionName') or 'daily_context'
            request_payload = model1_request.get('payload') or {
                key: value
                for key, value in model1_request.items()
                if key not in {'function', 'functionName'}
            }
            model1_result = self.call_model1(function_name, request_payload)
            if not model1_result.ok:
                return model1_result
            model1_context = {
                'source': 'runtime-model1',
                'function': function_name,
                'data': model1_result.data,
            }

        pipeline_payload['model1'] = model1_context
        pipeline_payload.pop('model1Request', None)
        pipeline_payload.pop('model1_request', None)

        model2_result = self.call_model2('daily_recommendation', pipeline_payload)
        if not model2_result.ok:
            return model2_result

        data = dict(model2_result.data or {})
        data['pipeline'] = {
            **(data.get('pipeline') if isinstance(data.get('pipeline'), dict) else {}),
            'model1': model1_context,
            'model2': {
                'function': 'daily_recommendation',
            },
        }
        return ModelCallResult(ok=True, data=data, status=model2_result.status)


def create_closettwin_runtime(**kwargs) -> ClosetTwinRuntime:
    return ClosetTwinRuntime(
        model1=kwargs.get('model1') or ClosetTwinModel1Adapter(),
        model2=kwargs.get('model2') or ClosetTwinModel2Adapter(),
    )
