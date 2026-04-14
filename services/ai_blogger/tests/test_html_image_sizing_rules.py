from services.ai_blogger.run_pipeline import run_batch


def test_html_contains_image_sizing_css_rules(tmp_path):
    result = run_batch(
        {
            "count": 1,
            "llm_provider": "mock",
            "download_images": False,
            "output_dir": str(tmp_path),
            "rng_seed": 0,
        }
    )

    html = tmp_path.joinpath(result["html_file"]).read_text(encoding="utf-8")
    assert ".layout-split img" in html
    assert "object-fit: cover" in html

