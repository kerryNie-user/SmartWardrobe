import argparse
import json
import os
import time
from datetime import datetime


def _now_ts() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _normalize_locale(locale: str) -> str:
    return "zh-CN" if locale == "zh-CN" else "en-US"


def _truncate(text: str, limit: int) -> str:
    value = str(text or "").strip()
    if len(value) <= limit:
        return value
    return value[:limit].rstrip() + "..."


def _ensure_reports_dir() -> str:
    reports_dir = os.path.join("services", "ai_blogger", "output", "reports")
    os.makedirs(reports_dir, exist_ok=True)
    return reports_dir


def _pick_description(ai_json: dict) -> str:
    for p in ai_json.get("paragraphs", []) or []:
        t = str(p.get("text") or "").strip()
        if t:
            return _truncate(t, 140)
    return _truncate(ai_json.get("title", ""), 140)


def _unique_preserve_order(items: list[str]) -> list[str]:
    seen = set()
    out = []
    for item in items:
        s = str(item or "").strip()
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", type=str, default="all", choices=["all", "zh-CN", "en-US"])
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--update-time", action="store_true")
    parser.add_argument("--batch-id", type=str, default="")
    parser.add_argument("--skip-if-ai", action="store_true")
    args = parser.parse_args()

    os.environ.setdefault("SQLITE_DB", os.path.join("services", "backend_lite", "data", "smartwardrobe_lite.db"))

    from services.backend_lite.database import db
    from services.backend_lite.models import ContentPost
    from services.ai_blogger.chain_runner import PromptChainRunner
    from services.ai_blogger.run_pipeline import ImageTracker
    from services.ai_blogger.protocol.normalize_ai_post import normalize_ai_post_v1

    locales = ["zh-CN", "en-US"] if args.locale == "all" else [args.locale]
    locales = [_normalize_locale(loc) for loc in locales]

    query = ContentPost.select().where(ContentPost.locale.in_(locales))
    posts = [p for p in query if "editorial" in (p.tags_json or [])]

    if args.limit and args.limit > 0:
        posts = posts[: args.limit]

    report = {
        "ts": _now_ts(),
        "dry_run": bool(args.dry_run),
        "update_time": bool(args.update_time),
        "batch_id": (args.batch_id or "").strip(),
        "skip_if_ai": bool(args.skip_if_ai),
        "locales": locales,
        "total": len(posts),
        "items": [],
    }

    for idx, post in enumerate(posts):
        started = time.time()
        item = {
            "id": post.id,
            "locale": post.locale,
            "title": post.title,
            "status": "pending",
            "image_count": 0,
            "error": None,
        }
        try:
            resolved_batch_id = (args.batch_id or report["ts"]).strip()
            if args.skip_if_ai and isinstance(post.ai_json, dict) and str(post.ai_json.get("schema") or "").strip() == "ct_ai_post_v1" and str(post.hero_image or "").strip():
                if args.dry_run:
                    item["status"] = "skipped"
                else:
                    with db.atomic():
                        post.batch_id = resolved_batch_id
                        if args.update_time:
                            post.time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        post.save()
                    item["status"] = "success"
                item["image_count"] = len(post.images_json or [])
                report["items"].append({**item, "elapsed_ms": int((time.time() - started) * 1000)})
                continue

            runner = PromptChainRunner(profile_name="editorial_styling", locale=post.locale)
            chain = runner.run_chain(raw_topic=post.title, seed_material=None)
            raw_paragraphs = chain.get("paragraphs", []) or []

            from pathlib import Path
            project_root = Path(__file__).resolve().parents[2]
            images_dir = project_root / "services" / "ai_blogger" / "output" / "images"
            images_dir.mkdir(parents=True, exist_ok=True)
            tracker = ImageTracker(images_dir=str(images_dir), max_images_total=50, download_images=True)

            paragraph_images: dict[int, list[str]] = {}
            paragraph_alts: dict[int, list[str]] = {}
            for p_idx, p in enumerate(raw_paragraphs):
                layout_name = str(p.get("layout_name") or "").strip()
                queries = list(p.get("image_queries", []) or [])
                for q in queries:
                    url, alt = tracker._resolve_media(q, idx=0, p_idx=p_idx, layout_name=layout_name, layout_type="portrait_4_3")
                    if not url:
                        continue
                    paragraph_images.setdefault(p_idx, []).append(url)
                    if alt:
                        paragraph_alts.setdefault(p_idx, []).append(alt)

            protocol_paragraphs = []
            for p_idx, p in enumerate(raw_paragraphs):
                section_name = str(p.get("section_name", "") or "").strip()
                text = str(p.get("text", "") or "").strip()
                merged_text = f"{section_name} — {text}" if section_name else text
                protocol_paragraphs.append({
                    "layout_name": p.get("layout_name") or "",
                    "text": merged_text,
                    "image_urls": paragraph_images.get(p_idx, []),
                    "image_alts": paragraph_alts.get(p_idx, []),
                })

            hero_url = ""
            if paragraph_images.get(0):
                hero_url = paragraph_images[0][0]

            ai_json = normalize_ai_post_v1(
                title=chain.get("title") or post.title,
                locale=post.locale,
                paragraphs=protocol_paragraphs,
                hero_image_url=hero_url,
                tags=_unique_preserve_order(post.tags_json or ["editorial", "ai-generated"]),
            )

            all_images = []
            for urls in paragraph_images.values():
                all_images.extend(urls)
            all_images = _unique_preserve_order(all_images)

            item["image_count"] = len(all_images)

            if args.dry_run:
                item["status"] = "dry_run"
            else:
                with db.atomic():
                    post.ai_json = ai_json
                    post.hero_image = str((ai_json.get("hero") or {}).get("image_url") or "").strip()
                    post.images_json = all_images
                    post.description = _pick_description(ai_json)
                    post.body_json = []
                    post.batch_id = resolved_batch_id
                    if args.update_time:
                        post.time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    post.save()
                item["status"] = "success"
        except Exception as exc:
            item["status"] = "failed"
            item["error"] = str(exc)
        finally:
            item["elapsed_ms"] = int((time.time() - started) * 1000)
            report["items"].append(item)

    reports_dir = _ensure_reports_dir()
    report_path = os.path.join(reports_dir, f"regenerate_editorials_{report['ts']}.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(report_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
