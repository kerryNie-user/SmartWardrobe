from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from services.ai_blogger.pipeline.config import BatchConfig


def build_offline_post(title: str, locale: str) -> dict:
    if locale == "zh-CN":
        intro = (
            f"{title}不是一个只靠怀旧成立的时尚命题。它真正值得讨论的地方，在于水洗色、直筒线条和粗粝面料如何共同制造一种可被日常穿着吸收的时间感。"
            "这种风格不追求崭新，也不急于显得昂贵，它更像一组被反复穿过、被城市光线磨钝的视觉证据：轮廓清楚，态度松弛，信息密度来自细节而不是装饰。"
        )
        analysis = (
            "判断一套造型是否成立，关键不在单品是否流行，而在比例是否有稳定的视觉重心。直筒下装会把腿部线条压得更平，水洗灰会降低牛仔的青春感，皮革或针织的加入则让画面有更成熟的重量。"
            "当这些变量同时出现时，造型会从简单的复古符号转向更宽的城市叙事：它可以属于通勤，也可以属于周末，可以和风衣并置，也可以被一双乐福鞋收紧。"
        )
        bullets = "- 用水洗灰或靛蓝作为主色，避免多种高饱和色同时抢占画面。\n- 保持裤型线条干净，让鞋型承担风格转向。\n- 用皮革、羊毛或挺括棉布补足材质层次。\n- 如果上装偏宽，下装就用直筒而不是过度堆量的阔腿。"
    else:
        intro = (
            f"{title} works because it treats fashion as a question of texture, proportion, and cultural memory rather than novelty alone. "
            "The washed surface, straighter line, and slightly worn-in attitude create a form of style that feels lived in without becoming careless. "
            "It gives the reader a visual language for understanding why certain everyday looks feel current even when their references are decades old."
        )
        analysis = (
            "The useful variable is balance. A straight-leg shape steadies the lower body, a muted denim wash reduces visual noise, and leather, wool, or crisp cotton can add enough tension to keep the outfit from becoming nostalgic costume. "
            "That is what makes the look adaptable: it can read as city dressing, weekend dressing, or an editorial study in restraint depending on how the surrounding materials are handled."
        )
        bullets = "- Keep the denim wash muted rather than overly saturated.\n- Let one clean shoe shape define the mood.\n- Add leather, wool, or crisp cotton for material tension.\n- If the top is oversized, keep the trouser line straight."

    return {
        "title": title,
        "paragraphs": [
            {
                "section_name": "导语" if locale == "zh-CN" else "Introduction",
                "text": intro,
                "layout_name": "hero_full_bleed",
                "image_queries": [],
                "image_urls": ["/uploads/discovery/brutalist-basics-02.jpg"],
                "image_alts": ["Editorial denim and tailoring look with muted texture and clean proportion."],
            },
            {
                "section_name": "深度解析" if locale == "zh-CN" else "Analysis",
                "text": analysis,
                "layout_name": "split_image_text",
                "image_queries": [],
                "image_urls": ["/uploads/shared/editorial-look-01.jpg"],
                "image_alts": ["Street-style outfit showing balanced layers and a clear silhouette."],
            },
            {
                "section_name": "搭配参考" if locale == "zh-CN" else "Styling References",
                "text": bullets,
                "layout_name": "list_bullets",
                "image_queries": [],
                "image_urls": [],
                "image_alts": [],
            },
        ],
    }


def generate_article_results(config: BatchConfig, titles: list[str], seed_materials: list[dict | None], runner) -> list[tuple[int, str, dict | None, dict | None]]:
    logging.info(f"Generated {len(titles)} topics. Starting generation pipeline...")

    def process_topic(idx: int, title: str):
        try:
            if config.llm_mode == "none":
                post = build_offline_post(title, config.locale)
            else:
                seed = seed_materials[idx] if idx < len(seed_materials) else None
                post = runner.run_chain(raw_topic=title, seed_material=seed)
            return idx, title, post, None
        except Exception as exc:
            logging.error(f"Failed to generate article for topic '{title}': {exc}")
            return idx, title, None, {
                "code": "ARTICLE_GENERATION_FAILED",
                "message": "Failed to generate article",
                "details": {"topic": title, "error": str(exc)},
            }

    futures = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        for idx, title in enumerate(titles):
            futures.append(executor.submit(process_topic, idx, title))
        results = [future.result() for future in as_completed(futures)]

    results.sort(key=lambda item: item[0])
    return results
