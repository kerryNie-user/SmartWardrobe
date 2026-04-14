import urllib.parse
import logging
import random
import requests
import re

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
    Scrapes high-resolution images from Pexels HTML without an API key.
    """
    search_terms = urllib.parse.quote(query)
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

def get_image_candidates(query: str, config: dict, per_page: int = 5) -> list[str]:
    """
    Returns a prioritized list of image URLs.
    Priority 1: The Met (if vintage/art/history)
    Priority 2: Pexels Real Images
    Priority 3: Trae AI Text-to-Image Generation (Fallback)
    """
    q = query or "high fashion editorial photography"
    candidates = []
    
    # 1. The Met (for specific concepts)
    if any(kw in q.lower() for kw in ["vintage", "history", "art", "retro"]):
        met_url = get_image_from_met(q)
        if met_url:
            candidates.append(met_url)

    # 2. Pexels (Real high-quality photography)
    pexels_urls = get_pexels_candidates(q, per_page=per_page)
    candidates.extend(pexels_urls)
    
    # 3. Trae AI Fallbacks (Guaranteed to return an image, but generated)
    image_size = config.get("image_size", "portrait_4_3")
    
    # We add 2 AI fallback variations at the very end of the list
    for i in range(2):
        variation = f" variation {random.randint(1, 99999)}" if i > 0 else ""
        final_q = urllib.parse.quote(q + variation)
        trae_api_url = f"https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt={final_q}&image_size={image_size}"
        candidates.append(trae_api_url)
        
    return candidates
