from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class BatchConfig:
    count: int
    download_images: bool
    output_dir: str
    rng_seed: int | None
    max_images_total: int
    profile_name: str
    llm_mode: str
    locale: str
    skip_scout: bool


@dataclass(frozen=True)
class BatchArtifacts:
    ts: str
    output_dir: str
    images_dir: str
    html_basename: str
    report_json_basename: str
    report_md_basename: str
    html_path: str
    report_json_path: str
    report_md_path: str


def normalize_locale(value: str | None) -> str:
    return "zh-CN" if value == "zh-CN" else "en-US"


def parse_batch_config(raw: dict) -> BatchConfig:
    count = int(raw.get("count", 10))
    download_images = bool(raw.get("download_images", True))
    max_images_total = int(raw.get("max_images_total", 0 if not download_images else count * 50))
    return BatchConfig(
        count=count,
        download_images=download_images,
        output_dir=str(raw.get("output_dir", "services/ai_blogger/output")),
        rng_seed=raw.get("rng_seed", None),
        max_images_total=max_images_total,
        profile_name=str(raw.get("profile", "editorial_styling") or "editorial_styling"),
        llm_mode=str(raw.get("llm", "real") or "real").strip().lower(),
        locale=normalize_locale(raw.get("locale")),
        skip_scout=bool(raw.get("skip_scout", False)),
    )


def create_batch_artifacts(output_dir: str, ts: str | None = None) -> BatchArtifacts:
    os.makedirs(output_dir, exist_ok=True)
    images_dir = os.path.join(output_dir, "images")
    os.makedirs(images_dir, exist_ok=True)

    resolved_ts = ts or datetime.now().strftime("%Y%m%d%H%M%S")
    html_basename = f"chain_blogs_{resolved_ts}.html"
    report_json_basename = f"report_{resolved_ts}.json"
    report_md_basename = f"report_{resolved_ts}.md"

    return BatchArtifacts(
        ts=resolved_ts,
        output_dir=output_dir,
        images_dir=images_dir,
        html_basename=html_basename,
        report_json_basename=report_json_basename,
        report_md_basename=report_md_basename,
        html_path=os.path.join(output_dir, html_basename),
        report_json_path=os.path.join(output_dir, report_json_basename),
        report_md_path=os.path.join(output_dir, report_md_basename),
    )

