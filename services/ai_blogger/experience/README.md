# 审美/艺术/哲学/穿搭写作资料包（可复用）

这是一套用于“长期积累审美写作能力”的 Markdown 资料库：既能当作**书签库**，也能当作**写作模板仓库**，随取随用。

## 使用方式（建议）

1. **先选题**：打开 `02_topic_frameworks.md`，用问题清单把题目从“感觉”变成“论点”。
2. **再搭结构**：打开 `04_article_structures_templates.md`，挑一个结构骨架把段落先铺开。
3. **最后打磨语言 + 排版 + 配图**：分别用 `03_language_style_toolkit.md`、`06_typography_layout_checklist.md`、`07_images_and_visuals.md`。
4. **需要短内容（推文/线程）时**：直接复制 `05_microcontent_twitter_templates.md` 的模板。
5. **生成 SmartWardrobe 正式博客前**：先读 `10_smartwardrobe_editorial_prompt_guide.md`，确保文章能落到衣橱动作和 ClosetTwin 的内容气质。

## 文件导航

- [`01_sources_high_quality.md`](./01_sources_high_quality.md)：高质量来源库（博客/杂志/Newsletter/X 账号）
- [`02_topic_frameworks.md`](./02_topic_frameworks.md)：选题框架与灵感采集工作流
- [`03_language_style_toolkit.md`](./03_language_style_toolkit.md)：语言风格工具箱（句式、修辞、节奏）
- [`04_article_structures_templates.md`](./04_article_structures_templates.md)：长文结构模板（导语/深度解析/穿搭实操/结语）
- [`05_microcontent_twitter_templates.md`](./05_microcontent_twitter_templates.md)：短内容与推文线程模板（Hook、节奏、配图）
- [`06_typography_layout_checklist.md`](./06_typography_layout_checklist.md)：排版与可读性清单
- [`07_images_and_visuals.md`](./07_images_and_visuals.md)：配图策略与图片检索 Query 模板（怎么搜）
- [`08_case_studies_breakdowns.md`](./08_case_studies_breakdowns.md)：标杆案例拆解（可迁移套路）
- [`09_image_libraries_and_selection.md`](./09_image_libraries_and_selection.md)：精品图片资源库 + 选图方法 + 版权合规（搜到后怎么选）
- [`10_smartwardrobe_editorial_prompt_guide.md`](./10_smartwardrobe_editorial_prompt_guide.md)：SmartWardrobe 专属提示词、布局和图片语义规则

## 维护约定（建议）

- 新增来源时：按 `01_sources_high_quality.md` 的条目格式追加，并附上“为什么值得学”的一句话。
- 发现好用句式/结构时：优先沉淀到 `03/04/05`，保持可复制性。
- 每季度回顾一次：把“当季最常用的模板”挪到文件顶部，减少查找成本。

---

## 🤖 AI 自动化防错红线 (Technical Guardrails)

如果你（或 AI Agent）正在根据本资料库编写自动化博客生成脚本，请**务必**遵守以下技术红线：

1. **Python F-String 格式化警告**：本文档库中大量使用了 `{变量}` 的占位符（如 `{topic_title}`）。在代码实现时，请**绝对确保**使用正确的 Python f-string 格式化（例如 `f"总结来说，{topic_title}..."`），防止变量未被解析而原样输出。
2. **图片 API 封禁声明**：严禁在代码中使用已废弃的 `source.unsplash.com`（会返回随机/错误图片）。必须通过正规的 Unsplash NAPI、Pexels API 或直接抓取真实 JSON 端点获取图片。详见 `09_image_libraries_and_selection.md`。
