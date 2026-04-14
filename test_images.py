import requests
import urllib.parse
import re

def test_pexels_scraper(query):
    search_terms = urllib.parse.quote(query)
    url = f"https://www.pexels.com/search/{search_terms}/"
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    try:
        res = requests.get(url, headers=headers, timeout=10)
        print('Pexels Status:', res.status_code)
        if res.status_code == 200:
            # Pexels embeds state in a script tag or JSON
            # Let's find all high res images
            matches = re.findall(r'src="(https://images\.pexels\.com/photos/\d+/pexels-photo-\d+\.jpeg[^"]*)"', res.text)
            
            # Clean them up to high res
            clean_urls = []
            for m in matches:
                # Remove query params or replace with high res
                base_url = m.split('?')[0]
                high_res = f"{base_url}?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                if high_res not in clean_urls:
                    clean_urls.append(high_res)
                    
            print(f"Found {len(clean_urls)} images.")
            for u in clean_urls[:3]:
                print(u)
    except Exception as e:
        print(f"Pexels Scrape Failed: {e}")

if __name__ == '__main__':
    test_pexels_scraper('fashion street style')
