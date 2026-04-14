import os
import json
import logging
import requests
from datetime import datetime
from services.ai_blogger.chain_runner import PromptChainRunner
from services.ai_blogger.topic.topic_sourcer import TopicSourcer
from services.ai_blogger.image_sourcer import get_image_candidates
from services.ai_blogger.image_dedupe import ImageDedupe
from services.ai_blogger.llm_client import UniversalLLMClient

# We use the same CSS template that we perfected in the previous iteration
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>SmartWardrobe - AI Prompt Chain Editorial</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500&display=swap');

        :root {{
            --bg-color: #fcfbf9;
            --text-color: #1a1a1a;
            --text-light: #666666;
            --accent-color: #3a3a3a;
            --border-color: #e5e3db;
            --font-serif: 'Playfair Display', serif;
            --font-sans: 'Inter', sans-serif;
        }}

        body {{
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: var(--font-sans);
            line-height: 1.8;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }}
        .container {{
            max-width: 800px;
            margin: 0 auto;
            padding: 60px 20px;
        }}
        
        /* Global Image Rule to PREVENT STRETCHING */
        img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }}

        .header {{
            text-align: center;
            margin-bottom: 80px;
            padding-bottom: 40px;
            border-bottom: 1px solid var(--border-color);
        }}
        .header h1 {{
            font-family: var(--font-serif);
            font-size: 28px;
            letter-spacing: 3px;
            text-transform: uppercase;
            font-weight: 600;
            margin: 0 0 12px 0;
        }}
        .header p {{
            color: var(--text-light);
            font-size: 11px;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin: 0;
        }}

        .post {{ margin-bottom: 120px; }}
        .post-title {{
            font-family: var(--font-serif);
            font-size: 46px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 24px;
            line-height: 1.2;
            color: var(--text-color);
        }}
        .post-meta {{
            text-align: center;
            font-family: var(--font-sans);
            font-size: 12px;
            color: var(--text-light);
            margin-bottom: 60px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }}
        
        .paragraph-block {{ margin-bottom: 60px; clear: both; }}
        .text-content {{
            font-size: 17px;
            text-align: justify;
            color: #333;
            font-weight: 300;
        }}
        .text-content strong {{
            font-family: var(--font-sans);
            font-weight: 500;
            color: #000;
        }}
        
        /* Layouts with strict aspect ratios for images */
        .layout-hero {{
            margin: 0 0 50px 0;
            width: 100%;
            aspect-ratio: 16/9;
            background: #eee;
            overflow: hidden;
            clear: both;
        }}
        
        .layout-float-right {{
            float: right;
            width: 45%;
            margin: 10px 0 30px 40px;
            aspect-ratio: 3/4;
            background: #eee;
            overflow: hidden;
        }}
        
        .layout-float-left {{
            float: left;
            width: 45%;
            margin: 10px 40px 30px 0;
            aspect-ratio: 3/4;
            background: #eee;
            overflow: hidden;
        }}
        
        .layout-split {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            align-items: center;
            margin: 60px 0;
        }}
        .layout-split .split-media {{
            aspect-ratio: 3/4;
            background: #eee;
            overflow: hidden;
        }}
        .layout-split .split-text {{
            padding: 0;
        }}

        .layout-lookbook {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 60px 0;
            clear: both;
        }}
        .layout-lookbook .look-card {{
            display: flex;
            flex-direction: column;
        }}
        .layout-lookbook .look-media {{
            aspect-ratio: 3/4;
            background: #eee;
            overflow: hidden;
            margin-bottom: 12px;
        }}
        .layout-lookbook .look-title {{
            font-family: var(--font-serif);
            font-size: 14px;
            font-style: italic;
            text-align: center;
            color: var(--text-light);
            margin: 0;
        }}

        .layout-mosaic {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 60px 0;
            clear: both;
        }}
        .layout-mosaic .mosaic-item {{
            aspect-ratio: 1/1;
            background: #eee;
            overflow: hidden;
        }}

        .image-caption {{
            margin-top: 12px;
            font-family: var(--font-sans);
            font-size: 11px;
            color: var(--text-light);
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .clearfix::after {{ content: ""; clear: both; display: table; }}
        .divider {{
            text-align: center;
            margin: 80px 0;
            color: var(--border-color);
            font-size: 24px;
            letter-spacing: 20px;
            clear: both;
        }}
        .drop-cap::first-letter {{
            font-family: var(--font-serif);
            font-size: 4em;
            float: left;
            line-height: 0.8;
            margin-right: 12px;
            margin-top: 6px;
            color: var(--accent-color);
        }}

        .layout-pull-quote {{
            font-family: var(--font-serif);
            font-size: 22px;
            font-style: italic;
            text-align: center;
            margin: 60px 40px;
            color: #333333;
            padding: 40px 0;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            line-height: 1.6;
            clear: both;
        }}
        .layout-tip-box {{
            background-color: #fff;
            padding: 40px;
            margin: 60px 0;
            border: 1px solid var(--border-color);
            border-left: 4px solid var(--accent-color);
            clear: both;
        }}

        @media (max-width: 768px) {{
            .container {{ padding: 30px 20px; }}
            .post-title {{ font-size: 32px; }}
            .layout-float-right, .layout-float-left {{
                float: none; width: 100%; margin: 0 0 30px 0;
            }}
            .layout-split {{ grid-template-columns: 1fr; gap: 30px; }}
            .layout-lookbook, .layout-mosaic {{
                display: flex;
                flex-wrap: nowrap;
                overflow-x: auto;
                scroll-snap-type: x mandatory;
                gap: 15px;
                margin: 40px -20px;
                padding: 0 20px 20px 20px;
                -webkit-overflow-scrolling: touch;
            }}
            .layout-lookbook .look-card, .layout-mosaic .mosaic-item {{
                min-width: 80%;
                flex: 0 0 80%;
                scroll-snap-align: center;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SMARTWARDROBE EDITORIAL</h1>
            <p>Powered by AI Prompt Chain Pipeline</p>
        </div>
        {content}
    </div>
</body>
</html>"""


def run_batch(config: dict) -> dict:
    count = int(config.get("count", 10))
    llm_provider = str(config.get("llm_provider", "mock"))
    download_images = bool(config.get("download_images", True))
    output_dir = str(config.get("output_dir", "services/ai_blogger_new/output"))
    rng_seed = config.get("rng_seed", None)
    max_images_total = int(config.get("max_images_total", 0 if not download_images else count * 50))

    runner = PromptChainRunner(prompts_dir="services/ai_blogger_new/prompts")
    sourcer = TopicSourcer(rng_seed=rng_seed)

    os.makedirs(output_dir, exist_ok=True)
    images_dir = os.path.join(output_dir, "images")
    os.makedirs(images_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    html_basename = f"chain_blogs_{ts}.html"
    report_json_basename = f"report_{ts}.json"
    report_md_basename = f"report_{ts}.md"

    html_path = os.path.join(output_dir, html_basename)
    report_json_path = os.path.join(output_dir, report_json_basename)
    report_md_path = os.path.join(output_dir, report_md_basename)

    topics = sourcer.get_topics(count=count)

    html_content = ""
    report_articles = []
    used_urls: set[str] = set()
    dedupe = ImageDedupe()
    downloaded_images = 0
    attempted_images = 0
    failed_images = 0
    duplicate_hashes = 0
    skipped_used_url = 0

    image_config = {}

    # Generate topics autonomously if LLM is enabled
    llm_client = UniversalLLMClient() if llm_provider != "mock" else None
    
    generated_titles = []
    if llm_client:
        logging.info("Autonomously generating blog topics via LLM...")
        prompt = f"Please brainstorm {count} highly creative, editorial-style fashion blog post titles in Chinese. They should sound like Vogue or GQ editorials (e.g., '复古围巾的情绪价值：格纹如何制造记忆感'). Return a JSON object with a 'titles' array containing strings."
        try:
            res = llm_client.generate_json("You are an elite fashion editor.", prompt)
            generated_titles = res.get("titles", [])
            if len(generated_titles) > count:
                generated_titles = generated_titles[:count]
        except Exception as e:
            logging.error(f"Failed to generate topics via LLM: {e}")
            
    # Fallback to static sourcer if LLM failed or is mock
    if not generated_titles:
        topics = sourcer.get_topics(count=count)
        generated_titles = [t.title_zh for t in topics]

    for idx, title in enumerate(generated_titles):
        post = runner.run_chain(raw_topic=title, llm_provider=llm_provider)
        paragraphs = post.get("paragraphs", [])
        unique_layouts = len({p.get("layout_name") for p in paragraphs})

        report_articles.append(
            {
                "topic_id": f"auto_{idx}",
                "title": post.get("title", title),
                "paragraph_count": len(paragraphs),
                "unique_layouts": unique_layouts
            }
        )

        post_html = f"""
        <div class="post clearfix">
            <h2 class="post-title">{post.get('title', title)}</h2>
            <div class="post-meta">By SmartWardrobe AI Editor | {datetime.now().strftime('%B %d, %Y')}</div>
        """

        for p_idx, p in enumerate(paragraphs):
            section_name = p.get("section_name", "")
            text = p.get("text", "")
            layout_name = p.get("layout_name", "")
            image_queries = list(p.get("image_queries", []))

            safe_text = f"<strong>{section_name}</strong> — {text}"

            if layout_name == "pull_quote_center":
                post_html += f'<div class="layout-pull-quote" data-layout="{layout_name}">{text}</div>'
                continue

            if layout_name == "tip_box_rules":
                post_html += f'<div class="layout-tip-box" data-layout="{layout_name}"><div class="text-content">{safe_text}</div></div>'
                continue

            post_html += f'<div class="paragraph-block clearfix" data-layout="{layout_name}">'

            def render_media_block(q: str, layout_type: str = "portrait_4_3") -> str:
                nonlocal downloaded_images
                nonlocal attempted_images
                nonlocal failed_images
                nonlocal duplicate_hashes
                nonlocal skipped_used_url
                if not q:
                    return ""
                
                if download_images and downloaded_images < max_images_total:
                    current_img_config = image_config.copy()
                    current_img_config["image_size"] = layout_type
                    
                    # We might have very long AI queries. Truncate them for real image searches
                    search_q = q
                    words = search_q.split()
                    if len(words) > 4:
                        search_q = " ".join(words[:4])
                        
                    candidates = get_image_candidates(search_q, current_img_config, per_page=3)
                    
                    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
                    local_img_filename = f"chain_{idx}_img_{p_idx + 1}_{abs(hash(q)) % 10000}.jpg"
                    local_img_path = os.path.join(images_dir, local_img_filename)
                    rel_img_path = f"images/{local_img_filename}"

                    for attempt, url in enumerate(candidates):
                        if url in used_urls:
                            skipped_used_url += 1
                            continue
                            
                        # If it's a Trae AI URL, just embed it directly to save time
                        if "coresg-normal.trae.ai" in url:
                            attempted_images += 1
                            downloaded_images += 1
                            used_urls.add(url)
                            return f'<img src="{url}" alt="{q}" loading="lazy">'
                            
                        # Otherwise it's a real image library URL, try downloading it
                        try:
                            attempted_images += 1
                            timeout_val = 15
                            res = requests.get(url, headers=headers, timeout=timeout_val)
                            
                            if res.status_code == 200:
                                content_type = res.headers.get("Content-Type", "")
                                if not content_type.startswith("image/"):
                                    continue
                                    
                                if not dedupe.register(res.content):
                                    duplicate_hashes += 1
                                    continue
                                    
                                with open(local_img_path, "wb") as f:
                                    f.write(res.content)
                                downloaded_images += 1
                                used_urls.add(url)
                                return f'<img src="{rel_img_path}" alt="{q}" loading="lazy">'
                        except Exception as e:
                            logging.warning(f"Failed to fetch real image {url}: {e}")
                            continue
                            
                    failed_images += 1
                    logging.error(f"All attempts failed to fetch an image for: {q}")
                
                return f'<div class="image-caption">{q}</div>'

            if layout_name == "split_image_text":
                q = image_queries[0] if image_queries else ""
                media = render_media_block(q, layout_type="portrait_4_3")
                post_html += f"""
                <div class="layout-split">
                    <div class="split-media">{media}</div>
                    <div class="split-text text-content">{safe_text}</div>
                </div>
                """
                post_html += "</div>"
                continue

            if layout_name == "float_left_photo":
                q = image_queries[0] if image_queries else ""
                media = render_media_block(q, layout_type="portrait_4_3")
                post_html += f'<div class="layout-float-left">{media}</div>'
                post_html += f'<div class="text-content">{safe_text}</div>'
                post_html += "</div>"
                continue

            if layout_name == "float_right_photo":
                q = image_queries[0] if image_queries else ""
                media = render_media_block(q, layout_type="portrait_4_3")
                post_html += f'<div class="layout-float-right">{media}</div>'
                post_html += f'<div class="text-content">{safe_text}</div>'
                post_html += "</div>"
                continue

            if layout_name == "lookbook_cards_3":
                qs = (image_queries + ["", "", ""])[:3]
                cards = []
                for i, q in enumerate(qs):
                    media = render_media_block(q, layout_type="portrait_4_3")
                    cards.append(
                        f"""
                        <div class="look-card">
                            <div class="look-media">{media}</div>
                            <div class="look-title">Look {i+1}</div>
                        </div>
                        """
                    )
                post_html += f'<div class="layout-lookbook">{"".join(cards)}</div>'
                post_html += f'<div class="text-content">{safe_text}</div>'
                post_html += "</div>"
                continue

            if layout_name == "image_mosaic_3":
                qs = (image_queries + ["", "", ""])[:3]
                items = []
                for q in qs:
                    items.append(f'<div class="mosaic-item">{render_media_block(q, layout_type="square")}</div>')
                post_html += f'<div class="layout-mosaic">{"".join(items)}</div>'
                post_html += f'<div class="text-content">{safe_text}</div>'
                post_html += "</div>"
                continue

            q = image_queries[0] if image_queries else ""
            media = render_media_block(q, layout_type="landscape_16_9")
            if media:
                post_html += f'<div class="layout-hero">{media}</div>'

            drop_cap_class = 'drop-cap' if p_idx == 0 else ''
            post_html += f'<div class="text-content {drop_cap_class}">{safe_text}</div>'
            post_html += "</div>"

        post_html += "</div>"
        if idx < len(topics) - 1:
            post_html += '<div class="divider">✦ ✦ ✦</div>'
        html_content += post_html

    final_html = HTML_TEMPLATE.format(content=html_content)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(final_html)

    report = {
        "article_count": len(report_articles),
        "articles": report_articles,
        "images": {
            "download_enabled": download_images,
            "max_images_total": max_images_total,
            "attempted": attempted_images,
            "downloaded": downloaded_images,
            "failed": failed_images,
            "duplicate_hashes": duplicate_hashes,
            "skipped_used_url": skipped_used_url
        }
    }
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    md_lines = [
        f"# AI Blogger Report ({ts})",
        "",
        f"- article_count: {len(report_articles)}"
    ]
    for a in report_articles:
        md_lines.append(f"- {a['topic_id']} | {a['title']} | paragraphs={a['paragraph_count']} | unique_layouts={a['unique_layouts']}")
    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines) + "\n")

    return {"html_file": html_basename, "report_json": report_json_basename, "report_md": report_md_basename}


def run():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--llm", type=str, default="mock")
    args = parser.parse_args()

    print("Initializing Prompt Chain Runner (Mock Experience Upgrade)...")
    result = run_batch({
        "count": args.count,
        "llm_provider": args.llm,
        "download_images": True,  # Keep true for layout realism
        "output_dir": "services/ai_blogger_new/output",
        "max_images_total": args.count * 50
    })
    print(f"✅ HTML: services/ai_blogger_new/output/{result['html_file']}")
    print(f"✅ Report(JSON): services/ai_blogger_new/output/{result['report_json']}")
    print(f"✅ Report(MD): services/ai_blogger_new/output/{result['report_md']}")

if __name__ == "__main__":
    run()
