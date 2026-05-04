import os
import subprocess
from pathlib import Path


def _run_zsh(script_path: Path, args: list[str], env: dict[str, str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["zsh", str(script_path), *args],
        cwd=str(script_path.parent.parent.parent.parent),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def test_start_backend_uses_python_module_invocation(tmp_path: Path):
    capture_path = tmp_path / "argv.txt"
    fake_python = tmp_path / "python3"
    fake_python.write_text(
        "\n".join(
            [
                "#!/bin/sh",
                "printf '%s\\n' \"$@\" > \"" + str(capture_path) + "\"",
                "exit 0",
            ]
        )
        + "\n"
    )
    fake_python.chmod(0o755)

    env = os.environ.copy()
    env["PYTHON_BIN"] = str(fake_python)

    result = _run_zsh(Path("scripts/dev/start_backend.sh"), [], env)
    assert result.returncode == 0

    recorded = capture_path.read_text().splitlines()
    assert recorded[:2] == ["-m", "services.backend.server"]


def test_android_adb_utils_can_be_sourced(tmp_path: Path):
    result = subprocess.run(
        ["zsh", "-c", "source scripts/android/_adb_utils.sh"],
        cwd=str(Path(__file__).resolve().parents[3]),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    assert result.returncode == 0
