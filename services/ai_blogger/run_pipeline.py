import os
import json
import logging
import requests
from datetime import datetime
from services.ai_blogger.chain_runner import PromptChainRunner
from services.ai_blogger.topic.topic_sourcer import TopicSourcer
from services.ai_blogger.image_sourcer import get_image_candidates
from services.ai_blogger.metrics.image_dedupe import ImageDedupe
from services.ai_blogger.llm_client import UniversalLLMClient

def _load_html_template() -> str:
    template_path = os.path.join(os.path.dirname(__file__), "templates", "editorial_layout.html")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    logging.warning(f"Template not found at {template_path}, falling back to minimal HTML.")
    return "<html><body>{content}</body></html>"

def run_batch(config: dict) -> dict:
    count = int(config.get("count", 10))
    llm_provider = str(config.get("llm_provider", "mock"))
    download_images = bool(config.get("download_images", True))
    output_dir = str(config.get("output_dir", "services/ai_blogger/output"))
    rng_seed = config.get("rng_seed", None)
    max_images_total = int(config.get("max_images_total", 0 if not download_images else count * 50))

    runner = PromptChainRunner(prompts_dir="services/ai_blogger/prompts")
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
    image_details = []

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
            
    # Fallback to static sourcer if LLM failed
    if not generated_titles:
        topics = sourcer.get_topics(count=count)
        generated_titles = [t.title_zh for t in topics]

    for idx, title in enumerate(generated_titles):
        try:
            post = runner.run_chain(raw_topic=title, llm_provider=llm_provider)
        except Exception as e:
            logging.error(f"Failed to generate article for topic '{title}': {e}")
            report_articles.append({
                "topic_id": f"auto_{idx}",
                "title": title,
                "status": "failed",
                "error": str(e)
            })
            continue

        paragraphs = post.get("paragraphs", [])
        unique_layouts = len({p.get("layout_name") for p in paragraphs})

        report_articles.append(
            {
                "topic_id": f"auto_{idx}",
                "title": post.get("title", title),
                "paragraph_count": len(paragraphs),
                "unique_layouts": unique_layouts,
                "status": "success"
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

            def render_media_block(q: dict | str, layout_type: str = "portrait_4_3") -> str:
                nonlocal downloaded_images
                nonlocal attempted_images
                nonlocal failed_images
                nonlocal duplicate_hashes
                nonlocal skipped_used_url
                nonlocal image_details
                if not q:
                    return ""
                
                # Handle dict or string
                if isinstance(q, dict):
                    search_q = q.get("search_keyword", "")
                    alt_text = q.get("image_caption", search_q)
                else:
                    search_q = str(q)
                    alt_text = search_q
                    
                if not search_q:
                    return ""
                
                if download_images and downloaded_images < max_images_total:
                    current_img_config = image_config.copy()
                    current_img_config["image_size"] = layout_type
                        
                    candidates = get_image_candidates(search_q, current_img_config, per_page=3)
                    
                    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
                    local_img_filename = f"chain_{idx}_img_{p_idx + 1}_{abs(hash(search_q)) % 10000}.jpg"
                    local_img_path = os.path.join(images_dir, local_img_filename)
                    rel_img_path = f"images/{local_img_filename}"

                    for attempt, cand in enumerate(candidates):
                        url = cand["original_url"]
                        source_type = cand["source_type"]
                        cand_search_query = cand["search_query"]

                        if url in used_urls:
                            skipped_used_url += 1
                            continue
                            
                        # If it's a Trae AI URL, just embed it directly to save time
                        if "coresg-normal.trae.ai" in url or source_type == "trae_ai":
                            attempted_images += 1
                            downloaded_images += 1
                            used_urls.add(url)
                            image_details.append({
                                "source_type": source_type,
                                "original_url": url,
                                "search_query": cand_search_query,
                                "local_path": url,
                                "layout_name": layout_name,
                                "paragraph_index": p_idx
                            })
                            return f'<img src="{url}" alt="{alt_text}" loading="lazy">'
                            
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
                                image_details.append({
                                    "source_type": source_type,
                                    "original_url": url,
                                    "search_query": cand_search_query,
                                    "local_path": rel_img_path,
                                    "layout_name": layout_name,
                                    "paragraph_index": p_idx
                                })
                                return f'<img src="{rel_img_path}" alt="{alt_text}" loading="lazy">'
                        except Exception as e:
                            logging.warning(f"Failed to fetch real image {url}: {e}")
                            continue
                            
                    failed_images += 1
                    logging.error(f"All attempts failed to fetch an image for: {search_q}")
                
                return f'<div class="image-caption">{alt_text}</div>'

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

    html_template_str = _load_html_template()
    final_html = html_template_str.format(content=html_content)
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
            "skipped_used_url": skipped_used_url,
            "details": image_details
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
        "output_dir": "services/ai_blogger/output",
        "max_images_total": args.count * 50
    })
    print(f"✅ HTML: services/ai_blogger/output/{result['html_file']}")
    print(f"✅ Report(JSON): services/ai_blogger/output/{result['report_json']}")
    print(f"✅ Report(MD): services/ai_blogger/output/{result['report_md']}")

if __name__ == "__main__":
    run()
