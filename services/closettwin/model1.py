import importlib
import os
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from .contract import ModelCallResult, ModelLifecycleState


SUPPORTED_FUNCTIONS = {
    'annotate_items',
    'filter_by_temperature',
    'rank_by_scenario',
    'daily_context',
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


class ClosetTwinModel1Adapter:
    def __init__(self, repo_path: str | None = None):
        configured = repo_path or os.getenv('CLOSETTWIN_MODEL1_PATH', '')
        self.repo_path = Path(configured).expanduser().resolve() if configured else None
        self._state = ModelLifecycleState.STOPPED
        self._last_error = ''

    def start(self) -> str:
        if not self.repo_path:
            self._state = ModelLifecycleState.UNAVAILABLE
            self._last_error = 'CLOSETTWIN_MODEL1_PATH is not configured'
            return self._state

        if not self.repo_path.exists():
            self._state = ModelLifecycleState.UNAVAILABLE
            self._last_error = f'Model1 path does not exist: {self.repo_path}'
            return self._state

        self._state = ModelLifecycleState.READY
        self._last_error = ''
        return self._state

    def stop(self) -> str:
        self._state = ModelLifecycleState.STOPPED
        return self._state

    def status(self) -> str:
        if self._state == ModelLifecycleState.STOPPED:
            return self.start()
        return self._state

    def call(self, function_name: str, payload: dict[str, Any]) -> ModelCallResult:
        if function_name not in SUPPORTED_FUNCTIONS:
            return _error_result(
                'MODEL_FUNCTION_NOT_FOUND',
                'Unknown Model1 function',
                {'function': function_name},
            )

        state = self.status()
        if state != ModelLifecycleState.READY:
            return _error_result(
                'MODEL_UNAVAILABLE',
                'Model1 adapter is unavailable',
                {'reason': self._last_error},
                status=state,
            )

        try:
            if function_name == 'annotate_items':
                return self._annotate_items(payload)
            if function_name == 'filter_by_temperature':
                return self._filter_by_temperature(payload)
            if function_name == 'rank_by_scenario':
                return self._rank_by_scenario(payload)
            return self._daily_context(payload)
        except Exception as error:
            self._state = ModelLifecycleState.ERROR
            self._last_error = str(error)
            return _error_result(
                'MODEL_CALL_FAILED',
                'Model1 call failed',
                {'function': function_name, 'message': str(error)},
            )

    @property
    def _codes_path(self) -> Path:
        assert self.repo_path is not None
        return self.repo_path / 'codes'

    def _annotate_items(self, payload: dict[str, Any]) -> ModelCallResult:
        image_dir = payload.get('image_dir') or payload.get('target_folder')
        if not image_dir:
            return _error_result('MODEL_PAYLOAD_INVALID', 'Missing image_dir', {'required': ['image_dir']})

        with _temporary_sys_path(self._codes_path):
            module = importlib.import_module('application_1_user_annotation')
            annotator = module.SupplementaryAnnotator(
                image_dir=image_dir,
                output_jsonl=payload.get('output_jsonl', '_annotation_data.jsonl'),
                vit_model_path=payload.get('vit_model_path', './mobilevit-small'),
                regressor_path=payload.get('regressor_path', 'models/temperature_regressor.pth'),
                scenario_regressor_path=payload.get('scenario_regressor_path', 'models/scenario_regressor.pth'),
            )
            annotator.process()

        return ModelCallResult(ok=True, data={'image_dir': image_dir})

    def _filter_by_temperature(self, payload: dict[str, Any]) -> ModelCallResult:
        input_dir = payload.get('input_dir') or payload.get('target_folder')
        output_dir = payload.get('output_dir') or input_dir
        if not input_dir:
            return _error_result('MODEL_PAYLOAD_INVALID', 'Missing input_dir', {'required': ['input_dir']})

        with _temporary_sys_path(self._codes_path):
            module = importlib.import_module('application_2_tem_filter')
            module.update_candidate_list(
                input_dir=input_dir,
                output_dir=output_dir,
                info_filename=payload.get('info_filename', '_info_simulate.json'),
                annotation_filename=payload.get('annotation_filename', '_annotation_data.jsonl'),
                output_filename=payload.get('output_filename', '_candidate_jpg_manifest.txt'),
            )

        return ModelCallResult(ok=True, data={'input_dir': input_dir, 'output_dir': output_dir})

    def _rank_by_scenario(self, payload: dict[str, Any]) -> ModelCallResult:
        input_dir = payload.get('input_dir') or payload.get('target_folder')
        if not input_dir:
            return _error_result('MODEL_PAYLOAD_INVALID', 'Missing input_dir', {'required': ['input_dir']})

        with _temporary_sys_path(self._codes_path):
            module = importlib.import_module('application_3_scene_score_sort')
            module.calculate_and_sort_scenarios(
                input_dir=input_dir,
                output_dir=payload.get('output_dir'),
                info_filename=payload.get('info_filename', '_info_simulate.json'),
                manifest_filename=payload.get('manifest_filename', '_candidate_jpg_manifest.txt'),
                annotation_filename=payload.get('annotation_filename', '_annotation_data.jsonl'),
                output_filename=payload.get('output_filename', '_sorted_scenario_manifest.jsonl'),
                model_name=payload.get('model_name', 'all-MiniLM-L6-v2'),
            )

        return ModelCallResult(ok=True, data={'input_dir': input_dir})

    def _daily_context(self, payload: dict[str, Any]) -> ModelCallResult:
        target_folder = payload.get('target_folder') or payload.get('input_dir')
        if not target_folder:
            return _error_result('MODEL_PAYLOAD_INVALID', 'Missing target_folder', {'required': ['target_folder']})

        annotate_result = self._annotate_items({'image_dir': target_folder, **payload})
        if not annotate_result.ok:
            return annotate_result
        filter_result = self._filter_by_temperature({'input_dir': target_folder, 'output_dir': target_folder, **payload})
        if not filter_result.ok:
            return filter_result
        return self._rank_by_scenario({'input_dir': target_folder, **payload})
