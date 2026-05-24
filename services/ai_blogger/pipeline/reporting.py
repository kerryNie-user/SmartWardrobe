from __future__ import annotations

import json

from services.ai_blogger.pipeline.images import ImageTracker


def build_report(*, report_articles: list[dict], report_errors: list[dict], tracker: ImageTracker, download_images: bool, max_images_total: int) -> dict:
    return {
        "article_count": len(report_articles),
        "articles": report_articles,
        "errors": report_errors,
        "images": {
            "download_enabled": download_images,
            "max_images_total": max_images_total,
            "attempted": tracker.attempted_images,
            "downloaded": tracker.downloaded_images,
            "failed": tracker.failed_images,
            "placeholder_images": getattr(tracker, "placeholder_images", 0),
            "duplicate_hashes": tracker.duplicate_hashes,
            "duplicate_perceptual": tracker.duplicate_perceptual,
            "skipped_used_url": tracker.skipped_used_url,
            "details": tracker.image_details,
            "missing": getattr(tracker, "missing_image_details", []),
        },
    }


def write_reports(*, report: dict, report_json_path: str, report_md_path: str, ts: str) -> None:
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    md_lines = [
        f"# AI Blogger Report ({ts})",
        "",
        f"- article_count: {len(report.get('articles', []))}",
    ]
    for article in report.get("articles", []):
        quality = article.get("quality_report") or {}
        quality_status = quality.get("quality_gate_status", "unknown")
        missing_hero = quality.get("missing_hero", "unknown")
        missing_media_count = len(quality.get("missing_media", []) or [])
        forbidden_count = len(quality.get("forbidden_claims", []) or [])
        long_count = len(quality.get("paragraph_too_long", []) or [])
        if article.get("status") == "success":
            md_lines.append(
                f"- {article['topic_id']} | {article['title']} | paragraphs={article.get('paragraph_count', 0)} | unique_layouts={article.get('unique_layouts', 0)} | quality={quality_status} | missing_hero={missing_hero} | missing_media={missing_media_count} | forbidden_claims={forbidden_count} | paragraph_too_long={long_count}"
            )
        else:
            md_lines.append(
                f"- {article['topic_id']} | {article['title']} | FAILED | quality={quality_status} | missing_hero={missing_hero} | missing_media={missing_media_count} | forbidden_claims={forbidden_count} | paragraph_too_long={long_count} | error={article.get('error', 'Unknown')}"
            )

    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines) + "\n")
