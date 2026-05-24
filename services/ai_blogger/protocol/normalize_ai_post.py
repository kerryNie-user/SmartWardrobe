import re
from typing import Any


SECTION_LABEL_RE = re.compile(
    r"^\s*(导语|深度解析|穿搭实操|穿搭误区|新闻速递|事件还原|行业影响|核心观点|引言|概念溯源|历史对照|当代语境|理论交锋|结语|introduction|deep dive|styling tips|common mistakes|runway news|event recap|industry impact|key takeaway|conclusion)\s*(?:—|--|-|:|：)\s*",
    re.IGNORECASE,
)


def _canonical_layout(layout: str) -> str:
    if layout == "pull_quote_center":
        return "quote_pull"
    if layout in {"split_image_text", "float_left_photo"}:
        return "split_image_left"
    if layout == "float_right_photo":
        return "split_image_right"
    if layout in {"lookbook_cards_3", "image_mosaic_3"}:
        return "gallery_3"
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
        return SECTION_LABEL_RE.sub("", text.strip()).strip()
    return SECTION_LABEL_RE.sub("", str(text).strip()).strip()


def _normalize_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    source = value if isinstance(value, list) else [value]
    return [str(item).strip() for item in source if str(item or "").strip()]


def _normalize_alts(value: Any, target_len: int) -> list[str]:
    source = value if isinstance(value, list) else ([value] if value is not None else [])
    alts = [str(item or "").strip() for item in source]
    if len(alts) < target_len:
        alts = [*alts, *["" for _ in range(target_len - len(alts))]]
    return alts[:target_len]


def _caption_text(value: Any) -> str:
    if isinstance(value, dict):
        for key in ("zh-CN", "zh_CN", "zh", "caption_zh", "image_caption", "caption", "text", "en-US", "en_US", "en"):
            text = _normalize_text(value.get(key))
            if text:
                return text
        return ""
    return _normalize_text(value)


def _normalize_captions(raw: dict, target_len: int) -> list[str]:
    source = raw.get("image_captions") or raw.get("imageCaptions") or raw.get("captions") or []
    if not source:
        source = raw.get("image_caption") or raw.get("caption") or []
    source_items = source if isinstance(source, list) else [source]
    captions = [_caption_text(item) for item in source_items]
    if len(captions) < target_len:
        captions = [*captions, *["" for _ in range(target_len - len(captions))]]
    return captions[:target_len]


def _attach_captions(block: dict, captions: list[str]) -> dict:
    if any(captions):
        block["image_captions"] = captions
    return block


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
    for idx, raw in enumerate(paragraphs or []):
        raw_text = _normalize_text(raw.get("text"))
        layout_name = _normalize_layout(raw.get("layout_name") or raw.get("layout"))

        image_urls = _normalize_string_list(raw.get("image_urls") or raw.get("imageUrls") or [])

        image_alts = _normalize_alts(raw.get("image_alts") or raw.get("imageAlts") or [], len(image_urls))
        image_captions = _normalize_captions(raw, len(image_urls))

        bullets = _split_bullets(raw_text)
        if bullets and layout_name == "text_dense":
            layout_name = "list_bullets"

        if layout_name in {"gallery_2", "gallery_3"} or (layout_name in {"text_dense", "hero_full_bleed"} and len(image_urls) >= 3):
            gallery_urls = []
            gallery_alts = []
            gallery_captions = []
            for img_idx, img_url in enumerate(image_urls[:3]):
                if img_url in used_image_urls:
                    continue
                used_image_urls.add(img_url)
                gallery_urls.append(img_url)
                gallery_alts.append(image_alts[img_idx] if img_idx < len(image_alts) else "")
                gallery_captions.append(image_captions[img_idx] if img_idx < len(image_captions) else "")
            if gallery_urls:
                normalized_paragraphs.append(_attach_captions({
                    "id": f"p{idx + 1}",
                    "layout": "gallery_3" if len(gallery_urls) >= 3 else "gallery_2",
                    "text": raw_text,
                    "image_urls": gallery_urls,
                    "image_alts": gallery_alts,
                }, gallery_captions))
            elif raw_text:
                normalized_paragraphs.append({
                    "id": f"p{idx + 1}",
                    "layout": "text_dense",
                    "text": raw_text,
                    "image_urls": [],
                    "image_alts": [],
                })
            continue

        limited_urls = []
        limited_alts = []
        limited_captions = []
        for img_idx, img_url in enumerate(image_urls[:1]):
            if img_url in used_image_urls:
                continue
            used_image_urls.add(img_url)
            limited_urls.append(img_url)
            alt = image_alts[img_idx] if img_idx < len(image_alts) else ""
            limited_alts.append(alt)
            limited_captions.append(image_captions[img_idx] if img_idx < len(image_captions) else "")

        text_out = raw_text

        normalized_paragraphs.append(_attach_captions({
            "id": f"p{idx + 1}",
            "layout": layout_name,
            "text": text_out,
            "image_urls": limited_urls,
            "image_alts": limited_alts
        }, limited_captions))

    hero_url = (hero_image_url or "").strip()
    if not hero_url:
        for para in normalized_paragraphs:
            if para.get("image_urls"):
                hero_url = para["image_urls"][0]
                break
    hero_caption = ""
    if hero_url:
        for para in normalized_paragraphs:
            urls = para.get("image_urls") or []
            if hero_url not in urls:
                continue
            image_index = urls.index(hero_url)
            captions = para.get("image_captions") or []
            hero_caption = captions[image_index] if image_index < len(captions) else ""
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
            "alt": str(title or "").strip(),
            "caption": hero_caption
        },
        "paragraphs": normalized_paragraphs
    }
