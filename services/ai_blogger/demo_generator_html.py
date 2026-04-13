import os
import requests
from datetime import datetime
from services.ai_blogger.content_generator import generate_blog_post
from services.ai_blogger.image_sourcer import get_image_for_topic
from services.ai_blogger.utils.config import load_config

DEMO_TOPICS = [
    {"title": "90年代极简复古风", "summary": ""},
    {"title": "Cyberpunk 机能风", "summary": ""},
    {"title": "法式慵懒 Chic", "summary": ""},
    {"title": "美式复古学院风 (Preppy)", "summary": ""},
    {"title": "无性别 Oversize 剪裁", "summary": ""}
]

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>SmartWardrobe - Editorial Magazine</title>
    <style>
        :root {{
            --bg-color: #f9f9f7;
            --text-color: #222222;
            --accent-color: #555555;
            --gray-text: #777777;
            --font-main: "Georgia", "Times New Roman", "Songti SC", "SimSun", serif;
            --font-sans: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
        }}
        body {{
            font-family: var(--font-main);
            background-color: var(--bg-color);
            color: var(--text-color);
            line-height: 2;
            margin: 0;
            padding: 0;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
            padding: 60px 40px;
            background-color: #ffffff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.03);
        }}
        /* Header Styling */
        .header {{
            text-align: center;
            padding-bottom: 40px;
            border-bottom: 1px solid #e0e0e0;
            margin-bottom: 60px;
            font-family: var(--font-sans);
        }}
        .header h1 {{
            font-size: 36px;
            letter-spacing: 4px;
            font-weight: 300;
            margin: 0 0 10px 0;
        }}
        .header p {{
            color: var(--gray-text);
            font-size: 11px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }}
        /* Post Styling */
        .post {{
            margin-bottom: 100px;
        }}
        .post-title {{
            font-size: 38px;
            font-weight: normal;
            text-align: center;
            margin-bottom: 15px;
            line-height: 1.3;
        }}
        .post-meta {{
            text-align: center;
            font-family: var(--font-sans);
            font-size: 13px;
            color: var(--gray-text);
            margin-bottom: 50px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }}
        
        /* Magazine Layout Classes */
        .paragraph-block {{
            margin-bottom: 50px;
        }}
        .text-content {{
            font-size: 17px;
            text-align: justify;
            color: #333;
        }}
        .text-content strong {{
            font-family: var(--font-sans);
            font-weight: 600;
            color: #000;
        }}
        
        /* Hero Image Layout (Full Width) */
        .layout-hero {{
            margin: 0 0 40px 0;
            text-align: center;
            clear: both;
        }}
        .layout-hero img {{
            width: 100%;
            height: auto;
            max-height: 550px;
            object-fit: cover;
            display: block;
        }}
        
        /* Float Right Layout */
        .layout-float-right {{
            float: right;
            width: 45%;
            margin: 10px 0 30px 40px;
            text-align: center;
        }}
        .layout-float-right img {{
            width: 100%;
            height: auto;
            display: block;
        }}
        
        /* Float Left Layout */
        .layout-float-left {{
            float: left;
            width: 45%;
            margin: 10px 40px 30px 0;
            text-align: center;
        }}
        .layout-float-left img {{
            width: 100%;
            height: auto;
            display: block;
        }}
        
        .image-caption {{
            margin-top: 12px;
            font-family: var(--font-sans);
            font-size: 12px;
            color: var(--gray-text);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        /* Clearfix to prevent layout breaking */
        .clearfix::after {{
            content: "";
            clear: both;
            display: table;
        }}
        
        .divider {{
            text-align: center;
            margin: 80px 0;
            color: #ccc;
            font-size: 24px;
            letter-spacing: 20px;
            clear: both;
        }}
        
        /* Drop cap for the first letter of paragraphs */
        .drop-cap::first-letter {{
            font-size: 3.5em;
            float: left;
            line-height: 0.8;
            margin-right: 8px;
            margin-top: 5px;
            color: #000;
        }}

        /* Mobile Responsive Layout */
        @media (max-width: 768px) {{
            .container {{
                padding: 30px 20px;
            }}
            .header h1 {{
                font-size: 26px;
                letter-spacing: 2px;
            }}
            .post-title {{
                font-size: 28px;
            }}
            .text-content {{
                font-size: 16px;
            }}
            /* Stack floats vertically on mobile */
            .layout-float-right, .layout-float-left {{
                float: none;
                width: 100%;
                margin: 0 0 20px 0;
            }}
            .drop-cap::first-letter {{
                font-size: 3em;
                margin-top: 3px;
            }}
        }}

        @media print {{
            body {{ background-color: white; }}
            .container {{ box-shadow: none; max-width: 100%; padding: 0; }}
            .post {{ page-break-after: always; }}
            .layout-float-right, .layout-float-left {{ float: none; width: 100%; margin: 0 0 20px 0; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SMARTWARDROBE EDITORIAL</h1>
            <p>Curated Fashion Analysis & Insights</p>
        </div>
        
        {content}
        
    </div>
</body>
</html>"""

def generate_demo_html():
    config = load_config()
    config["image_provider"] = "unsplash_napi"
    config["llm_provider"] = "mock"
    
    output_dir = config.get("output_dir", "services/ai_blogger/output")
    images_dir = os.path.join(output_dir, "images")
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)
    
    html_filename = os.path.join(output_dir, f"editorial_blogs_{datetime.now().strftime('%Y%m%d%H%M%S')}.html")
    print(f"Generating Magazine-Style HTML blog posts...")
    
    html_content = ""
    
    for i, topic in enumerate(DEMO_TOPICS, 1):
        print(f"[{i}/{len(DEMO_TOPICS)}] Generating Editorial: {topic['title']}")
        
        post = generate_blog_post([topic], config)
        
        post_html = f"""
        <div class="post clearfix">
            <h2 class="post-title">{post['title']}</h2>
            <div class="post-meta">By AI Editor | {datetime.now().strftime('%B %d, %Y')}</div>
        """
        
        for p_idx, p in enumerate(post.get("paragraphs", [])):
            layout_style = p.get('layout', 'hero') # Default to hero if not specified
            
            # Format text: bold the section header (e.g., 【导语】) and add drop cap to first paragraph
            text = p['text']
            if text.startswith("【"):
                end_idx = text.find("】")
                if end_idx != -1:
                    section_title = text[1:end_idx]
                    main_text = text[end_idx+1:]
                    text = f"<strong>{section_title}</strong> — {main_text}"
            
            drop_cap_class = 'drop-cap' if p_idx == 0 else ''
            
            # Start Paragraph Block
            post_html += f'<div class="paragraph-block clearfix">'
            
            # Download Image
            image_url = get_image_for_topic(p["image_query"], config)
            local_img_filename = f"ed_{i}_img_{p_idx + 1}.jpg"
            local_img_path = os.path.join(images_dir, local_img_filename)
            rel_img_path = f"images/{local_img_filename}"
            
            img_tag = ""
            try:
                headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
                # Reduce timeout to prevent hanging on slow image servers
                response = requests.get(image_url, headers=headers, timeout=5)
                
                if response.status_code != 200:
                    fallback_url = f"https://picsum.photos/800/1000?random={i}{p_idx}"
                    response = requests.get(fallback_url, headers=headers, timeout=5)
                    
                if response.status_code == 200:
                    with open(local_img_path, 'wb') as f:
                        f.write(response.content)
                    print(f"  -> Downloaded ({layout_style}): {local_img_filename}")
                    
                    img_tag = f"""
                    <div class="layout-{layout_style}">
                        <img src="{rel_img_path}" alt="{p.get('image_caption', '')}">
                        <div class="image-caption">{p.get('image_caption', p['image_query'])}</div>
                    </div>
                    """
            except Exception as e:
                print(f"  -> Failed to download image: {e}")

            # Assemble based on layout
            if layout_style == "hero":
                # Hero image goes BEFORE text
                post_html += img_tag
                post_html += f'<div class="text-content {drop_cap_class}">{text}</div>'
            else:
                # Floating image goes inside/before text block so text wraps around it
                post_html += img_tag
                post_html += f'<div class="text-content {drop_cap_class}">{text}</div>'
                
            post_html += "</div>" # end paragraph-block
            
        post_html += "</div>" # end post
        if i < len(DEMO_TOPICS):
            post_html += '<div class="divider">✦ ✦ ✦</div>'
            
        html_content += post_html
        
    final_html = HTML_TEMPLATE.format(content=html_content)
    
    with open(html_filename, "w", encoding="utf-8") as f:
        f.write(final_html)
        
    print(f"\nSuccess! Your Editorial Magazine has been created at: {html_filename}")

if __name__ == "__main__":
    generate_demo_html()
