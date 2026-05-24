from __future__ import annotations

import logging
import os
from io import BytesIO
from html import escape
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from services.ai_blogger.image_sourcer import get_image_candidates
from services.ai_blogger.metrics.image_dedupe import ImageDedupe
from services.ai_blogger.metrics.perceptual_dedupe import PerceptualDedupe

NETWORK_SOURCE_TYPES = {"met", "bing", "pexels", "direct"}


def is_network_image_url(url: object) -> bool:
    parsed = urlparse(str(url or "").strip())
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


class ImageTracker:
    def __init__(self, images_dir: str, max_images_total: int, download_images: bool):
        self.images_dir = images_dir
        self.max_images_total = max_images_total
        self.download_images = download_images

        self.dedupe = ImageDedupe()
        self.perceptual_dedupe = PerceptualDedupe(threshold=int(os.getenv("AI_BLOGGER_PHASH_THRESHOLD", "5")))
        self.enable_perceptual_dedupe = str(os.getenv("AI_BLOGGER_PHASH_DEDUPE", "true") or "true").strip().lower() != "false"
        self.used_urls = set()

        self.downloaded_images = 0
        self.attempted_images = 0
        self.failed_images = 0
        self.placeholder_images = 0
        self.duplicate_hashes = 0
        self.duplicate_perceptual = 0
        self.skipped_used_url = 0
        self.image_details = []
        self.missing_image_details = []

        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET"],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _looks_like_pending_ai_placeholder(self, content: bytes, source_type: str) -> bool:
        if str(source_type or "").lower() != "trae_ai":
            return False
        try:
            from PIL import Image, ImageStat

            image = Image.open(BytesIO(content)).convert("RGB")
            width, height = image.size
            mean = ImageStat.Stat(image).mean
            # Trae may return a valid JPEG placeholder while the image is still generating.
            # It is a large, nearly square, very pale card rather than a fashion image.
            return abs(width - height) <= 4 and min(width, height) >= 1500 and all(channel > 220 for channel in mean)
        except Exception:
            return False

    def _record_missing_image(self, *, idx: int, p_idx: int, search_q: str, alt_text: str, layout_name: str) -> None:
        self.missing_image_details.append(
            {
                "topic_id": f"auto_{idx}",
                "search_query": search_q,
                "alt_text": alt_text,
                "layout_name": layout_name,
                "paragraph_index": p_idx,
            }
        )

    def _resolve_media(self, q: dict | str, idx: int, p_idx: int, layout_name: str, layout_type: str = "portrait_4_3") -> tuple[str, str]:
        if not q:
            return "", ""

        direct_url = None
        if isinstance(q, dict):
            search_q = q.get("search_keyword", "")
            alt_text = q.get("image_alt") or q.get("alt_text") or q.get("image_caption") or search_q
            caption_text = q.get("image_caption") or q.get("caption") or ""
            direct_url = q.get("_direct_url")
        else:
            search_q = str(q)
            alt_text = search_q
            caption_text = ""

        if not search_q and not direct_url:
            return "", ""

        if self.download_images and self.downloaded_images < self.max_images_total:
            current_img_config = {"image_size": layout_type}

            if direct_url:
                candidates = [{"original_url": direct_url, "source_type": "direct", "search_query": search_q or "REAL_NEWS_IMAGE"}]
            else:
                is_hero = layout_name == "hero_full_bleed" or p_idx == 0
                if is_hero:
                    current_img_config["image_size"] = "landscape_16_9"

                candidate_count = int(os.getenv("AI_BLOGGER_IMAGE_CANDIDATES_PER_QUERY", "12") or "12")
                candidates = get_image_candidates(search_q, current_img_config, per_page=candidate_count)

            headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
            for cand in candidates:
                url = cand.get("original_url", "")
                source_type = str(cand.get("source_type", "Unknown")).strip().lower()
                cand_search_query = cand["search_query"]

                if source_type not in NETWORK_SOURCE_TYPES:
                    logging.info("Skipping non-network image candidate '%s' for query '%s'.", source_type, cand_search_query)
                    continue

                if not is_network_image_url(url):
                    logging.info("Skipping non-network image URL '%s' for query '%s'.", url, cand_search_query)
                    continue

                if url in self.used_urls:
                    self.skipped_used_url += 1
                    continue

                try:
                    self.attempted_images += 1
                    res = self.session.get(url, headers=headers, timeout=15)

                    if res.status_code != 200:
                        continue

                    content_type = res.headers.get("Content-Type", "")
                    if not content_type.startswith("image/"):
                        continue

                    if self._looks_like_pending_ai_placeholder(res.content, source_type):
                        self.placeholder_images += 1
                        continue

                    if not self.dedupe.register(res.content):
                        self.duplicate_hashes += 1
                        continue

                    if self.enable_perceptual_dedupe:
                        try:
                            if not self.perceptual_dedupe.register(res.content):
                                self.duplicate_perceptual += 1
                                continue
                        except Exception:
                            pass

                    self.downloaded_images += 1
                    self.used_urls.add(url)
                    self.image_details.append(
                        {
                            "topic_id": f"auto_{idx}",
                            "source_type": source_type,
                            "original_url": url,
                            "search_query": cand_search_query,
                            "served_url": url,
                            "file_name": "",
                            "alt_text": alt_text,
                            "caption": caption_text,
                            "layout_name": layout_name,
                            "paragraph_index": p_idx,
                        }
                    )
                    return url, alt_text
                except Exception as exc:
                    logging.warning(f"Failed to fetch real image {url}: {exc}")

            self.failed_images += 1
            self._record_missing_image(idx=idx, p_idx=p_idx, search_q=search_q, alt_text=alt_text, layout_name=layout_name)
            logging.error(f"All attempts failed to fetch an image for: {search_q}")
            return "", alt_text

        if self.download_images:
            self.failed_images += 1
            self._record_missing_image(idx=idx, p_idx=p_idx, search_q=search_q, alt_text=alt_text, layout_name=layout_name)
        return "", alt_text

    def render_media_block(self, q: dict | str, idx: int, p_idx: int, layout_name: str, layout_type: str = "portrait_4_3") -> str:
        url, alt_text = self._resolve_media(q, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type=layout_type)
        safe_alt = escape(str(alt_text or ""), quote=True)
        if url:
            return f'<img src="{escape(str(url), quote=True)}" alt="{safe_alt}" loading="lazy">'
        return ""
