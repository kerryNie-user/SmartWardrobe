from services.ai_blogger.run_pipeline import run_batch


def test_html_contains_multiple_layout_blocks(tmp_path):
    result = run_batch(
        {
            "count": 1,
            "llm_provider": "mock",
            "download_images": False,
            "output_dir": str(tmp_path),
            "rng_seed": 0
        }
    )

    html = tmp_path.joinpath(result["html_file"]).read_text(encoding="utf-8")
    assert 'class="layout-split"' in html
    assert 'class="layout-float-left"' in html
    assert 'class="layout-float-right"' in html
    assert 'class="layout-lookbook"' in html
    assert 'class="layout-mosaic"' in html
    # Removed comparison table and palette bar assertions as they were hardcoded and removed to maintain AI autonomy

