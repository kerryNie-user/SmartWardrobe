import requests
from bs4 import BeautifulSoup
import json
import time
import re

def scrape_fashion_article(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }
    
    print(f"[*] 开始抓取: {url}")
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 1. 抓取标题
        title_tag = soup.find('h1')
        title = title_tag.get_text(strip=True) if title_tag else soup.title.get_text(strip=True)
        
        # 2. 抓取正文文本 (过滤掉太短的无用信息)
        paragraphs = soup.find_all('p')
        content_lines = []
        for p in paragraphs:
            text = p.get_text(strip=True)
            if len(text) > 20: 
                content_lines.append(text)
        full_text = "\n".join(content_lines)
        
        # 3. 抓取真实图片链接 (处理懒加载)
        image_urls = []
        for img in soup.find_all('img'):
            # 很多时尚网站使用 data-src, data-lazy-src, 甚至 srcset 来做懒加载
            src = img.get('data-src') or img.get('data-lazy-src') or img.get('src')
            if src and src.startswith('http'):
                # 排除明显是图标或头像的极小图片
                if not re.search(r'(logo|icon|avatar|banner|button)', src, re.IGNORECASE):
                    image_urls.append(src)
        
        # 去重并保持顺序
        unique_image_urls = []
        for url in image_urls:
            if url not in unique_image_urls:
                unique_image_urls.append(url)
        
        return {
            "status": "success",
            "title": title,
            "text_length": len(full_text),
            "text_preview": full_text[:200] + "..." if len(full_text) > 200 else full_text,
            "image_count": len(unique_image_urls),
            "images_preview": unique_image_urls[:5] # 预览前5张图片
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    test_urls = [
        "https://www.iconsingapore.com/fashion/ss25-haute-couture-dior-chanel-valentino",
        "https://www.pinprestige.com/sg/fashion/spring-summer-2025-haute-couture-week-where-history-and-the-future-meet/"
    ]
    
    for target_url in test_urls:
        result = scrape_fashion_article(target_url)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print("-" * 60)
        time.sleep(1)