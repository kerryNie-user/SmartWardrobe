import urllib.parse
import logging
import random
import requests
import re
import os

logging.basicConfig(level=logging.INFO)

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
                    if img_url:
                        return img_url
    except Exception as e:
        logging.warning(f"Met API Error for '{query}': {e}")
    return None

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

def get_ddgs_candidates(query: str, per_page: int = 5) -> list[str]:
    """
    使用 DuckDuckGo 搜索真实图片，并通过去重和随机抽样提高多样性。
    """
    try:
        from duckduckgo_search import DDGS
        from urllib.parse import urlparse
    except ImportError:
        logging.warning("duckduckgo_search package is not installed. Falling back to other sources.")
        return []

    # 策略 1: 视角关键词轮换 (打破默认聚合逻辑)
    perspectives = ["", " backstage", " close-up details", " runway full body", " street style"]
    enhanced_query = f"{query}{random.choice(perspectives)}"
    logging.info(f"DDGS Search Query: {enhanced_query}")
    
    # 策略 2: 扩大请求基数 (例如需要 5 张，请求 25 张来供筛选)
    fetch_count = per_page * 5 
    extracted_images = []
    seen_domains = set()
    
    try:
        with DDGS() as ddgs:
            results = ddgs.images(
                keywords=enhanced_query,
                region="wt-wt",
                safesearch="moderate",
                size="Large",         # 确保是高清大图
                type="photo",         # 限制为真实照片，过滤插画
                max_results=fetch_count,
            )
            
            # 策略 3: 随机打乱结果顺序，避免永远只拿排名最靠前的
            results_list = list(results)
            random.shuffle(results_list)
            
            for item in results_list:
                if len(extracted_images) >= per_page:
                    break
                    
                img_url = item.get("image")
                source_url = item.get("url") or item.get("source") or ""
                
                # 策略 4: 基于图片域名去重 (例如过滤掉同场同机位的 GettyImages 连拍)
                img_domain = urlparse(img_url).netloc.lower().replace("www.", "")
                source_domain = urlparse(source_url).netloc.lower().replace("www.", "")
                
                if img_domain in seen_domains or (source_domain and source_domain in seen_domains):
                    continue
                    
                seen_domains.add(img_domain)
                if source_domain:
                    seen_domains.add(source_domain)
                    
                extracted_images.append(img_url)
                
        return extracted_images
        
    except Exception as e:
        logging.warning(f"DDGS Request Failed for '{enhanced_query}': {e}")
        return []

def get_image_candidates(query: str, config: dict, per_page: int = 5, force_ai: bool = False) -> list[dict]:
    """
    Returns a prioritized list of image dictionary objects.
    Priority 1: The Met (if vintage/art/history)
    Priority 2: Pexels Real Images
    Priority 3: Trae AI Text-to-Image Generation (Fallback)
    """
    q = query or "high fashion editorial photography"
    candidates = []
    
    if not force_ai:
        # 0. DDGS (Highest priority for real event/news photos)
        ddgs_urls = get_ddgs_candidates(q, per_page=per_page)
        for url in ddgs_urls:
            candidates.append({"source_type": "ddgs", "original_url": url, "search_query": q})
            
        remaining_slots = per_page - len(ddgs_urls)
        
        if remaining_slots > 0:
            # 1. The Met Fallback for historical/artistic queries
            if any(kw in q.lower() for kw in ["vintage", "history", "art", "retro"]):
                met_url = get_image_from_met(q)
                if met_url:
                    candidates.append({"source_type": "met", "original_url": met_url, "search_query": q})
                    remaining_slots -= 1
    
            # 2. Pexels search (General high-quality stock photography)
            if remaining_slots > 0:
                pexels_urls = get_pexels_candidates(q, per_page=remaining_slots)
                for url in pexels_urls:
                    candidates.append({"source_type": "pexels", "original_url": url, "search_query": q})
    
    # 3. Trae AI Fallbacks (Guaranteed to return an image, but generated)
    image_size = config.get("image_size", "portrait_4_3")
    
    # We add 2 AI fallback variations at the very end of the list
    for i in range(2):
        variation = f" variation {random.randint(1, 99999)}" if i > 0 else ""
        final_q = urllib.parse.quote(q + variation)
        trae_api_url = f"https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt={final_q}&image_size={image_size}"
        candidates.append({"source_type": "trae_ai", "original_url": trae_api_url, "search_query": urllib.parse.unquote(final_q)})
        
    return candidates
