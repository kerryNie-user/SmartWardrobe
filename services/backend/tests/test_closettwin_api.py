import pytest

from services.backend.http import ApiError, JsonResponse, handle_api_request
from services.closettwin import ModelCallResult, ModelLifecycleState


class FakeClosetTwinRuntime:
    def __init__(self):
        self.calls = []

    def start(self):
        self.calls.append(('start',))
        return {
            'model1': ModelLifecycleState.READY,
            'model2': ModelLifecycleState.UNAVAILABLE,
        }

    def stop(self):
        self.calls.append(('stop',))
        return {
            'model1': ModelLifecycleState.STOPPED,
            'model2': ModelLifecycleState.STOPPED,
        }

    def status(self):
        self.calls.append(('status',))
        return {
            'model1': ModelLifecycleState.READY,
            'model2': ModelLifecycleState.UNAVAILABLE,
        }

    def call_model1(self, function_name, payload=None):
        self.calls.append(('model1', function_name, payload))
        return ModelCallResult(
            ok=True,
            status=ModelLifecycleState.READY,
            data={
                'item': {
                    'title': 'Recognized Coat',
                    'category': 'Outerwear',
                    'tags': ['outerwear', 'warm'],
                },
                'model': 'model1',
            },
        )

    def call_model2(self, function_name, payload=None):
        self.calls.append(('model2', function_name, payload))
        return ModelCallResult(
            ok=False,
            status=ModelLifecycleState.UNAVAILABLE,
            error={
                'code': 'MODEL_UNAVAILABLE',
                'message': 'Model2 adapter is unavailable',
                'details': {'reason': 'missing weights'},
            },
        )

    def recommend_daily(self, payload=None):
        self.calls.append(('daily', payload))
        return ModelCallResult(
            ok=True,
            status=ModelLifecycleState.READY,
            data={
                'pipeline': {
                    'model1': {
                        'source': 'wardrobe-ai-json',
                    },
                },
                'recommendations': [
                    {'id': 'model2-look'}
                ],
            },
        )


def test_closettwin_status_exposes_minimal_runtime_status():
    runtime = FakeClosetTwinRuntime()

    response = handle_api_request(None, 'GET', '/api/closettwin/status', runtime=runtime)

    assert isinstance(response, JsonResponse)
    assert response.status == 200
    assert response.payload == {
        'status': {
            'model1': ModelLifecycleState.READY,
            'model2': ModelLifecycleState.UNAVAILABLE,
        }
    }
    assert runtime.calls == [('status',)]


def test_closettwin_model1_call_routes_through_runtime_facade():
    runtime = FakeClosetTwinRuntime()

    response = handle_api_request(
        None,
        'POST',
        '/api/closettwin/model1/call',
        {
            'function': 'daily_context',
            'payload': {
                'imageData': 'data:image/png;base64,cHJldmlldw==',
                'fileName': 'coat.png',
            },
        },
        runtime=runtime,
    )

    assert response.status == 200
    assert response.payload == {
        'ok': True,
        'status': ModelLifecycleState.READY,
        'data': {
            'item': {
                'title': 'Recognized Coat',
                'category': 'Outerwear',
                'tags': ['outerwear', 'warm'],
            },
            'model': 'model1',
        },
        'error': None,
    }
    assert runtime.calls[0][0:2] == ('model1', 'daily_context')
    assert runtime.calls[0][2]['fileName'] == 'coat.png'
    assert 'imageData' not in runtime.calls[0][2]
    assert runtime.calls[0][2]['target_folder']


def test_closettwin_model2_unavailable_returns_successful_api_error_payload():
    runtime = FakeClosetTwinRuntime()

    response = handle_api_request(
        None,
        'POST',
        '/api/closettwin/model2/call',
        {
            'function': 'daily_recommendation',
            'payload': {'wardrobe': []},
        },
        runtime=runtime,
    )

    assert response.status == 200
    assert response.payload['ok'] is False
    assert response.payload['status'] == ModelLifecycleState.UNAVAILABLE
    assert response.payload['error']['code'] == 'MODEL_UNAVAILABLE'


def test_closettwin_daily_recommendation_uses_pipeline_facade():
    runtime = FakeClosetTwinRuntime()

    response = handle_api_request(
        None,
        'POST',
        '/api/closettwin/recommendations/daily',
        {
            'scenario': {'intent': 'travel'},
            'model1': {
                'source': 'wardrobe-ai-json',
                'items': [{'itemId': 'coat-1'}],
            },
        },
        runtime=runtime,
    )

    assert response.status == 200
    assert response.payload['ok'] is True
    assert response.payload['data']['pipeline']['model1']['source'] == 'wardrobe-ai-json'
    assert runtime.calls == [
        (
            'daily',
            {
                'scenario': {'intent': 'travel'},
                'model1': {
                    'source': 'wardrobe-ai-json',
                    'items': [{'itemId': 'coat-1'}],
                },
            },
        )
    ]


def test_closettwin_rejects_unknown_model_route():
    with pytest.raises(ApiError) as exc_info:
        handle_api_request(None, 'POST', '/api/closettwin/model3/call', runtime=FakeClosetTwinRuntime())

    assert exc_info.value.status == 404
    assert exc_info.value.code == 'MODEL_NOT_FOUND'
