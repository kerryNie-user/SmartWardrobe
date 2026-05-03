import json
import os
import tempfile
from pathlib import Path

import pytest

from services.ai_blogger.run_pipeline import run_batch
from services.backend_lite.database import db
from services.backend_lite.init_db import init_db


@pytest.fixture(autouse=True)
def setup_test_db():
    db_path = str(Path(tempfile.mkdtemp()) / "test.db")
    os.environ["SQLITE_DB"] = db_path

    if not db.is_closed():
        db.close()
    db.init(db_path)
    db.connect()
    init_db()

    yield

    if not db.is_closed():
        db.close()

    if os.path.exists(db_path):
        os.remove(db_path)


def test_run_batch_report_contains_errors_list_and_perceptual_counter(tmp_path):
    result = run_batch(
        {
            "count": 1,
            "download_images": False,
            "output_dir": str(tmp_path),
            "rng_seed": 0,
            "llm": "none",
            "locale": "en-US"
        }
    )

    report = json.loads(tmp_path.joinpath(result["report_json"]).read_text(encoding="utf-8"))
    assert "errors" in report
    assert isinstance(report["errors"], list)
    assert "images" in report
    assert "duplicate_perceptual" in report["images"]

