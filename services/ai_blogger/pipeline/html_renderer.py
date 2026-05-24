from __future__ import annotations

import logging
import os
import re
from datetime import datetime
from html import escape

from services.ai_blogger.chain_runner import assess_post_quality, attach_quality_report
from services.ai_blogger.pipeline.images import ImageTracker, is_network_image_url


def load_html_template() -> str:
    template_path = os.path.join(os.path.dirname(__file__), "..", "templates", "editorial_layout.html")
    template_path = os.path.abspath(template_path)
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    logging.warning(f"Template not found at {template_path}, falling back to minimal HTML.")
    return "<html><body>{content}</body></html>"


def render_media_for_layout(tracker: ImageTracker, q: dict | str, *, idx: int, p_idx: int, layout_name: str, layout_type: str) -> str:
    return tracker.render_media_block(q, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type=layout_type)


def _safe(value: object) -> str:
    return escape(str(value or ""), quote=True)


def _render_direct_media(url: object, alt: object) -> str:
    safe_url = _safe(url)
    if not safe_url:
        return ""
    return f'<img src="{safe_url}" alt="{_safe(alt)}" loading="lazy">'


def _render_media_slot(
    *,
    tracker: ImageTracker,
    paragraph: dict,
    image_queries: list,
    image_index: int,
    idx: int,
    p_idx: int,
    layout_name: str,
    layout_type: str,
) -> str:
    image_urls = [str(url).strip() for url in (paragraph.get("image_urls") or paragraph.get("imageUrls") or []) if str(url).strip()]
    image_alts = [str(alt).strip() for alt in (paragraph.get("image_alts") or paragraph.get("imageAlts") or []) if str(alt).strip()]
    if image_index < len(image_urls):
        alt = image_alts[image_index] if image_index < len(image_alts) else paragraph.get("section_name", "")
        return _render_direct_media(image_urls[image_index], alt)

    q = image_queries[image_index] if image_index < len(image_queries) else ""
    return render_media_for_layout(tracker, q, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type=layout_type)


def _has_topic_hero_image(tracker: ImageTracker, idx: int, post: dict) -> bool:
    paragraphs = post.get("paragraphs", []) if isinstance(post, dict) else []
    first = paragraphs[0] if paragraphs and isinstance(paragraphs[0], dict) else {}
    existing_urls = [
        str(url).strip()
        for url in (first.get("image_urls") or first.get("imageUrls") or [])
        if is_network_image_url(url)
    ]
    if existing_urls:
        return True
    for detail in tracker.image_details:
        url = str(detail.get("original_url") or detail.get("served_url") or "").strip()
        if detail.get("topic_id") == f"auto_{idx}" and detail.get("paragraph_index") == 0 and is_network_image_url(url):
            return True
    return False


def _merge_quality_report(post: dict, report: dict) -> dict:
    existing = post.get("quality_report") if isinstance(post.get("quality_report"), dict) else {}
    missing_media = []
    seen_missing = set()
    for item in [*(existing.get("missing_media", []) or []), *(report.get("missing_media", []) or [])]:
        key = (
            item.get("paragraph_index") if isinstance(item, dict) else "",
            item.get("search_query") if isinstance(item, dict) else str(item),
        )
        if key in seen_missing:
            continue
        seen_missing.add(key)
        missing_media.append(item)
    merged = {
        "missing_hero": bool(report.get("missing_hero")),
        "missing_media": missing_media,
        "forbidden_claims": existing.get("forbidden_claims", report.get("forbidden_claims", [])),
        "paragraph_too_long": existing.get("paragraph_too_long", report.get("paragraph_too_long", [])),
        "theme_drift": existing.get("theme_drift", report.get("theme_drift", [])),
    }
    merged["quality_gate_status"] = "failed" if (
        merged["missing_hero"] or merged["missing_media"] or merged["forbidden_claims"] or merged["paragraph_too_long"] or merged["theme_drift"]
    ) else "passed"
    return attach_quality_report(post, merged).get("quality_report", merged)


def _topic_missing_media(tracker: ImageTracker, idx: int) -> list[dict]:
    return [
        detail
        for detail in getattr(tracker, "missing_image_details", [])
        if detail.get("topic_id") == f"auto_{idx}"
    ]


def _render_list_text(text: object) -> str:
    lines = [line.strip() for line in str(text or "").splitlines() if line.strip()]
    bullet_lines = []
    for line in lines:
        if line.startswith(("-", "•", "·")):
            bullet_lines.append(line.lstrip("-•·").strip())
    if bullet_lines:
        return f'<ul class="layout-list">{"".join(f"<li>{_safe(item)}</li>" for item in bullet_lines)}</ul>'
    return f'<div class="text-content">{_safe(text)}</div>'


def _strip_duplicate_section_prefix(text: object, section_name: object) -> str:
    cleaned_text = str(text or "").strip()
    cleaned_section = str(section_name or "").strip()
    if not cleaned_text or not cleaned_section:
        return cleaned_text

    escaped_section = re.escape(cleaned_section)
    prefix_pattern = re.compile(
        rf"^\s*(?:[【\[]\s*{escaped_section}\s*[】\]]|{escaped_section}\s*[:：\-—])\s*"
    )
    return prefix_pattern.sub("", cleaned_text, count=1).strip()


def render_post_html(*, idx: int, title: str, post: dict, tracker: ImageTracker, include_divider: bool, rendered_at: datetime | None = None) -> str:
    now = rendered_at or datetime.now()
    paragraphs = post.get("paragraphs", [])
    safe_title = _safe(post.get("title", title))
    post_html = f"""
        <div class="post clearfix">
            <h2 class="post-title">{safe_title}</h2>
            <div class="post-meta">By SmartWardrobe AI Editor | {now.strftime('%B %d, %Y')}</div>
        """

    for p_idx, paragraph in enumerate(paragraphs):
        section_name = paragraph.get("section_name", "")
        text = _strip_duplicate_section_prefix(paragraph.get("text", ""), section_name)
        layout_name = paragraph.get("layout_name") or paragraph.get("layout") or ""
        image_queries = list(paragraph.get("image_queries", []))
        safe_layout = _safe(layout_name)
        safe_text = (
            f"<strong>{_safe(section_name)}</strong> - {_safe(text)}"
            if str(section_name or "").strip()
            else _safe(text)
        )

        if layout_name == "pull_quote_center":
            post_html += f'<div class="layout-pull-quote" data-layout="{safe_layout}">{_safe(text)}</div>'
            continue

        if layout_name == "tip_box_rules":
            post_html += f'<div class="layout-tip-box" data-layout="{safe_layout}"><div class="text-content">{safe_text}</div></div>'
            continue

        if layout_name == "list_bullets":
            post_html += f'<div class="layout-list-box" data-layout="{safe_layout}">{_render_list_text(text)}</div>'
            continue

        post_html += f'<div class="paragraph-block clearfix" data-layout="{safe_layout}">'

        if layout_name in {"split_image_text", "split_image_left", "split_image_right"}:
            media = _render_media_slot(
                tracker=tracker,
                paragraph=paragraph,
                image_queries=image_queries,
                image_index=0,
                idx=idx,
                p_idx=p_idx,
                layout_name=layout_name,
                layout_type="portrait_4_3",
            )
            if layout_name == "split_image_right":
                split_inner = f"""
                    <div class="split-text text-content">{safe_text}</div>
                    <div class="split-media">{media}</div>
                    """
            else:
                split_inner = f"""
                    <div class="split-media">{media}</div>
                    <div class="split-text text-content">{safe_text}</div>
                    """
            post_html += f'<div class="layout-split">{split_inner}</div>'
            post_html += "</div>"
            continue

        if layout_name == "float_left_photo":
            media = _render_media_slot(
                tracker=tracker,
                paragraph=paragraph,
                image_queries=image_queries,
                image_index=0,
                idx=idx,
                p_idx=p_idx,
                layout_name=layout_name,
                layout_type="portrait_4_3",
            )
            post_html += f'<div class="layout-float-left">{media}</div>'
            post_html += f'<div class="text-content">{safe_text}</div>'
            post_html += "</div>"
            continue

        if layout_name == "float_right_photo":
            media = _render_media_slot(
                tracker=tracker,
                paragraph=paragraph,
                image_queries=image_queries,
                image_index=0,
                idx=idx,
                p_idx=p_idx,
                layout_name=layout_name,
                layout_type="portrait_4_3",
            )
            post_html += f'<div class="layout-float-right">{media}</div>'
            post_html += f'<div class="text-content">{safe_text}</div>'
            post_html += "</div>"
            continue

        if layout_name == "lookbook_cards_3":
            cards = []
            for card_idx in range(3):
                media = _render_media_slot(
                    tracker=tracker,
                    paragraph=paragraph,
                    image_queries=image_queries,
                    image_index=card_idx,
                    idx=idx,
                    p_idx=p_idx,
                    layout_name=layout_name,
                    layout_type="portrait_4_3",
                )
                cards.append(
                    f"""
                        <div class="look-card">
                            <div class="look-media">{media}</div>
                            <div class="look-title">Look {card_idx + 1}</div>
                        </div>
                        """
                )
            post_html += f'<div class="layout-lookbook">{"".join(cards)}</div>'
            post_html += f'<div class="text-content">{safe_text}</div>'
            post_html += "</div>"
            continue

        if layout_name == "image_mosaic_3":
            items = [
                f'<div class="mosaic-item">{_render_media_slot(tracker=tracker, paragraph=paragraph, image_queries=image_queries, image_index=media_idx, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type="square")}</div>'
                for media_idx in range(3)
            ]
            post_html += f'<div class="layout-mosaic">{"".join(items)}</div>'
            post_html += f'<div class="text-content">{safe_text}</div>'
            post_html += "</div>"
            continue

        media = _render_media_slot(
            tracker=tracker,
            paragraph=paragraph,
            image_queries=image_queries,
            image_index=0,
            idx=idx,
            p_idx=p_idx,
            layout_name=layout_name,
            layout_type="landscape_16_9",
        )
        if media:
            post_html += f'<div class="layout-hero">{media}</div>'

        drop_cap_class = "drop-cap" if p_idx == 0 else ""
        post_html += f'<div class="text-content {drop_cap_class}">{safe_text}</div>'
        post_html += "</div>"

    post_html += "</div>"
    if include_divider:
        post_html += '<div class="divider">✦ ✦ ✦</div>'
    return post_html


def build_report_articles_and_html(results: list[tuple[int, str, dict | None, dict | None]], tracker: ImageTracker) -> tuple[list[dict], str]:
    report_articles = []
    html_parts = []
    success_total = len(results)

    for result_index, (idx, title, post, error) in enumerate(results):
        if error is not None:
            report_articles.append(
                {
                    "topic_id": f"auto_{idx}",
                    "title": title,
                    "status": "failed",
                    "error": error,
                }
            )
            continue

        if post.get("_quality_gate_failed"):
            report_articles.append(
                {
                    "topic_id": f"auto_{idx}",
                    "title": post.get("title", title),
                    "status": "failed",
                    "error": {
                        "code": "CONTENT_QUALITY_FAILED",
                        "message": "Generated article failed quality gate",
                        "details": post.get("quality_report", {}),
                    },
                    "quality_report": post.get("quality_report", {}),
                }
            )
            continue

        rendered_html = render_post_html(
            idx=idx,
            title=title,
            post=post,
            tracker=tracker,
            include_divider=result_index < success_total - 1,
        )
        quality_report = _merge_quality_report(
            post,
            assess_post_quality(
                post,
                has_source=True,
                missing_hero=not _has_topic_hero_image(tracker, idx, post),
                missing_media=_topic_missing_media(tracker, idx),
                visual_anchor=post.get("visual_anchor") if isinstance(post.get("visual_anchor"), dict) else None,
            ),
        )
        if quality_report.get("quality_gate_status") != "passed":
            report_articles.append(
                {
                    "topic_id": f"auto_{idx}",
                    "title": post.get("title", title),
                    "status": "failed",
                    "error": {
                        "code": "CONTENT_QUALITY_FAILED",
                        "message": "Generated article failed quality gate",
                        "details": quality_report,
                    },
                    "quality_report": quality_report,
                }
            )
            continue

        paragraphs = post.get("paragraphs", [])
        unique_layouts = len({p.get("layout_name") for p in paragraphs})
        report_articles.append(
            {
                "topic_id": f"auto_{idx}",
                "title": post.get("title", title),
                "paragraph_count": len(paragraphs),
                "unique_layouts": unique_layouts,
                "status": "success",
                "quality_report": quality_report,
            }
        )
        html_parts.append(rendered_html)

    return report_articles, "".join(html_parts)


def write_html(html_path: str, html_content: str) -> None:
    final_html = load_html_template().replace("{content}", html_content)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(final_html)
