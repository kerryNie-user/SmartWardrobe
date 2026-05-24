import logging

from services.ai_blogger.chain_runner import PromptChainRunner
from services.ai_blogger.llm_client import UniversalLLMClient
from services.ai_blogger.pipeline.config import create_batch_artifacts, parse_batch_config
from services.ai_blogger.pipeline.generation import generate_article_results
from services.ai_blogger.pipeline.html_renderer import build_report_articles_and_html, write_html
from services.ai_blogger.pipeline.images import ImageTracker
from services.ai_blogger.pipeline.persistence import persist_content_posts
from services.ai_blogger.pipeline.reporting import build_report, write_reports
from services.ai_blogger.pipeline.topics import resolve_generation_plan
from services.ai_blogger.topic.topic_sourcer import TopicSourcer


def _load_latest_trends() -> list[dict]:
    from services.ai_blogger.trend_scraper import get_latest_trends
    from services.ai_blogger.utils.config import load_config

    return get_latest_trends(load_config())


def run_batch(config: dict) -> dict:
    batch_config = parse_batch_config(config)
    artifacts = create_batch_artifacts(batch_config.output_dir)
    tracker = ImageTracker(
        images_dir=artifacts.images_dir,
        max_images_total=batch_config.max_images_total,
        download_images=batch_config.download_images,
    )

    plan = resolve_generation_plan(
        batch_config,
        topic_sourcer_factory=TopicSourcer,
        llm_client_factory=UniversalLLMClient,
        runner_factory=PromptChainRunner,
        latest_trends_loader=_load_latest_trends,
    )

    results = generate_article_results(
        batch_config,
        titles=plan["titles"],
        seed_materials=plan["seed_materials"],
        runner=plan["runner"],
    )

    report_articles, html_content = build_report_articles_and_html(results, tracker)
    write_html(artifacts.html_path, html_content)

    report_errors = list(plan["errors"])
    db_error = persist_content_posts(
        results=results,
        tracker=tracker,
        locale=batch_config.locale,
        ts=artifacts.ts,
    )
    if db_error:
        report_errors.append(db_error)

    report = build_report(
        report_articles=report_articles,
        report_errors=report_errors,
        tracker=tracker,
        download_images=batch_config.download_images,
        max_images_total=batch_config.max_images_total,
    )
    write_reports(
        report=report,
        report_json_path=artifacts.report_json_path,
        report_md_path=artifacts.report_md_path,
        ts=artifacts.ts,
    )

    return {
        "html_file": artifacts.html_basename,
        "report_json": artifacts.report_json_basename,
        "report_md": artifacts.report_md_basename,
    }


def run():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=1, help="Number of articles to generate")
    parser.add_argument("--llm", type=str, default="real", help="LLM Provider ('real' or 'none' to skip LLM)")
    parser.add_argument("--profile", type=str, default="editorial_styling", help="Topic profile (e.g. editorial_styling, fashion_news)")
    parser.add_argument("--locale", type=str, default="zh-CN", help="Target locale ('zh-CN' or 'en-US')")
    args = parser.parse_args()

    logging.info("Initializing Prompt Chain Runner (Agentic Pipeline)...")
    result = run_batch(
        {
            "count": args.count,
            "llm": args.llm,
            "profile": args.profile,
            "locale": args.locale,
            "download_images": args.llm != "none",
            "output_dir": "services/ai_blogger/output",
            "max_images_total": args.count * 50,
        }
    )
    print(f"HTML: services/ai_blogger/output/{result['html_file']}")
    print(f"Report(JSON): services/ai_blogger/output/{result['report_json']}")
    print(f"Report(MD): services/ai_blogger/output/{result['report_md']}")


if __name__ == "__main__":
    run()
