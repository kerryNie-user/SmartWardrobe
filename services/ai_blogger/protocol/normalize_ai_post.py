import re
from typing import Any


def _canonical_layout(layout: str) -> str:
    if layout == "pull_quote_center":
        return "quote_pull"
    if layout in {"split_image_text", "float_left_photo"}:
        return "split_image_left"
    if layout == "float_right_photo":
        return "split_image_right"
    return layout


def _normalize_layout(layout: str | None) -> str:
    if not layout:
        return "text_dense"
    layout = str(layout).strip()
    if not layout:
        return "text_dense"
    return _canonical_layout(layout)


def _normalize_text(text: Any) -> str:
    if text is None:
        return ""
    if isinstance(text, str):
        return text.strip()
    return str(text).strip()


def _split_bullets(text: str) -> list[str] | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    bullet_lines = []
    for line in lines:
        if line.startswith(("-", "•", "·")):
            bullet_lines.append(line.lstrip("-•·").strip())
    if len(bullet_lines) >= 3:
        return bullet_lines
    return None


def normalize_ai_post_v1(*, title: str, locale: str, paragraphs: list[dict], hero_image_url: str | None, tags: list[str] | None = None) -> dict:
    normalized_locale = "zh-CN" if locale == "zh-CN" else "en-US"
    normalized_tags = list(dict.fromkeys([*(tags or [])]))

    used_image_urls: set[str] = set()
    normalized_paragraphs = []
    gallery_source_layouts = {"lookbook_cards_3", "image_mosaic_3", "gallery_2", "gallery_3"}
    for idx, raw in enumerate(paragraphs or []):
        raw_text = _normalize_text(raw.get("text"))
        layout_name = _normalize_layout(raw.get("layout_name") or raw.get("layout"))

        image_urls = raw.get("image_urls") or raw.get("imageUrls") or []
        image_urls = [str(url).strip() for url in image_urls if str(url).strip()]

        image_alts = raw.get("image_alts") or raw.get("imageAlts") or []
        image_alts = [str(alt).strip() for alt in image_alts if str(alt).strip()]
        if len(image_alts) < len(image_urls):
            image_alts = [*image_alts, *["" for _ in range(len(image_urls) - len(image_alts))]]

        bullets = _split_bullets(raw_text)
        if bullets and layout_name == "text_dense":
            layout_name = "list_bullets"

        if layout_name in gallery_source_layouts or (layout_name in {"text_dense", "hero_full_bleed"} and len(image_urls) >= 3):
            for img_idx, img_url in enumerate(image_urls):
                if img_url in used_image_urls:
                    continue
                used_image_urls.add(img_url)
                alt = image_alts[img_idx] if img_idx < len(image_alts) else ""
                block_text = raw_text if img_idx == 0 and raw_text else (alt or raw_text)
                if not block_text:
                    block_text = str(title or "").strip()
                normalized_paragraphs.append({
                    "id": f"p{idx + 1}_{img_idx + 1}",
                    "layout": "split_image_left" if img_idx % 2 == 0 else "split_image_right",
                    "text": block_text,
                    "image_urls": [img_url],
                    "image_alts": [alt] if alt else []
                })
            continue

        limited_urls = []
        limited_alts = []
        for img_idx, img_url in enumerate(image_urls[:1]):
            if img_url in used_image_urls:
                continue
            used_image_urls.add(img_url)
            limited_urls.append(img_url)
            alt = image_alts[img_idx] if img_idx < len(image_alts) else ""
            if alt:
                limited_alts.append(alt)

        text_out = raw_text
        if not text_out and limited_alts:
            text_out = limited_alts[0]

        normalized_paragraphs.append({
            "id": f"p{idx + 1}",
            "layout": layout_name,
            "text": text_out,
            "image_urls": limited_urls,
            "image_alts": limited_alts
        })

    hero_url = (hero_image_url or "").strip()
    if not hero_url:
        for para in normalized_paragraphs:
            if para.get("image_urls"):
                hero_url = para["image_urls"][0]
                break

    for idx in range(1, len(normalized_paragraphs)):
        prev = normalized_paragraphs[idx - 1]
        cur = normalized_paragraphs[idx]
        if not prev.get("image_urls") or not cur.get("image_urls"):
            continue
        if cur.get("layout") not in {"split_image_left", "split_image_right"}:
            continue
        if prev.get("layout") not in {"split_image_left", "split_image_right"}:
            continue
        if prev["layout"] == cur["layout"]:
            cur["layout"] = "split_image_right" if cur["layout"] == "split_image_left" else "split_image_left"

    return {
        "schema": "ct_ai_post_v1",
        "language": normalized_locale,
        "title": str(title or "").strip(),
        "subtitle": None,
        "tags": normalized_tags,
        "hero": {
            "image_url": hero_url or "",
            "alt": str(title or "").strip()
        },
        "paragraphs": normalized_paragraphs
    }
