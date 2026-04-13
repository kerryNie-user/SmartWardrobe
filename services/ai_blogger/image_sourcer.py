import urllib.parse
import requests

def get_image_for_topic(query, config):
    """
    Sources a real high-quality fashion image based on a search query.
    Uses the Unsplash frontend NAPI to get highly relevant, exact-match images,
    avoiding the randomness and deprecation of source.unsplash.com.
    """
    provider = config.get("image_provider", "unsplash_napi")
    
    if provider == "unsplash_napi" or provider == "unsplash_source":
        # clean query for exact results
        search_terms = urllib.parse.quote(query.lower())
        
        # Try Unsplash NAPI (the frontend API used by their website)
        napi_url = f"https://unsplash.com/napi/search/photos?query={search_terms}&per_page=5&orientation=landscape"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
        
        try:
            response = requests.get(napi_url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                if results:
                    return results[0]['urls']['regular']
        except Exception as e:
            print(f"NAPI Search Failed for '{query}': {e}")
            
        try:
            pexels_url = f"https://www.pexels.com/search/{search_terms}/"
            p_res = requests.get(pexels_url, headers=headers, timeout=5)
            if p_res.status_code == 200:
                import re
                match = re.search(r'src="(https://images\.pexels\.com/photos/[^"]+)"', p_res.text)
                if match:
                    return match.group(1).replace('?auto=compress&cs=tinysrgb&h=350', '?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')
        except Exception as e:
            print(f"Pexels Fallback Failed for '{query}': {e}")

        # Absolute last resort if both fail or we get rate limited
        return f"https://picsum.photos/1200/800?random={len(query)}"
        
    return "https://via.placeholder.com/1200x800?text=No+Provider"
