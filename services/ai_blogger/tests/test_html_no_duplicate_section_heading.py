from services.ai_blogger.run_pipeline import run_batch


def test_no_duplicate_section_heading(tmp_path):
    result = run_batch(
        {
            "count": 1,
            "download_images": False,
            "output_dir": str(tmp_path),
            "rng_seed": 0,
        }
    )

    html = tmp_path.joinpath(result["html_file"]).read_text(encoding="utf-8")
    assert "<strong>深度解析</strong> — 【深度解析】" not in html

