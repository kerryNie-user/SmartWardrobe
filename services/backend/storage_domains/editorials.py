import time

from ..database import db
from ..models import ContentPost


class EditorialAdminMixin:
    def _normalize_ai_payload(self, ai_json, post):
        if not ai_json:
            return None
        try:
            from services.ai_blogger.protocol.normalize_ai_post import normalize_ai_post_v1
            title = ai_json.get('title') or post.title
            hero_url = (ai_json.get('hero') or {}).get('image_url') or post.hero_image
            tags = ai_json.get('tags') or post.tags_json or []
            locale = post.locale
            paragraphs = ai_json.get('paragraphs') or []
            return normalize_ai_post_v1(
                title=title,
                locale=locale,
                paragraphs=paragraphs,
                hero_image_url=hero_url,
                tags=tags
            )
        except Exception:
            return ai_json

    def _pick_fallback_ai_image(self, post_id: str) -> str:
        try:
            from pathlib import Path
            project_root = Path(__file__).resolve().parents[3]
            image_dir = project_root / 'services' / 'ai_blogger' / 'output' / 'images'
            if not image_dir.exists():
                return ''
            files = sorted([
                p.name
                for p in image_dir.iterdir()
                if p.is_file() and p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}
            ])
            if not files:
                return ''
            idx = abs(hash(post_id)) % len(files)
            return f"/ai-images/{files[idx]}"
        except Exception:
            return ''

    def _resolve_post_hero(self, post_data: dict) -> str:
        ai = post_data.get('ai')
        schema = str(ai.get('schema') or '').strip() if isinstance(ai, dict) else ''
        allow_ai_image_alias = schema == 'ct_ai_post_v1'
        hero = str(post_data.get('heroImage') or '').strip()
        if hero:
            if allow_ai_image_alias and hero.startswith('images/'):
                return f"/ai-images/{hero.split('/')[-1]}"
            return hero
        images = post_data.get('images') or []
        if images:
            first = str(images[0] or '').strip()
            if allow_ai_image_alias and first.startswith('images/'):
                return f"/ai-images/{first.split('/')[-1]}"
            return first
        return self._pick_fallback_ai_image(str(post_data.get('id') or ''))

    def regenerate_editorials(self, *, locale: str = 'all', limit: int = 0, dry_run: bool = False, update_time: bool = False, batch_id: str | None = None, skip_if_ai: bool = False):
        from datetime import datetime
        from services.ai_blogger.chain_runner import PromptChainRunner
        from services.ai_blogger.run_pipeline import ImageTracker
        from services.ai_blogger.protocol.normalize_ai_post import normalize_ai_post_v1

        def normalize_locale(value: str) -> str:
            return 'zh-CN' if value == 'zh-CN' else 'en-US'

        def unique_preserve(items):
            seen = set()
            out = []
            for it in items or []:
                s = str(it or '').strip()
                if not s or s in seen:
                    continue
                seen.add(s)
                out.append(s)
            return out

        def pick_description(ai_json):
            for p in ai_json.get('paragraphs', []) or []:
                t = str(p.get('text') or '').strip()
                if t:
                    return (t[:140].rstrip() + '...') if len(t) > 140 else t
            title = str(ai_json.get('title') or '').strip()
            return (title[:140].rstrip() + '...') if len(title) > 140 else title

        locales = ['zh-CN', 'en-US'] if locale == 'all' else [normalize_locale(locale)]
        posts = ContentPost.select().where(ContentPost.locale.in_(locales))
        editorials = [p for p in posts if 'editorial' in (p.tags_json or [])]
        if limit and int(limit) > 0:
            editorials = editorials[: int(limit)]

        resolved_batch_id = str(batch_id or datetime.now().strftime('%Y%m%d%H%M%S')).strip()
        report = {
            'locale': locale,
            'limit': int(limit or 0),
            'dryRun': bool(dry_run),
            'updateTime': bool(update_time),
            'batchId': resolved_batch_id,
            'total': len(editorials),
            'items': []
        }

        for p in editorials:
            started = int(time.time() * 1000)
            item = {'id': p.id, 'locale': p.locale, 'title': p.title, 'status': 'pending', 'imageCount': 0, 'error': None}
            try:
                if skip_if_ai and p.ai_json and isinstance(p.ai_json, dict):
                    schema = str(p.ai_json.get('schema') or '').strip()
                    hero = str(p.hero_image or '').strip()
                    if schema == 'ct_ai_post_v1' and hero:
                        if dry_run:
                            item['status'] = 'skipped'
                        else:
                            with db.atomic():
                                p.batch_id = resolved_batch_id
                                if update_time:
                                    p.time_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                p.save()
                            item['status'] = 'success'
                        item['imageCount'] = len(p.images_json or [])
                        report['items'].append({**item, 'elapsedMs': int(time.time() * 1000) - started})
                        continue

                runner = PromptChainRunner(profile_name='editorial_styling', locale=p.locale)
                chain = runner.run_chain(raw_topic=p.title, seed_material=None)
                raw_paragraphs = chain.get('paragraphs', []) or []

                from pathlib import Path
                project_root = Path(__file__).resolve().parents[3]
                images_dir = project_root / 'services' / 'ai_blogger' / 'output' / 'images'
                images_dir.mkdir(parents=True, exist_ok=True)
                tracker = ImageTracker(images_dir=str(images_dir), max_images_total=50, download_images=True)
                paragraph_images = {}
                paragraph_alts = {}
                for p_idx, para in enumerate(raw_paragraphs):
                    layout_name = str(para.get('layout_name') or '').strip()
                    queries = list(para.get('image_queries', []) or [])
                    for q in queries:
                        url, alt = tracker._resolve_media(q, idx=0, p_idx=p_idx, layout_name=layout_name, layout_type='portrait_4_3')
                        if not url:
                            continue
                        paragraph_images.setdefault(p_idx, []).append(url)
                        if alt:
                            paragraph_alts.setdefault(p_idx, []).append(alt)

                protocol_paragraphs = []
                for p_idx, para in enumerate(raw_paragraphs):
                    section_name = str(para.get('section_name', '') or '').strip()
                    text_val = str(para.get('text', '') or '').strip()
                    merged_text = f"{section_name} — {text_val}" if section_name else text_val
                    protocol_paragraphs.append({
                        'layout_name': para.get('layout_name') or '',
                        'text': merged_text,
                        'image_urls': paragraph_images.get(p_idx, []),
                        'image_alts': paragraph_alts.get(p_idx, [])
                    })

                hero_url = paragraph_images.get(0, [None])[0] or ''
                ai_json = normalize_ai_post_v1(
                    title=chain.get('title') or p.title,
                    locale=p.locale,
                    paragraphs=protocol_paragraphs,
                    hero_image_url=hero_url,
                    tags=unique_preserve(p.tags_json or ['editorial', 'ai-generated'])
                )

                all_images = []
                for urls in paragraph_images.values():
                    all_images.extend(urls)
                all_images = unique_preserve(all_images)
                item['imageCount'] = len(all_images)

                if dry_run:
                    item['status'] = 'dry_run'
                else:
                    with db.atomic():
                        p.ai_json = ai_json
                        p.hero_image = str((ai_json.get('hero') or {}).get('image_url') or '').strip()
                        p.images_json = all_images
                        p.description = pick_description(ai_json)
                        p.body_json = []
                        p.batch_id = resolved_batch_id
                        if update_time:
                            p.time_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                        p.save()
                    item['status'] = 'success'
            except Exception as exc:
                item['status'] = 'failed'
                item['error'] = str(exc)
            item['elapsedMs'] = int(time.time() * 1000) - started
            report['items'].append(item)

        return report

    def cleanup_editorials_keep_batch(self, *, locale: str = 'all', keep_batch_id: str | None = None, dry_run: bool = False):
        def normalize_locale(value: str) -> str:
            return 'zh-CN' if value == 'zh-CN' else 'en-US'

        locales = ['zh-CN', 'en-US'] if locale == 'all' else [normalize_locale(locale)]
        posts = ContentPost.select().where(ContentPost.locale.in_(locales))
        editorials = [p for p in posts if 'editorial' in (p.tags_json or [])]

        inferred_latest = None
        for p in editorials:
            bid = str(getattr(p, 'batch_id', '') or '').strip()
            if not bid:
                continue
            if inferred_latest is None or bid > inferred_latest:
                inferred_latest = bid

        resolved_keep = str(keep_batch_id or inferred_latest or '').strip()
        to_delete = [p.id for p in editorials if str(getattr(p, 'batch_id', '') or '').strip() != resolved_keep]

        deleted = 0
        if not dry_run and to_delete:
            deleted = ContentPost.delete().where(ContentPost.id.in_(to_delete)).execute()

        return {
            'locale': locale,
            'dryRun': bool(dry_run),
            'keepBatchId': resolved_keep,
            'totalEditorials': len(editorials),
            'toDelete': len(to_delete),
            'deleted': int(deleted)
        }
