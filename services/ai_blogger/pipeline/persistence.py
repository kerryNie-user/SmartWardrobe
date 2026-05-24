from __future__ import annotations

import logging
from datetime import datetime

from services.ai_blogger.chain_runner import attach_quality_report
from services.ai_blogger.pipeline.images import ImageTracker, is_network_image_url
from services.ai_blogger.protocol.normalize_ai_post import normalize_ai_post_v1


def _list_texts(value) -> list[str]:
    if value is None:
        return []
    source = value if isinstance(value, list) else [value]
    return [str(item).strip() for item in source if str(item or "").strip()]


def _list_network_urls(value) -> list[str]:
    return [url for url in _list_texts(value) if is_network_image_url(url)]


def _paragraph_media_from_tracker(tracker: ImageTracker, idx: int) -> tuple[dict[int, list[str]], dict[int, list[str]], dict[int, list[str]]]:
    paragraph_images: dict[int, list[str]] = {}
    paragraph_alts: dict[int, list[str]] = {}
    paragraph_captions: dict[int, list[str]] = {}
    for detail in tracker.image_details:
        if detail.get("topic_id") != f"auto_{idx}":
            continue
        p_index = detail.get("paragraph_index")
        if p_index is None:
            continue
        paragraph_images.setdefault(p_index, [])
        paragraph_alts.setdefault(p_index, [])
        paragraph_captions.setdefault(p_index, [])
        url = str(detail.get("original_url") or detail.get("served_url") or "").strip()
        alt = str(detail.get("alt_text") or "").strip()
        caption = str(detail.get("caption") or "").strip()
        if is_network_image_url(url):
            paragraph_images[p_index].append(url)
            paragraph_alts[p_index].append(alt)
            paragraph_captions[p_index].append(caption)
    return paragraph_images, paragraph_alts, paragraph_captions


def _resolve_post_images(tracker: ImageTracker, idx: int, paragraphs: list[dict]) -> tuple[dict[int, list[str]], dict[int, list[str]], dict[int, list[str]]]:
    paragraph_images, paragraph_alts, paragraph_captions = _paragraph_media_from_tracker(tracker, idx)
    for p_idx, paragraph in enumerate(paragraphs):
        layout_name = str(paragraph.get("layout_name") or "").strip()
        existing_urls = _list_network_urls(paragraph.get("image_urls") or paragraph.get("imageUrls") or [])
        existing_alts = _list_texts(paragraph.get("image_alts") or paragraph.get("imageAlts") or [])
        existing_captions = _list_texts(
            paragraph.get("image_captions")
            or paragraph.get("imageCaptions")
            or paragraph.get("captions")
            or paragraph.get("image_caption")
            or paragraph.get("caption")
            or []
        )
        if existing_urls:
            paragraph["image_urls"] = existing_urls
            if len(existing_alts) < len(existing_urls):
                existing_alts = [*existing_alts, *["" for _ in range(len(existing_urls) - len(existing_alts))]]
            if len(existing_captions) < len(existing_urls):
                existing_captions = [*existing_captions, *["" for _ in range(len(existing_urls) - len(existing_captions))]]
            paragraph["image_alts"] = existing_alts
            if any(existing_captions):
                paragraph["image_captions"] = existing_captions
        else:
            paragraph.setdefault("image_urls", [])
            paragraph.setdefault("image_alts", [])
            paragraph.setdefault("image_captions", [])

        image_queries = list(paragraph.get("image_queries", []) or [])
        if not image_queries or paragraph_images.get(p_idx):
            continue
        for query in image_queries:
            url, alt = tracker._resolve_media(query, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type="portrait_4_3")
            if url:
                paragraph["image_urls"].append(url)
                paragraph["image_alts"].append(alt)
                caption = ""
                if isinstance(query, dict):
                    caption = str(query.get("image_caption") or query.get("caption") or "").strip()
                paragraph.setdefault("image_captions", []).append(caption)
    for p_idx, paragraph in enumerate(paragraphs):
        urls = paragraph.get("image_urls", []) or []
        alts = paragraph.get("image_alts", []) or []
        captions = paragraph.get("image_captions", []) or []
        for image_idx, url in enumerate(urls):
            if not is_network_image_url(url):
                continue
            paragraph_images.setdefault(p_idx, [])
            paragraph_alts.setdefault(p_idx, [])
            paragraph_captions.setdefault(p_idx, [])
            if url not in paragraph_images[p_idx]:
                paragraph_images[p_idx].append(url)
                paragraph_alts[p_idx].append(alts[image_idx] if image_idx < len(alts) else "")
                paragraph_captions[p_idx].append(captions[image_idx] if image_idx < len(captions) else "")
    return paragraph_images, paragraph_alts, paragraph_captions


def _protocol_paragraphs(paragraphs: list[dict], paragraph_images: dict[int, list[str]], paragraph_alts: dict[int, list[str]], paragraph_captions: dict[int, list[str]]) -> list[dict]:
    protocol_paragraphs = []
    for p_idx, paragraph in enumerate(paragraphs):
        text = str(paragraph.get("text", "") or "").strip()
        layout_name = str(paragraph.get("layout_name", "") or "").strip()
        merged_text = text
        protocol_paragraphs.append(
            {
                "layout_name": layout_name,
                "text": merged_text,
                "image_urls": paragraph_images.get(p_idx, []),
                "image_alts": paragraph_alts.get(p_idx, []),
                "image_captions": paragraph_captions.get(p_idx, []),
            }
        )
    return protocol_paragraphs


def _unique_images(paragraph_images: dict[int, list[str]]) -> list[str]:
    all_images = []
    for urls in paragraph_images.values():
        for url in urls:
            if is_network_image_url(url) and url not in all_images:
                all_images.append(url)
    return all_images


def _topic_missing_media(tracker: ImageTracker, idx: int) -> list[dict]:
    return [
        detail
        for detail in getattr(tracker, "missing_image_details", [])
        if detail.get("topic_id") == f"auto_{idx}"
    ]


def _merge_missing_media(*groups: list[dict]) -> list[dict]:
    merged = []
    seen = set()
    for group in groups:
        for item in group or []:
            key = (
                item.get("paragraph_index") if isinstance(item, dict) else "",
                item.get("search_query") if isinstance(item, dict) else str(item),
            )
            if key in seen:
                continue
            seen.add(key)
            merged.append(item)
    return merged


def persist_content_posts(*, results: list[tuple[int, str, dict | None, dict | None]], tracker: ImageTracker, locale: str, ts: str) -> dict | None:
    from services.backend.database import db
    from services.backend.models import ContentPost

    was_closed = db.is_closed()
    if was_closed:
        db.connect()

    try:
        quality_failures = []
        with db.atomic():
            for idx, title, post, error in results:
                if error is not None or post is None:
                    continue
                if post.get("_quality_gate_failed"):
                    quality_failures.append(
                        {
                            "topic_id": f"auto_{idx}",
                            "title": post.get("title", title),
                            "quality_report": post.get("quality_report", {}),
                        }
                    )
                    continue
                paragraphs = post.get("paragraphs", [])
                paragraph_images, paragraph_alts, paragraph_captions = _resolve_post_images(tracker, idx, paragraphs)
                protocol_paragraphs = _protocol_paragraphs(paragraphs, paragraph_images, paragraph_alts, paragraph_captions)
                hero_candidates = paragraph_images.get(0, [])
                hero_image = hero_candidates[0] if hero_candidates else ""
                existing_report = post.get("quality_report") if isinstance(post.get("quality_report"), dict) else {}
                missing_media = _merge_missing_media(existing_report.get("missing_media", []), _topic_missing_media(tracker, idx))
                quality_report = {
                    "missing_hero": not bool(hero_image),
                    "missing_media": missing_media,
                    "forbidden_claims": existing_report.get("forbidden_claims", []),
                    "paragraph_too_long": existing_report.get("paragraph_too_long", []),
                    "theme_drift": existing_report.get("theme_drift", []),
                }
                quality_report["quality_gate_status"] = "failed" if (
                    quality_report["missing_hero"]
                    or quality_report["missing_media"]
                    or quality_report["forbidden_claims"]
                    or quality_report["paragraph_too_long"]
                    or quality_report["theme_drift"]
                ) else "passed"
                attach_quality_report(post, quality_report)
                if quality_report["quality_gate_status"] != "passed":
                    quality_failures.append(
                        {
                            "topic_id": f"auto_{idx}",
                            "title": post.get("title", title),
                            "quality_report": quality_report,
                        }
                    )
                    continue

                ai_json = normalize_ai_post_v1(
                    title=post.get("title", title),
                    locale=locale,
                    paragraphs=protocol_paragraphs,
                    hero_image_url=hero_image,
                    tags=["editorial", "ai-generated"],
                )

                ContentPost.create(
                    id=f"ai_post_{ts}_{locale}_{idx}",
                    author="SmartWardrobe AI Editor",
                    time_str=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    title=post.get("title", title),
                    description=paragraphs[0].get("text", "")[:100] + "..." if paragraphs else "",
                    body_json=[],
                    ai_json=ai_json,
                    tags_json=["editorial", "ai-generated"],
                    hero_image=ai_json.get("hero", {}).get("image_url", ""),
                    images_json=_unique_images(paragraph_images),
                    stats_likes="0",
                    stats_comments="0",
                    locale=locale,
                )
        if quality_failures:
            return {
                "code": "CONTENT_QUALITY_FAILED",
                "message": "Generated article failed quality gate and was not inserted into ContentPost",
                "details": {"failures": quality_failures},
            }
    except Exception as exc:
        logging.error(f"Failed to insert into ContentPost: {exc}")
        return {
            "code": "DB_INSERT_FAILED",
            "message": "Failed to insert into ContentPost",
            "details": {"error": str(exc)},
        }
    finally:
        if was_closed and not db.is_closed():
            db.close()
    return None
