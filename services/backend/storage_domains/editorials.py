from copy import deepcopy
import time
from urllib.parse import urlparse

from ..database import db
from ..models import ContentPost


class EditorialAdminMixin:
    def _is_network_image_url(self, value) -> bool:
        parsed = urlparse(str(value or '').strip())
        return parsed.scheme in {'http', 'https'} and bool(parsed.netloc)

    def _network_image_list(self, values) -> list[str]:
        out = []
        for value in values or []:
            url = str(value or '').strip()
            if self._is_network_image_url(url) and url not in out:
                out.append(url)
        return out

    def _sanitize_ai_media_payload(self, ai_json):
        if not isinstance(ai_json, dict):
            return ai_json
        if str(ai_json.get('schema') or '').strip() != 'ct_ai_post_v1':
            return ai_json

        sanitized = deepcopy(ai_json)
        first_network_url = ''
        for paragraph in sanitized.get('paragraphs', []) or []:
            if not isinstance(paragraph, dict):
                continue
            urls = paragraph.get('image_urls') or paragraph.get('imageUrls') or []
            alts = paragraph.get('image_alts') or paragraph.get('imageAlts') or []
            captions = paragraph.get('image_captions') or paragraph.get('imageCaptions') or paragraph.get('captions') or []
            filtered_urls = []
            filtered_alts = []
            filtered_captions = []
            for idx, url in enumerate(urls):
                clean_url = str(url or '').strip()
                if not self._is_network_image_url(clean_url):
                    continue
                if not first_network_url:
                    first_network_url = clean_url
                filtered_urls.append(clean_url)
                filtered_alts.append(str(alts[idx] or '').strip() if idx < len(alts) else '')
                filtered_captions.append(captions[idx] if idx < len(captions) else '')
            paragraph['image_urls'] = filtered_urls
            paragraph['image_alts'] = filtered_alts
            paragraph['image_captions'] = filtered_captions

        hero = sanitized.get('hero') if isinstance(sanitized.get('hero'), dict) else {}
        hero_url = str(hero.get('image_url') or '').strip()
        if not self._is_network_image_url(hero_url):
            hero['image_url'] = first_network_url
        sanitized['hero'] = hero
        return sanitized

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
            normalized = normalize_ai_post_v1(
                title=title,
                locale=locale,
                paragraphs=paragraphs,
                hero_image_url=hero_url,
                tags=tags
            )
            return self._sanitize_ai_media_payload(normalized)
        except Exception:
            return self._sanitize_ai_media_payload(ai_json)

    def _resolve_post_hero(self, post_data: dict) -> str:
        ai = post_data.get('ai')
        schema = str(ai.get('schema') or '').strip() if isinstance(ai, dict) else ''
        hero = str(post_data.get('heroImage') or '').strip()
        images = post_data.get('images') or []
        if schema == 'ct_ai_post_v1':
            candidates = [hero, *images]
            for candidate in candidates:
                clean_url = str(candidate or '').strip()
                if self._is_network_image_url(clean_url):
                    return clean_url
            return ''
        if hero:
            return hero
        if images:
            return str(images[0] or '').strip()
        return ''

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
                    if schema == 'ct_ai_post_v1' and self._is_network_image_url(hero):
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
                paragraph_captions = {}
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
                        if isinstance(q, dict):
                            caption = str(q.get('image_caption') or q.get('caption') or '').strip()
                            if caption:
                                paragraph_captions.setdefault(p_idx, []).append(caption)

                protocol_paragraphs = []
                for p_idx, para in enumerate(raw_paragraphs):
                    text_val = str(para.get('text', '') or '').strip()
                    protocol_paragraphs.append({
                        'layout_name': para.get('layout_name') or '',
                        'text': text_val,
                        'image_urls': paragraph_images.get(p_idx, []),
                        'image_alts': paragraph_alts.get(p_idx, []),
                        'image_captions': paragraph_captions.get(p_idx, [])
                    })

                hero_url = paragraph_images.get(0, [None])[0] or ''
                ai_json = self._sanitize_ai_media_payload(
                    normalize_ai_post_v1(
                        title=chain.get('title') or p.title,
                        locale=p.locale,
                        paragraphs=protocol_paragraphs,
                        hero_image_url=hero_url,
                        tags=unique_preserve(p.tags_json or ['editorial', 'ai-generated'])
                    )
                )

                all_images = []
                for urls in paragraph_images.values():
                    all_images.extend(urls)
                all_images = self._network_image_list(unique_preserve(all_images))
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
