from pathlib import Path


def test_repo_root_manual_scripts_should_not_be_referenced():
    repo_root = Path(__file__).resolve().parents[3]
    scripts = [
        repo_root / "apply_fixes.py",
        repo_root / "test_images.py",
        repo_root / "test_bing_scraper.py",
    ]
    targets = [path.name for path in scripts if path.exists()]
    if not targets:
        return

    allowed_suffixes = {".py", ".js", ".json", ".md", ".sh", ".zsh", ".txt"}
    excluded_parts = {
        ".git",
        ".venv",
        ".venv-verify",
        "node_modules",
        "worktrees",
        "archive",
        "docs",
        "assets",
    }

    matches: dict[str, list[str]] = {name: [] for name in targets}

    for path in repo_root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix and path.suffix not in allowed_suffixes:
            continue
        parts = set(path.parts)
        if parts & excluded_parts:
            continue
        if path.name in targets:
            continue
        if path == Path(__file__).resolve():
            continue

        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for name in targets:
            if name in content:
                matches[name].append(str(path.relative_to(repo_root)))

    offenders = {name: files for name, files in matches.items() if files}
    assert not offenders, f"Unexpected references: {offenders}"
