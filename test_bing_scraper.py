import requests
import re
import json

def get_bing_candidates(query: str, per_page: int = 5) -> list[str]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    url = f"https://www.bing.com/images/search?q={requests.utils.quote(query)}"
    
    try:
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        
        matches = re.findall(r'm="({[^}]*})"', res.text)
        
        extracted_images = []
        for m in matches:
            try:
                clean_m = m.replace('&quot;', '"')
                data = json.loads(clean_m)
                if "murl" in data:
                    img_url = data["murl"].replace('&amp;', '&')
                    extracted_images.append(img_url)
            except Exception as e:
                continue
                
            if len(extracted_images) >= per_page:
                break
                
        return extracted_images
    except Exception as e:
        print(f"Request failed: {e}")
        return []

if __name__ == "__main__":
    urls = get_bing_candidates("chanel haute couture runway", 5)
    for u in urls:
        print(u)
