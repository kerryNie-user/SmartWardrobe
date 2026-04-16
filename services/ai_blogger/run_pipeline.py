import os
import json
import logging
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from services.ai_blogger.chain_runner import PromptChainRunner
from services.ai_blogger.topic.topic_sourcer import TopicSourcer
from services.ai_blogger.image_sourcer import get_image_candidates
from services.ai_blogger.metrics.image_dedupe import ImageDedupe
from services.ai_blogger.llm_client import UniversalLLMClient

class ImageTracker:
    def __init__(self, images_dir: str, max_images_total: int, download_images: bool):
        self.images_dir = images_dir
        self.max_images_total = max_images_total
        self.download_images = download_images
        
        self.dedupe = ImageDedupe()
        self.used_urls = set()
        
        self.downloaded_images = 0
        self.attempted_images = 0
        self.failed_images = 0
        self.duplicate_hashes = 0
        self.skipped_used_url = 0
        self.image_details = []
        
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def render_media_block(self, q: dict | str, idx: int, p_idx: int, layout_name: str, layout_type: str = "portrait_4_3") -> str:
        if not q:
            return ""
        
        direct_url = None
        if isinstance(q, dict):
            search_q = q.get("search_keyword", "")
            alt_text = q.get("image_caption", search_q)
            direct_url = q.get("_direct_url")
        else:
            search_q = str(q)
            alt_text = search_q
            
        if not search_q and not direct_url:
            return ""
        
        if self.download_images and self.downloaded_images < self.max_images_total:
            current_img_config = {"image_size": layout_type}
                
            if direct_url:
                candidates = [{"original_url": direct_url, "source_type": "News RSS", "search_query": search_q or "REAL_NEWS_IMAGE"}]
            else:
                candidates = get_image_candidates(search_q, current_img_config, per_page=3)
            headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
            local_img_filename = f"chain_{idx}_img_{p_idx + 1}_{abs(hash(search_q or direct_url)) % 10000}.jpg"
            local_img_path = os.path.join(self.images_dir, local_img_filename)
            rel_img_path = f"images/{local_img_filename}"

            for attempt, cand in enumerate(candidates):
                url = cand.get("original_url", "")
                source_type = cand.get("source_type", "Unknown")
                cand_search_query = cand["search_query"]

                if url in self.used_urls:
                    self.skipped_used_url += 1
                    continue
                    
                if "coresg-normal.trae.ai" in url or source_type == "trae_ai":
                    self.attempted_images += 1
                    self.downloaded_images += 1
                    self.used_urls.add(url)
                    self.image_details.append({
                        "source_type": source_type,
                        "original_url": url,
                        "search_query": cand_search_query,
                        "local_path": url,
                        "layout_name": layout_name,
                        "paragraph_index": p_idx
                    })
                    return f'<img src="{url}" alt="{alt_text}" loading="lazy">'
                    
                try:
                    self.attempted_images += 1
                    timeout_val = 15
                    res = self.session.get(url, headers=headers, timeout=timeout_val)
                    
                    if res.status_code == 200:
                        content_type = res.headers.get("Content-Type", "")
                        if not content_type.startswith("image/"):
                            continue
                            
                        if not self.dedupe.register(res.content):
                            self.duplicate_hashes += 1
                            continue
                            
                        with open(local_img_path, "wb") as f:
                            f.write(res.content)
                        self.downloaded_images += 1
                        self.used_urls.add(url)
                        self.image_details.append({
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
                    
            self.failed_images += 1
            logging.error(f"All attempts failed to fetch an image for: {search_q}")
        
        return f'<div class="image-caption">{alt_text}</div>'


def _load_html_template() -> str:
    template_path = os.path.join(os.path.dirname(__file__), "templates", "editorial_layout.html")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    logging.warning(f"Template not found at {template_path}, falling back to minimal HTML.")
    return "<html><body>{content}</body></html>"

def run_batch(config: dict) -> dict:
    count = int(config.get("count", 10))
    download_images = bool(config.get("download_images", True))
    output_dir = str(config.get("output_dir", "services/ai_blogger/output"))
    rng_seed = config.get("rng_seed", None)
    max_images_total = int(config.get("max_images_total", 0 if not download_images else count * 50))
    profile_name = config.get("profile", "editorial_styling")

    runner = PromptChainRunner(
        prompts_dir="services/ai_blogger/agents",
        profile_name=profile_name
    )
    sourcer = TopicSourcer(rng_seed=rng_seed)

    os.makedirs(output_dir, exist_ok=True)
    images_dir = os.path.join(output_dir, "images")
    os.makedirs(images_dir, exist_ok=True)

    import time
    from datetime import datetime
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
    
    tracker = ImageTracker(images_dir=images_dir, max_images_total=max_images_total, download_images=download_images)

    # Generate topics autonomously if LLM is enabled
    llm_client = UniversalLLMClient()
    
    # Initialize the core orchestrator with the specified profile FIRST
    # So we can extract profile information for topic generation
    runner = PromptChainRunner(
        prompts_dir=os.path.join(os.path.dirname(__file__), "agents"),
        profile_name=profile_name
    )
    
    generated_titles = []
    seed_materials = []
    
    if profile_name == "fashion_news":
        logging.info("Profile 'fashion_news' selected. Scraping real news from RSS feeds instead of LLM brainstorming...")
        from services.ai_blogger.trend_scraper import get_latest_trends
        from services.ai_blogger.utils.config import load_config
        
        config_data = load_config()
        trends = get_latest_trends(config_data)
        
        for t in trends:
            if len(generated_titles) >= count:
                break
            # Use real news title
            generated_titles.append(t["title"])
            # Save real news context and image for later injection
            seed_materials.append({
                "source": t["source"],
                "summary": t["summary"],
                "image_url": t["image_url"]
            })
            
        if not generated_titles:
            logging.warning("RSS scraping returned empty results. Falling back to LLM brainstorming.")

    if llm_client and not generated_titles:
        logging.info(f"Autonomously generating blog topics via LLM (Profile: {profile_name})...")
        topic_agent_path = os.path.join(os.path.dirname(__file__), "agents", "@agent_topic_generator.md")
        
        p_name = runner.profile.get("name", "高级时尚编辑")
        p_visual = runner.profile.get("visual_strategy", "时尚、高级、专业")
        
        system_prompt = "You are an elite editor."
        user_prompt = f"Please brainstorm {count} highly creative blog post titles in Chinese for profile: {p_name}. Visual strategy: {p_visual}. Return a JSON object with a 'titles' array containing strings."
        
        if os.path.exists(topic_agent_path):
            with open(topic_agent_path, "r", encoding="utf-8") as f:
                user_prompt = f.read()
                user_prompt = user_prompt.replace("{count}", str(count))
                user_prompt = user_prompt.replace("{profile_name}", p_name)
                user_prompt = user_prompt.replace("{visual_strategy}", p_visual)
                
        try:
            res = llm_client.generate_json(system_prompt, user_prompt)
            generated_titles = res.get("titles", [])
            if len(generated_titles) > count:
                generated_titles = generated_titles[:count]
        except Exception as e:
            logging.error(f"Failed to generate topics autonomously: {e}")
            
    # Fallback to test topics if autonomous generation failed or disabled
    if not generated_titles:
        generated_titles = [f"Autumn Minimalist Look {i}" for i in range(1, count + 1)]
        
    logging.info(f"Generated {len(generated_titles)} topics. Starting generation pipeline...")

    # Remove the outer redundant for loop that was mistakenly left around the executor logic
    def _process_topic(idx, title):
        try:
            # Find the corresponding seed material if any
            seed = seed_materials[idx] if idx < len(seed_materials) else None
            post = runner.run_chain(raw_topic=title, seed_material=seed)
            return idx, title, post, None
        except Exception as e:
            logging.error(f"Failed to generate article for topic '{title}': {e}")
            return idx, title, None, e

    # Using ThreadPoolExecutor for concurrent execution
    futures = []
    # Create a thread pool with max 5 workers
    with ThreadPoolExecutor(max_workers=5) as executor:
        for idx, title in enumerate(generated_titles):
            futures.append(executor.submit(_process_topic, idx, title))

        # Wait for all futures to complete and gather results
        # To maintain order, we can sort by idx later or just process as completed
        results = []
        for future in as_completed(futures):
            results.append(future.result())

    # Sort results by original idx to maintain output order
    results.sort(key=lambda x: x[0])

    for idx, title, post, error in results:
        if error is not None:
            report_articles.append({
                "topic_id": f"auto_{idx}",
                "title": title,
                "status": "failed",
                "error": str(error)
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

            if layout_name == "split_image_text":
                q = image_queries[0] if image_queries else ""
                media = tracker.render_media_block(q, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type="portrait_4_3")
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
                media = tracker.render_media_block(q, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type="portrait_4_3")
                post_html += f'<div class="layout-float-left">{media}</div>'
                post_html += f'<div class="text-content">{safe_text}</div>'
                post_html += "</div>"
                continue

            if layout_name == "float_right_photo":
                q = image_queries[0] if image_queries else ""
                media = tracker.render_media_block(q, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type="portrait_4_3")
                post_html += f'<div class="layout-float-right">{media}</div>'
                post_html += f'<div class="text-content">{safe_text}</div>'
                post_html += "</div>"
                continue

            if layout_name == "lookbook_cards_3":
                qs = (image_queries + ["", "", ""])[:3]
                cards = []
                for i, q in enumerate(qs):
                    media = tracker.render_media_block(q, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type="portrait_4_3")
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
                    items.append(f'<div class="mosaic-item">{tracker.render_media_block(q, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type="square")}</div>')
                post_html += f'<div class="layout-mosaic">{"".join(items)}</div>'
                post_html += f'<div class="text-content">{safe_text}</div>'
                post_html += "</div>"
                continue

            q = image_queries[0] if image_queries else ""
            media = tracker.render_media_block(q, idx=idx, p_idx=p_idx, layout_name=layout_name, layout_type="landscape_16_9")
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
    final_html = html_template_str.replace("{content}", html_content)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(final_html)

    report = {
        "article_count": len(report_articles),
        "articles": report_articles,
        "images": {
            "download_enabled": download_images,
            "max_images_total": max_images_total,
            "attempted": tracker.attempted_images,
            "downloaded": tracker.downloaded_images,
            "failed": tracker.failed_images,
            "duplicate_hashes": tracker.duplicate_hashes,
            "skipped_used_url": tracker.skipped_used_url,
            "details": tracker.image_details
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
        if a.get("status") == "success":
            md_lines.append(f"- {a['topic_id']} | {a['title']} | paragraphs={a.get('paragraph_count', 0)} | unique_layouts={a.get('unique_layouts', 0)}")
        else:
            md_lines.append(f"- {a['topic_id']} | {a['title']} | FAILED | error={a.get('error', 'Unknown')}")
    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines) + "\n")

    return {"html_file": html_basename, "report_json": report_json_basename, "report_md": report_md_basename}


def run():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=1, help="Number of articles to generate")
    parser.add_argument("--llm", type=str, default="real", help="LLM Provider ('real' or 'none' to skip LLM)")
    parser.add_argument("--profile", type=str, default="editorial_styling", help="Topic profile (e.g. editorial_styling, fashion_news)")
    args = parser.parse_args()

    print("Initializing Prompt Chain Runner (Agentic Pipeline)...")
    result = run_batch({
        "count": args.count,
        "profile": args.profile,
        "download_images": True,  # Keep true for layout realism
        "output_dir": "services/ai_blogger/output",
        "max_images_total": args.count * 50
    })
    print(f"✅ HTML: services/ai_blogger/output/{result['html_file']}")
    print(f"✅ Report(JSON): services/ai_blogger/output/{result['report_json']}")
    print(f"✅ Report(MD): services/ai_blogger/output/{result['report_md']}")

if __name__ == "__main__":
    run()
