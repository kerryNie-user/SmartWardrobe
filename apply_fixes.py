import re

file_path = "services/ai_blogger_new/run_pipeline.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Rewrite the entire <style> block to improve aesthetics and fix image aspect ratios
new_css = """    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500&display=swap');

        :root {
            --bg-color: #fcfbf9;
            --text-color: #1a1a1a;
            --text-light: #666666;
            --accent-color: #8c2a2a;
            --border-color: #e5e3db;
            --font-serif: 'Playfair Display', serif;
            --font-sans: 'Inter', sans-serif;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: var(--font-sans);
            line-height: 1.8;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 60px 20px;
        }
        
        /* Global Image Rule to PREVENT STRETCHING */
        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .header {
            text-align: center;
            margin-bottom: 80px;
            padding-bottom: 40px;
            border-bottom: 1px solid var(--border-color);
        }
        .header h1 {
            font-family: var(--font-serif);
            font-size: 28px;
            letter-spacing: 3px;
            text-transform: uppercase;
            font-weight: 600;
            margin: 0 0 12px 0;
        }
        .header p {
            color: var(--text-light);
            font-size: 11px;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin: 0;
        }

        .post { margin-bottom: 120px; }
        .post-title {
            font-family: var(--font-serif);
            font-size: 46px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 24px;
            line-height: 1.2;
            color: var(--text-color);
        }
        .post-meta {
            text-align: center;
            font-family: var(--font-sans);
            font-size: 12px;
            color: var(--text-light);
            margin-bottom: 60px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }
        
        .paragraph-block { margin-bottom: 60px; clear: both; }
        .text-content {
            font-size: 17px;
            text-align: justify;
            color: #333;
            font-weight: 300;
        }
        .text-content strong {
            font-family: var(--font-sans);
            font-weight: 500;
            color: #000;
        }
        
        /* Layouts with strict aspect ratios for images */
        .layout-hero {
            margin: 0 0 50px 0;
            width: 100%;
            aspect-ratio: 16/9;
            background: #eee;
            overflow: hidden;
            clear: both;
        }
        
        .layout-float-right {
            float: right;
            width: 45%;
            margin: 10px 0 30px 40px;
            aspect-ratio: 3/4;
            background: #eee;
            overflow: hidden;
        }
        
        .layout-float-left {
            float: left;
            width: 45%;
            margin: 10px 40px 30px 0;
            aspect-ratio: 3/4;
            background: #eee;
            overflow: hidden;
        }
        
        .layout-split {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            align-items: center;
            margin: 60px 0;
        }
        .layout-split .split-media {
            aspect-ratio: 3/4;
            background: #eee;
            overflow: hidden;
        }
        .layout-split .split-text {
            padding: 0;
        }

        .layout-lookbook {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 60px 0;
            clear: both;
        }
        .layout-lookbook .look-card {
            display: flex;
            flex-direction: column;
        }
        .layout-lookbook .look-media {
            aspect-ratio: 3/4;
            background: #eee;
            overflow: hidden;
            margin-bottom: 12px;
        }
        .layout-lookbook .look-title {
            font-family: var(--font-serif);
            font-size: 14px;
            font-style: italic;
            text-align: center;
            color: var(--text-light);
            margin: 0;
        }

        .layout-mosaic {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 60px 0;
            clear: both;
        }
        .layout-mosaic .mosaic-item {
            aspect-ratio: 1/1;
            background: #eee;
            overflow: hidden;
        }

        .image-caption {
            margin-top: 12px;
            font-family: var(--font-sans);
            font-size: 11px;
            color: var(--text-light);
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .clearfix::after { content: ""; clear: both; display: table; }
        .divider {
            text-align: center;
            margin: 80px 0;
            color: var(--border-color);
            font-size: 24px;
            letter-spacing: 20px;
            clear: both;
        }
        .drop-cap::first-letter {
            font-family: var(--font-serif);
            font-size: 4em;
            float: left;
            line-height: 0.8;
            margin-right: 12px;
            margin-top: 6px;
            color: var(--accent-color);
        }

        .layout-pull-quote {
            font-family: var(--font-serif);
            font-size: 28px;
            font-style: italic;
            text-align: center;
            margin: 80px 40px;
            color: var(--accent-color);
            padding: 40px 0;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            line-height: 1.5;
            clear: both;
        }
        .layout-tip-box {
            background-color: #fff;
            padding: 40px;
            margin: 60px 0;
            border: 1px solid var(--border-color);
            border-left: 4px solid var(--accent-color);
            clear: both;
        }

        @media (max-width: 768px) {
            .container { padding: 30px 20px; }
            .post-title { font-size: 32px; }
            .layout-float-right, .layout-float-left {
                float: none; width: 100%; margin: 0 0 30px 0;
            }
            .layout-split { grid-template-columns: 1fr; gap: 30px; }
            .layout-lookbook, .layout-mosaic {
                display: flex;
                flex-wrap: nowrap;
                overflow-x: auto;
                scroll-snap-type: x mandatory;
                gap: 15px;
                margin: 40px -20px;
                padding: 0 20px 20px 20px;
                -webkit-overflow-scrolling: touch;
            }
            .layout-lookbook .look-card, .layout-mosaic .mosaic-item {
                min-width: 80%;
                flex: 0 0 80%;
                scroll-snap-align: center;
            }
        }
    </style>"""

content = re.sub(r'    <style>.*?</style>', new_css, content, flags=re.DOTALL)

# 2. Rewrite `render_media_block` to increase timeout and implement query shortening for broader fallbacks
old_media_block = """                    max_retries = 5
                    for attempt in range(max_retries):
                        # If we've exhausted original candidates, generate a fresh AI image url
                        if attempt >= len(candidates):
                            encoded_q = urllib.parse.quote(q)
                            fresh_ai_url = f"https://image.pollinations.ai/prompt/{encoded_q}?width=800&height=1200&nologo=true&seed={random.randint(1, 99999)}"
                            candidates.append(fresh_ai_url)
                            
                        url = candidates[attempt]
                        
                        if url in used_urls:
                            skipped_used_url += 1
                            continue
                            
                        try:
                            attempted_images += 1
                            timeout_val = 15 if "pollinations.ai" in url else 5
                            res = requests.get(url, headers=headers, timeout=timeout_val)"""

new_media_block = """                    # Expand candidates with a broader query if the original is very specific
                    words = q.split()
                    if len(words) > 3:
                        short_q = " ".join(words[:3])
                        short_candidates = get_image_candidates(short_q, image_config, per_page=5)
                        candidates.extend(short_candidates)

                    max_retries = 5
                    for attempt in range(max_retries):
                        # If we've exhausted original candidates, generate a fresh AI image url
                        if attempt >= len(candidates):
                            encoded_q = urllib.parse.quote(q)
                            fresh_ai_url = f"https://image.pollinations.ai/prompt/{encoded_q}?width=800&height=1200&nologo=true&seed={random.randint(1, 99999)}"
                            candidates.append(fresh_ai_url)
                            
                        url = candidates[attempt]
                        
                        if url in used_urls:
                            skipped_used_url += 1
                            continue
                            
                        try:
                            attempted_images += 1
                            # INCREASE TIMEOUTS: 25s for Pollinations AI (it draws on the fly), 10s for APIs
                            timeout_val = 25 if "pollinations.ai" in url else 10
                            res = requests.get(url, headers=headers, timeout=timeout_val)"""

content = content.replace(old_media_block, new_media_block)

# 3. Update the layout_lookbook_cards HTML generation to match the new CSS class (`look-media`)
old_lookbook_html = """                        <div class="look-card">
                            <div class="look-title">Look {i+1}</div>
                            <div class="split-media">{media}</div>
                        </div>"""

new_lookbook_html = """                        <div class="look-card">
                            <div class="look-media">{media}</div>
                            <div class="look-title">Look {i+1}</div>
                        </div>"""

content = content.replace(old_lookbook_html, new_lookbook_html)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updates applied successfully.")
