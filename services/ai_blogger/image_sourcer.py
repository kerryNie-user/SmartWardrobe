import urllib.parse
import logging
import random
import requests
import re
import os
import json
from functools import lru_cache
from urllib.parse import urlparse

logging.basicConfig(level=logging.INFO)


def _is_network_url(url: str | None) -> bool:
    parsed = urlparse(str(url or "").strip())
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _is_low_quality_bing_url(url: str | None) -> bool:
    parsed = urlparse(str(url or "").strip())
    host = parsed.netloc.lower().replace("www.", "")
    path = parsed.path.lower()
    blocked_hosts = (
        "youtube.com",
        "youtu.be",
        "gifer.com",
        "giphy.com",
        "reddit.com",
        "facebook.com",
        "fbcdn.net",
        "lookaside.fbsbx.com",
        "amazon.com",
        "media-amazon.com",
        "pinimg.com",
        "pinterest.",
        "ibooks-japan.com",
        "gystars.com",
    )
    if any(blocked in host for blocked in blocked_hosts):
        return True
    if path.endswith((".gif", ".svg")) or "/vector/" in path:
        return True
    return False


def get_image_from_met(query: str) -> str | None:
    """
    Search The Met's open access collection for high-quality vintage/art images.
    """
    search_url = f"https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q={urllib.parse.quote(query)}"
    try:
        res = requests.get(search_url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            if data.get("total", 0) > 0:
                object_ids = data["objectIDs"][:5]
                chosen_id = random.choice(object_ids)
                
                obj_url = f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{chosen_id}"
                obj_res = requests.get(obj_url, timeout=10)
                if obj_res.status_code == 200:
                    obj_data = obj_res.json()
                    img_url = obj_data.get("primaryImage") or obj_data.get("primaryImageSmall")
                    if _is_network_url(img_url):
                        return img_url
    except Exception as e:
        logging.warning(f"Met API Error for '{query}': {e}")
    return None

@lru_cache(maxsize=128)
def get_pexels_candidates(query: str, per_page: int = 5) -> list[str]:
    """
    Returns high-resolution images from Pexels.
    Priority: PEXELS_API_KEY environment variable.
    Fallback: Scrapes HTML without an API key.
    """
    search_terms = urllib.parse.quote(query)
    
    api_key = os.environ.get("PEXELS_API_KEY")
    if api_key:
        api_url = f"https://api.pexels.com/v1/search?query={search_terms}&per_page={per_page}"
        headers = {"Authorization": api_key}
        try:
            res = requests.get(api_url, headers=headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                photos = data.get("photos", [])
                return [p.get("src", {}).get("large2x", p.get("src", {}).get("original")) for p in photos if "src" in p]
        except Exception as e:
            logging.warning(f"Pexels API Request Failed for '{query}': {e}. Falling back to HTML scraping.")
    else:
        logging.info("PEXELS_API_KEY not found, falling back to HTML scraping.")

    url = f"https://www.pexels.com/search/{search_terms}/"
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            # Extract image URLs from the HTML
            matches = re.findall(r'src="(https://images\.pexels\.com/photos/\d+/pexels-photo-\d+\.jpeg[^"]*)"', res.text)
            
            clean_urls = []
            for m in matches:
                # Force high resolution and specific aspect ratios by replacing the query params
                base_url = m.split('?')[0]
                high_res = f"{base_url}?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                if high_res not in clean_urls:
                    clean_urls.append(high_res)
            return clean_urls[:per_page]
    except Exception as e:
        logging.warning(f"Pexels Scrape Failed for '{query}': {e}")
    return []


def _pexels_query_variants(query: str) -> list[str]:
    q = str(query or "").strip()
    variants = [q]
    replacements = [
        ("trousers", "pants"),
        ("pants", "trousers"),
        ("shirt", "blouse"),
        ("blouse", "shirt"),
        ("jumpsuit", "romper"),
        ("blazer", "suit"),
    ]
    for old, new in replacements:
        if old in q.lower():
            variants.append(re.sub(rf"\b{re.escape(old)}\b", new, q, flags=re.IGNORECASE))
    simplified = re.sub(r"\b(?:fashion|editorial|photography|outfit)\b", "", q, flags=re.IGNORECASE)
    simplified = re.sub(r"\s+", " ", simplified).strip()
    if simplified and simplified != q:
        variants.append(simplified)
    for modifier in ("full body", "street style", "portrait", "detail"):
        if modifier not in q.lower():
            variants.append(f"{q} {modifier}")
    out = []
    for item in variants:
        item = re.sub(r"\s+", " ", item).strip()
        if item and item not in out:
            out.append(item)
    return out


def _pexels_photo_cluster(url: str | None) -> str:
    match = re.search(r"/photos/(\d+)/", str(url or ""))
    if not match:
        return ""
    try:
        # Consecutive Pexels IDs often come from one shoot. Prefer other clusters first
        # so one article does not look like repeated crops of the same image.
        return str(int(match.group(1)) // 10)
    except ValueError:
        return ""


@lru_cache(maxsize=128)
def get_pexels_candidates_multi(query: str, per_page: int = 5) -> list[str]:
    grouped_urls = []
    for variant in _pexels_query_variants(query):
        urls = []
        for url in get_pexels_candidates(variant, per_page=per_page):
            if _is_network_url(url) and url not in urls:
                urls.append(url)
        if urls:
            grouped_urls.append(urls)

    prioritized = []
    deferred = []
    seen_urls = set()
    seen_clusters = set()
    max_group_len = max((len(group) for group in grouped_urls), default=0)
    for index in range(max_group_len):
        for group in grouped_urls:
            if index >= len(group):
                continue
            url = group[index]
            if url in seen_urls:
                continue
            seen_urls.add(url)
            cluster = _pexels_photo_cluster(url)
            if cluster and cluster in seen_clusters:
                deferred.append(url)
                continue
            if cluster:
                seen_clusters.add(cluster)
            prioritized.append(url)
            if len(prioritized) >= per_page:
                return prioritized[:per_page]

    for url in deferred:
        if url not in prioritized:
            prioritized.append(url)
        if len(prioritized) >= per_page:
            break
    return prioritized[:per_page]


def _bing_fallback_enabled() -> bool:
    return str(os.getenv("AI_BLOGGER_ENABLE_BING_FALLBACK", "")).strip().lower() in {"1", "true", "yes"}


def get_bing_candidates(query: str, per_page: int = 5) -> list[str]:
    """
    使用 Bing 搜索真实图片，并通过去重和随机抽样提高多样性。
    包含视角关键词轮换和基于图片域名的去重逻辑。
    """
    import urllib.parse
    from urllib.parse import urlparse
    import time
    import json

    # 策略 1: 视角关键词轮换 (打破默认聚合逻辑)
    perspectives = ["", " full body outfit", " fashion editorial", " portrait outfit"]
    enhanced_query = f"{query}{random.choice(perspectives)}"
    logging.info(f"Bing Search Query: {enhanced_query}")
    
    # 策略 2: 扩大请求基数来供筛选
    fetch_count = per_page * 5 
    extracted_images = []
    seen_domains = set()
    
    user_agents = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
    ]
    
    url = f"https://www.bing.com/images/search?q={urllib.parse.quote(enhanced_query)}"
    
    max_retries = 3
    for attempt in range(max_retries):
        headers = {
            "User-Agent": random.choice(user_agents),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }
        try:
            res = requests.get(url, headers=headers, timeout=15)
            res.raise_for_status()
            
            matches = re.findall(r'm="({[^}]*})"', res.text)
            results_list = []
            for m in matches:
                try:
                    clean_m = m.replace('&quot;', '"')
                    data = json.loads(clean_m)
                    if "murl" in data:
                        img_url = data["murl"].replace('&amp;', '&')
                        source_url = data.get("purl", "")
                        results_list.append({"image": img_url, "source": source_url})
                except Exception:
                    continue
                    
            # 策略 3: 随机打乱结果顺序
            random.shuffle(results_list)
            
            for item in results_list:
                if len(extracted_images) >= per_page:
                    break
                    
                img_url = item.get("image")
                source_url = item.get("source", "")
                
                # 策略 4: 基于图片域名去重
                img_domain = urlparse(img_url).netloc.lower().replace("www.", "")
                source_domain = urlparse(source_url).netloc.lower().replace("www.", "") if source_url else ""
                
                if not _is_network_url(img_url) or _is_low_quality_bing_url(img_url):
                    continue

                if img_domain in seen_domains or (source_domain and source_domain in seen_domains):
                    continue
                    
                seen_domains.add(img_domain)
                if source_domain:
                    seen_domains.add(source_domain)
                    
                extracted_images.append(img_url)
                
            if extracted_images:
                return extracted_images
                
        except Exception as e:
            logging.warning(f"Bing Request Failed for '{enhanced_query}' (Attempt {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(random.uniform(1, 3))
                
    return extracted_images

def get_image_candidates(query: str, config: dict, per_page: int = 5, force_ai: bool = False) -> list[dict]:
    """
    Returns a prioritized list of image dictionary objects.
    Priority 1: Pexels real images for consistent editorial quality
    Priority 2: The Met (if vintage/art/history)
    Priority 3: Bing Search Images as network fallback
    """
    q = query or "high fashion editorial photography"
    candidates = []

    remaining_slots = per_page

    # 1. Pexels search (higher visual consistency for fashion editorials)
    if remaining_slots > 0:
        pexels_urls = get_pexels_candidates_multi(q, per_page=remaining_slots)
        for url in pexels_urls:
            if _is_network_url(url):
                candidates.append({"source_type": "pexels", "original_url": url, "search_query": q})
        remaining_slots -= len(candidates)

    # 2. The Met (only for historical/artistic queries)
    if remaining_slots > 0 and any(kw in q.lower() for kw in ["vintage", "history", "art", "retro"]):
        met_url = get_image_from_met(q)
        if met_url:
            if _is_network_url(met_url):
                candidates.append({"source_type": "met", "original_url": met_url, "search_query": q})
                remaining_slots -= 1

    # 3. Bing Search (network fallback, opt-in because generic image search can return low-quality diagrams or unrelated media)
    if remaining_slots > 0 and _bing_fallback_enabled():
        bing_urls = get_bing_candidates(q, per_page=remaining_slots)
        added = 0
        for url in bing_urls:
            if _is_network_url(url):
                candidates.append({"source_type": "bing", "original_url": url, "search_query": q})
                added += 1
        remaining_slots -= added

    return candidates
