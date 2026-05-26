from services.closettwin import (
    ClosetTwinRuntime,
    ModelCallResult,
    ModelLifecycleState,
)
from services.closettwin.contract import ModelAdapter


class FakeAdapter(ModelAdapter):
    def __init__(self, name, response):
        self.name = name
        self.response = response
        self.calls = []

    def start(self):
        self.calls.append(('start', None))
        return ModelLifecycleState.READY

    def stop(self):
        self.calls.append(('stop', None))
        return ModelLifecycleState.STOPPED

    def status(self):
        self.calls.append(('status', None))
        return ModelLifecycleState.READY

    def call(self, function_name, payload):
        self.calls.append(('call', function_name, payload))
        return ModelCallResult(ok=True, data={'adapter': self.name, **self.response})


def test_model_runtime_exposes_minimal_lifecycle_and_call_surface():
    runtime = ClosetTwinRuntime(
        model1=FakeAdapter('model1', {'candidates': ['item-1']}),
        model2=FakeAdapter('model2', {'recommendations': ['outfit-1']}),
    )

    assert not hasattr(runtime, 'call')

    assert runtime.start() == {
        'model1': ModelLifecycleState.READY,
        'model2': ModelLifecycleState.READY,
    }
    assert runtime.status() == {
        'model1': ModelLifecycleState.READY,
        'model2': ModelLifecycleState.READY,
    }

    model1_result = runtime.call_model1('daily_context', {'weather': {'temp': 26}})
    model2_result = runtime.call_model2('daily_recommendation', {'context_scores': {'item-1': 1.0}})

    assert model1_result.ok is True
    assert model1_result.data == {'adapter': 'model1', 'candidates': ['item-1']}
    assert model2_result.ok is True
    assert model2_result.data == {'adapter': 'model2', 'recommendations': ['outfit-1']}

    assert runtime.stop() == {
        'model1': ModelLifecycleState.STOPPED,
        'model2': ModelLifecycleState.STOPPED,
    }


def test_runtime_rejects_unknown_model_function_without_leaking_adapter_details():
    runtime = ClosetTwinRuntime(
        model1=FakeAdapter('model1', {}),
        model2=FakeAdapter('model2', {}),
    )

    result = runtime._call('missing-model', 'daily_context', {})

    assert result.ok is False
    assert result.error == {
        'code': 'MODEL_NOT_FOUND',
        'message': 'Unknown model adapter',
        'details': {'model': 'missing-model'},
    }


def test_daily_recommendation_pipeline_feeds_model1_context_into_model2():
    model1 = FakeAdapter('model1', {'context_scores': {'coat-1': 0.91}})
    model2 = FakeAdapter('model2', {'recommendations': [{'id': 'look-1'}]})
    runtime = ClosetTwinRuntime(model1=model1, model2=model2)

    result = runtime.recommend_daily({
        'scenario': {'intent': 'travel'},
        'wardrobe': {'items': [{'id': 'coat-1'}]},
        'model1Request': {
            'function': 'daily_context',
            'payload': {'target_folder': '/tmp/wardrobe'}
        }
    })

    assert result.ok is True
    assert model1.calls[-1] == ('call', 'daily_context', {'target_folder': '/tmp/wardrobe'})
    assert model2.calls[-1][0:2] == ('call', 'daily_recommendation')
    assert model2.calls[-1][2]['model1']['source'] == 'runtime-model1'
    assert model2.calls[-1][2]['model1']['data']['context_scores'] == {'coat-1': 0.91}
    assert result.data['pipeline']['model1']['source'] == 'runtime-model1'
    assert result.data['recommendations'] == [{'id': 'look-1'}]


def test_backend_boundaries_keep_closettwin_service_behind_facade():
    from pathlib import Path

    backend_root = Path(__file__).resolve().parents[2] / 'backend'
    routes_source = (backend_root / 'http' / 'routes.py').read_text(encoding='utf-8')
    storage_source = (backend_root / 'storage.py').read_text(encoding='utf-8')

    assert '26-101ClosetTwin' not in routes_source
    assert 'ClosetTwin_model2_table' not in routes_source
    assert 'AlgorithmEngine' not in routes_source
    assert 'SupplementaryAnnotator' not in routes_source
    assert 'AlgorithmEngine' not in storage_source
    assert 'SupplementaryAnnotator' not in storage_source
