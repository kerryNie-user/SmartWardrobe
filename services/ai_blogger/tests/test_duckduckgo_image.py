try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None
import json

def test_duckduckgo_image_search(query: str, max_results: int = 5):
    """
    使用 duckduckgo_search 库搜索真实新闻图片
    """
    print(f"[*] 正在尝试搜索真实新闻图片: '{query}'")
    
    extracted_images = []
    try:
        if DDGS is None:
            print("duckduckgo_search package is not installed.")
            return []
        with DDGS() as ddgs:
            # 搜索图片，限制为高清大图 (Large)
            results = ddgs.images(
                keywords=query,
                region="wt-wt",
                safesearch="moderate",
                size="Large",
                max_results=max_results,
            )
            
            for item in results:
                # 返回结果包含 title, image, thumbnail, url, source 等信息
                extracted_images.append(item.get("image"))
                
        if extracted_images:
            print("\n[+] 成功获取到的真实高清图片 URL:")
            for i, img in enumerate(extracted_images, 1):
                print(f"  {i}. {img}")
        else:
            print("\n[-] 未找到符合条件的图片。")
            
        return extracted_images
        
    except Exception as e:
        print(f"[!] 调用图片 API 失败: {e}")
        return []

if __name__ == "__main__":
    # 模拟大模型根据新闻生成的真实搜图指令
    test_query = "SS25 Haute Couture Dior Runway Look High Resolution"
    test_duckduckgo_image_search(test_query, max_results=3)