from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Callable

from services.ai_blogger.pipeline.config import BatchConfig


AI_BLOGGER_DIR = Path(__file__).resolve().parents[1]


def _error(code: str, message: str, exc: Exception) -> dict:
    return {
        "code": code,
        "message": message,
        "details": {"error": str(exc)},
    }


def _read_agent_prompt(path: Path, fallback: str, replacements: dict[str, str] | None = None) -> str:
    if not path.exists():
        return fallback
    content = path.read_text(encoding="utf-8")
    for key, value in (replacements or {}).items():
        content = content.replace(key, value)
    return content


def _news_seed_from_item(item: dict) -> dict:
    return {
        "source": item.get("source", "Web Search"),
        "summary": item.get("summary", ""),
        "link": item.get("link", ""),
        "published_at": str(item.get("published_at", "") or "").strip(),
        "image_urls": list(item.get("image_urls", []) or []),
    }


def resolve_generation_plan(
    config: BatchConfig,
    *,
    topic_sourcer_factory: Callable,
    llm_client_factory: Callable,
    runner_factory: Callable,
    latest_trends_loader: Callable[[], list[dict]] | None = None,
) -> dict:
    sourcer = topic_sourcer_factory(rng_seed=config.rng_seed)
    topics = sourcer.get_topics(count=config.count)
    titles: list[str] = []
    seed_materials: list[dict | None] = []
    errors: list[dict] = []
    runner = None

    if config.llm_mode == "none":
        titles = [t.title_zh for t in topics] if config.locale == "zh-CN" else [f"AI Blogger Topic {i}" for i in range(1, config.count + 1)]
        seed_materials = [None for _ in titles]
        logging.info(f"LLM disabled (llm=none). Using topic bank titles: {len(titles)}")
        return {"topics": topics, "titles": titles, "seed_materials": seed_materials, "errors": errors, "runner": runner}

    llm_client = llm_client_factory()
    runner = runner_factory(
        prompts_dir=str(AI_BLOGGER_DIR / "agents"),
        profile_name=config.profile_name,
        locale=config.locale,
    )

    if config.profile_name == "fashion_news" and not config.skip_scout:
        logging.info("Profile 'fashion_news' selected. Scouting latest news via LLM web search...")
        fallback_prompt = (
            f"Search the web for the latest fashion news within the last 7 days and return {config.count} items as JSON. "
            "Each item must include title, summary, source, link, published_at."
        )
        user_prompt = _read_agent_prompt(
            AI_BLOGGER_DIR / "agents" / "@agent_news_scout.md",
            fallback_prompt,
            {"{count}": str(config.count)},
        )
        try:
            res = llm_client.generate_json("You are a senior fashion journalist and editor.", user_prompt, enable_search=True)
            for item in res.get("news", []):
                if len(titles) >= config.count:
                    break
                title = str(item.get("title", "") or "")
                titles.append(title or "最新时尚新闻")
                seed_materials.append(_news_seed_from_item(item))
        except Exception as exc:
            logging.error(f"Failed to scout latest news via LLM search: {exc}")
            errors.append(_error("NEWS_SCOUT_FAILED", "Failed to scout latest news via LLM search", exc))

        if titles:
            logging.info(f"LLM news scout returned {len(titles)} items. Skipping RSS scraping.")
        else:
            logging.warning("LLM news scout returned empty results. Falling back to RSS scraping...")

    if config.profile_name == "fashion_news" and not titles and not config.skip_scout:
        logging.info("Falling back to RSS scraping for fashion_news...")
        try:
            trends = latest_trends_loader() if latest_trends_loader else []
        except Exception as exc:
            trends = []
            logging.error(f"RSS scraping failed: {exc}")
            errors.append(_error("RSS_SCRAPE_FAILED", "Failed to scrape RSS trends", exc))

        for item in trends:
            if len(titles) >= config.count:
                break
            titles.append(item["title"])
            seed_materials.append(
                {
                    "source": item["source"],
                    "summary": item["summary"],
                    "link": item.get("link", ""),
                    "published_at": str(item.get("published_at", "") or "").strip(),
                    "image_urls": item.get("image_urls", []) or ([item["image_url"]] if item.get("image_url") else []),
                }
            )

        if not titles:
            logging.warning("RSS scraping returned empty results. Falling back to LLM brainstorming.")

    if llm_client and not titles:
        logging.info(f"Autonomously generating blog topics via LLM (Profile: {config.profile_name})...")
        profile_name = runner.profile.get("name", "高级时尚编辑")
        visual_strategy = runner.profile.get("visual_strategy", "时尚、高级、专业")
        system_prompt = "You are an elite fashion editor."
        user_prompt = (
            f"Please brainstorm {config.count} highly creative blog post titles in English for profile: {profile_name}. "
            f"Visual strategy: {visual_strategy}. Return a JSON object with a 'titles' array containing strings."
        )
        if config.locale == "zh-CN":
            user_prompt = (
                f"Please brainstorm {config.count} highly creative blog post titles in Chinese for profile: {profile_name}. "
                f"Visual strategy: {visual_strategy}. Return a JSON object with a 'titles' array containing strings."
            )
            user_prompt = _read_agent_prompt(
                AI_BLOGGER_DIR / "agents" / "@agent_topic_generator.md",
                user_prompt,
                {
                    "{count}": str(config.count),
                    "{profile_name}": profile_name,
                    "{visual_strategy}": visual_strategy,
                },
            )

        try:
            res = llm_client.generate_json(system_prompt, user_prompt)
            titles = list(res.get("titles", []))[: config.count]
        except Exception as exc:
            logging.error(f"Failed to generate topics autonomously: {exc}")
            errors.append(_error("TOPIC_GENERATION_FAILED", "Failed to generate topics autonomously", exc))

    if not titles:
        titles = [f"Autumn Minimalist Look {i}" for i in range(1, config.count + 1)]

    return {"topics": topics, "titles": titles, "seed_materials": seed_materials, "errors": errors, "runner": runner}

