import os
import time
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from services.ai_blogger.run_pipeline import run_batch


def _read_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except Exception:
        return default


def _read_bool(name: str, default: bool) -> bool:
    raw = str(os.environ.get(name, "")).strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "y", "on"}


def _read_locales() -> list[str]:
    raw = str(os.environ.get("AI_BLOGGER_LOCALES", "zh-CN,en-US") or "")
    locales = [item.strip() for item in raw.split(",") if item.strip()]
    if not locales:
        return ["zh-CN", "en-US"]
    return locales


def _generate(locale: str, count: int, profile: str, download_images: bool, output_dir: str, llm_mode: str) -> None:
    run_batch({
        "count": count,
        "llm": llm_mode,
        "profile": profile,
        "locale": locale,
        "download_images": download_images,
        "output_dir": output_dir,
        "max_images_total": count * 50
    })


def _configure_logging(log_dir: str) -> None:
    log_path = Path(log_dir).resolve()
    log_path.mkdir(parents=True, exist_ok=True)
    log_file = log_path / "ai_blogger_worker.log"

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

    has_file_handler = any(
        isinstance(handler, RotatingFileHandler) and getattr(handler, "baseFilename", None) == str(log_file)
        for handler in root_logger.handlers
    )
    if not has_file_handler:
        file_handler = RotatingFileHandler(str(log_file), maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8")
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)


def main() -> None:
    log_dir = str(os.environ.get("AI_BLOGGER_LOG_DIR", "services/ai_blogger/output/logs") or "services/ai_blogger/output/logs")
    _configure_logging(log_dir)

    sqlite_db = str(os.environ.get("SQLITE_DB", "") or "").strip()
    if not sqlite_db:
        raise SystemExit("SQLITE_DB is required")
    os.environ["SQLITE_DB"] = sqlite_db

    bootstrap_count = _read_int("AI_BLOGGER_BOOTSTRAP_COUNT", 10)
    interval_seconds = _read_int("AI_BLOGGER_INTERVAL_SECONDS", 86400)
    profile = str(os.environ.get("AI_BLOGGER_PROFILE", "editorial_styling") or "editorial_styling").strip()
    output_dir = str(os.environ.get("AI_BLOGGER_OUTPUT_DIR", "services/ai_blogger/output") or "services/ai_blogger/output").strip()
    download_images = _read_bool("AI_BLOGGER_DOWNLOAD_IMAGES", True)
    llm_mode = str(os.environ.get("AI_BLOGGER_LLM_MODE", "real") or "real").strip().lower()
    locales = _read_locales()

    logging.info(f"AI Blogger worker started. sqlite_db={sqlite_db}")
    logging.info(f"AI Blogger worker config. locales={','.join(locales)} bootstrap={bootstrap_count} interval_seconds={interval_seconds} llm={llm_mode}")

    if bootstrap_count > 0:
        for loc in locales:
            try:
                logging.info(f"AI Blogger bootstrap start. locale={loc} count={bootstrap_count}")
                _generate(loc, bootstrap_count, profile, download_images, output_dir, llm_mode)
                logging.info(f"AI Blogger bootstrap done. locale={loc}")
            except Exception as exc:
                logging.exception(f"AI Blogger bootstrap failed. locale={loc} error={exc}")

    while True:
        time.sleep(max(1, interval_seconds))
        for loc in locales:
            try:
                logging.info(f"AI Blogger tick start. locale={loc} count=1")
                _generate(loc, 1, profile, download_images, output_dir, llm_mode)
                logging.info(f"AI Blogger tick done. locale={loc}")
            except Exception as exc:
                logging.exception(f"AI Blogger tick failed. locale={loc} error={exc}")


if __name__ == "__main__":
    main()
