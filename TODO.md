# TODO: AI Blogger 架构升级（支持多频道画像）

## 目标
将当前硬编码的“实用穿搭指南”生成流水线，重构为基于 **Profile（画像）驱动** 的多频道动态架构，从而无缝支持“时尚新闻”、“哲学美学”等弱穿搭属性的新主题，并为未来的扩展打下基础。

## 实施步骤（TDD）

### 阶段 1：强化 RSS 抓取（支持提取图片）
- [x] 1. 扩展 `scrape_feed` 函数，不仅提取 `title` 和 `summary`，还要解析 `summary` 中的 `<img src="...">` 标签，或者解析 RSS 的 `media:content` 节点，提取出高质量的原图 URL。
- [x] 2. 编写 `test_trend_scraper_image.py` 验证图片 URL 是否被正确提取。

### 阶段 2：调整选题生成逻辑（引入新闻源）
- [x] 1. 在生成选题（`generated_titles`）时，判断当前的 Profile：
  - 如果是 `fashion_news`，则调用 `trend_scraper.get_latest_trends()` 获取真实新闻列表。
  - 将抓取到的真实新闻标题作为 `generated_titles`（不再让 LLM 凭空脑暴标题）。
  - 将抓取到的 `summary` 和 `image_url` 缓存起来，作为后续生成的“种子物料（Seed Material）”。

### 阶段 3：改造 Prompt Chain（支持外部物料注入）
- [x] 1. 修改 `run_chain` 方法签名，支持接收可选的 `seed_material` 字典。
- [x] 2. 在 Phase 1（Angle Generation）时，如果存在 `seed_material`，将其真实内容（原文摘要）附带在 Prompt 中，强制要求大模型“基于真实新闻事件深度改写”。
- [x] 3. 在 Phase 2（Outline）和 Phase 3（Drafting）时，拦截图片生成逻辑：
  - 如果存在 `seed_material.image_url`，则在需要配图的段落中，直接硬编码使用该真实图片 URL，并设置标志位 `_direct_url`。

### 阶段 4：调整图片下载器
- [x] 1. 在 `render_media_block` 阶段，读取大纲中传递过来的真实新闻图片 URL（`_direct_url`）。
- [x] 2. 如果存在直接 URL，则绕过 `image_sourcer.py` 的 Pexels/Met 逻辑，直接下载新闻原图并落盘。