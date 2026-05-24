# 10｜SmartWardrobe AI 博客提示词与布局规则

> 目标：让 AI Blogger 生成的内容成为一个泛时尚 / 穿搭博客平台的高质量内容流：可读、有审美判断、有图文节奏，既能写趋势、秀场、穿搭、单品和美学，也能写文化、行业与人物。

## 1. 内容定位

SmartWardrobe 的 AI 博客是一个时尚与穿搭内容平台，不应被收窄成“衣橱管理工具说明”。每篇文章都要同时回答三件事：

1. **读者应该看见什么时尚变量**：廓形、比例、材质、色彩、场景、秀场语言、品牌叙事或社会语境。
2. **读者能获得什么内容价值**：趋势理解、穿搭参考、审美判断、新闻背景、人物/品牌观察或文化解释。
3. **这篇文章为什么属于一个时尚博客平台**：它要有清楚栏目感、视觉节奏和编辑判断，而不是泛泛的内容农场。

可接受的内容气质：

- 有观点，但不耸动。
- 有审美，但不只写氛围。
- 可以有教程感，但不必每篇都落到具体衣橱动作。
- 有新闻事实时，事实优先于比喻。

## 2. Prompt Chain 的分工

### Phase 1：Angle Editor

只负责确定文章的“判断尺度”，不要开始写正文。

必须产出：

- `angle_title`：标题是一句审美判断，不能只是关键词拼接。
- `core_thesis`：一句话说明这篇文章为什么值得写。
- `reader_promise`：读者读完能得到什么理解、判断、穿搭参考或信息价值。
- `editorial_lens`：文章采用的编辑视角，如趋势解读、秀场观察、穿搭指南、单品分析、文化评论、品牌人物、审美随笔。
- `emotional_hook`：3-5 个字的情绪内核。
- `style_en`：用于图片检索的英文风格关键词。

### Phase 2：Outline Planner

只负责节奏、段落职责和布局选择。

每段都要明确：

- `section_name`：只能使用当前 profile 允许的栏目。
- `summary_intent`：该段讲什么。
- `reader_job`：读者看完这一段能理解什么、判断什么、参考什么或记住什么。
- `evidence_type`：这一段依赖哪类证据，如 `mood`、`silhouette`、`material`、`trend`、`runway`、`comparison`、`how_to`、`pitfall`、`quote`、`closing`。
- `layout_name`：只能使用当前 profile 的布局池。

### Phase 3：Draft Writer

只负责正文和图片语义，不重新发明结构。

每段正文必须遵守：

- 先给一个可反驳的观点，再用服装结构或场景证据解释。
- 图片不是装饰，每个 `image_caption` 都要说明“读者应该看图中的哪个变量”。
- `list_bullets` 只用于清单、步骤或快速判断；正文段落不要伪装成清单。
- `tip_box_rules` 只用于可执行规则，不放抽象结论。

## 3. 布局选择规则

| 内容意图 | 推荐布局 | 使用条件 |
|---|---|---|
| 开篇情绪、主视觉、事件现场 | `hero_full_bleed` | 通常只在第一段使用 |
| 观点 + 证据图 | `split_image_text` | 图片能清楚承载一个变量 |
| 细节解释、面料、肩线、配饰 | `float_left_photo` / `float_right_photo` | 图像作为旁证，不压过正文 |
| 三种场景或三种解法 | `lookbook_cards_3` | 必须是可对照的三张图 |
| 氛围/证据拼贴 | `image_mosaic_3` | 三张图必须服务同一个判断 |
| 关键论断 | `pull_quote_center` | 只放一句有力度的观点 |
| 规则、避坑、选择清单 | `tip_box_rules` | 用于可执行穿搭规则或编辑判断 |
| 纯分析或承接段 | `text_dense` | 不需要配图时使用 |
| 步骤、清单、TL;DR | `list_bullets` | 每一条都要有动作动词 |

## 4. 移动端可读性规则

- 长文也必须可扫读：每段只承担一个观点。
- 文章前 2 段必须让读者知道“这篇文章的时尚问题、审美判断或信息价值是什么”。
- 每 3-4 段至少出现一次视觉节奏变化：图片、清单、引用或规则框。
- 不要连续使用同一种图文分栏布局超过 2 次。
- 小标题/section 只作为数据字段；正文里不要重复写 `###` 或 `【模块名】`。

## 5. 图片与替代文本规则

每个图片对象至少包含：

```json
{
  "search_keyword": "short english search keywords",
  "image_caption": "Describe the scene and the exact style variable the reader should notice.",
  "image_alt": "Concise alt text that conveys the image's information in context."
}
```

写 `image_alt` 时不要写成关键词堆叠。它应该说明图片在文章里的信息功能，例如：

- 好：`A full-body street-style look showing a boxy blazer balancing wide-leg trousers.`
- 差：`fashion blazer street style editorial`

## 6. 禁用模式

- 禁止“在快节奏时代”“每个人都应该”“轻松拿捏高级感”这类 AI 套话。
- 禁止没有事实来源时写具体品牌、秀场、设计师、日期和地点。
- 禁止把图片当装饰；没有信息价值的图片宁可不要。
- 禁止把 `search_keyword` 写成长句；检索词短，图注和 alt 才负责语义。
- 禁止在正文中输出 HTML、Markdown 标题或裸 URL。
