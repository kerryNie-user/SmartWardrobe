# TODO: SmartWardrobe 架构重构（解耦、接口最小化、目录整理）

## 目标
把当前代码从“功能可用”整理成“边界清晰、模块解耦、目录优雅”的结构：

- 每个功能模块只向外暴露必要且足够简单的接口。
- 页面层、状态层、服务层、持久化层的依赖方向单向清晰。
- 目录结构按职责收拢，同类文件集中，入口明确，避免散落和堆砌。
- 兼容逻辑保留，但必须收敛在迁移层或 repository 层，不向上扩散。

## 核心要求

- [x] 统一模块出口，只保留 `read / hydrate / save / retry / subscribe` 这类必要接口。
- [x] 页面只依赖 contract、store 和少量 action，不直接穿透到 repository 或底层存储。
- [x] 将默认值、兼容字段、旧路径映射、数据归一从页面和组件中移走。
- [x] 将 view model 聚合、同步状态、错误语义、空态语义拆成可复用层。
- [x] 收紧目录职责，让页面、组件、data、lib、backend、tests 各归其位。
- [x] 保持每个功能域只有一个清晰主入口，避免同一能力在多个文件里重复出口。

## 目录整理原则

- `apps/web/js/pages/`：只放页面壳层与路由编排。
- `apps/web/js/components/`：只放纯渲染组件。
- `apps/web/js/lib/`：只放 domain store、service、selector、navigation、sync、auth 等复用逻辑。
- `apps/web/js/data/`：只放静态文案、页面 copy、种子数据。
- `services/backend/`：按启动、路由、存储、模型、测试分层，不把业务逻辑散进入口文件。
- `services/ai_blogger/`：按 pipeline、prompt chain、topic、image、layout、protocol、worker 分层，不把批量生成、渲染、持久化继续堆在入口文件。
- `tests/`：按页面、store、contract、API 分区，避免测试命名和职责混乱。

## 实施步骤（TDD）

- [x] 1. 先盘点当前所有对外接口，列出真正需要暴露的最小 API。
- [x] 2. 为每个 domain 定义统一的 module contract。
- [x] 3. 将页面层和数据层之间的直接穿透调用收口到 store / service。
- [x] 4. 按目录职责重排文件，确保模块归属一目了然。
- [x] 5. 为关键目录边界补测试，防止以后重新耦合。

## 已开始的重构切片

- [x] 1. 将 `apps/web/js/lib/pageContracts.js` 收敛为稳定公开出口。
- [x] 2. 将 page contract 实现按页面域拆入 `apps/web/js/lib/pageContracts/`。
- [x] 3. 抽出 shared contract 语义，统一 tab、sync、loading、empty、error 规则。
- [x] 4. 将 `favoritesStore.js` 拆成 facade + local repository + remote repository + service。
- [x] 5. 将 `wardrobeStore.js` 拆成 facade + local repository + remote repository + service。
- [x] 6. 补充 `ARCHITECTURE.md`，明确公开入口、内部模块与禁止依赖。
- [x] 7. 新增 `apps/web/tests/module-boundaries.shell.test.js`，防止页面直接依赖内部实现。
- [x] 8. 将 `services/backend/handler.py` 拆成 HTTP 适配层、API 路由层、文件资产层和响应契约层。
- [x] 9. 新增后端边界测试，防止 handler 重新堆叠业务路由与文件读取逻辑。
- [x] 10. 将 `services/backend/http/` 收拢为后端 HTTP 内部模块，避免路由、资产、契约散落在 backend 顶层。
- [x] 11. 将 `storage.py` 收敛为 `JsonDatabase` facade，将账号、日程、收藏、发现、媒体、衣橱、编辑运营和 schema 拆入 `storage_domains/`。
- [x] 12. 将模型注册表集中到 `models.py` 的 `ALL_MODELS`，避免初始化脚本和存储层重复维护表清单。
- [x] 13. 更新后端 README 与边界测试，覆盖整个 `services/backend` 目录的职责划分。
- [x] 14. 将 `services/ai_blogger/run_pipeline.py` 收敛为批量任务编排入口。
- [x] 15. 将 AI Blogger 配置、选题、生成、图片追踪、HTML 渲染、数据库持久化和报告输出拆入 `services/ai_blogger/pipeline/`。
- [x] 16. 保留 `run_pipeline.run_batch` 和 `run_pipeline.ImageTracker` 兼容出口，避免 backend 与脚本调用断裂。
- [x] 17. 新增 AI Blogger pipeline 边界测试，防止入口文件重新堆叠下载、渲染和数据库写入逻辑。
- [x] 18. 将 SmartWardrobe / ClosetTwin 专属博客提示词、布局规则和图片语义契约沉淀到 `experience/10_smartwardrobe_editorial_prompt_guide.md`。
- [x] 19. 优化 AI Blogger 三阶段 prompt，让 angle、outline、draft 分别约束读者收益、编辑视角、段落任务、证据类型、布局节奏和图片 alt。
- [x] 20. 扩展布局 registry 与 HTML 预览渲染，支持 `text_dense`、`list_bullets`，并转义模型生成内容。

---

## 已完成的衣橱收敛

- [x] 衣橱页只保留一个“添加单品”入口，移除“快速新增”和“即时 AI 扫描”。
- [x] 添加单品页只保留上传照片，去掉标题、分类、尺码、颜色、材质、收藏等手填项。
- [x] 识图结果只通过模型接口返回并写入记录，前后端预留 `aiJson` 存储与读取接口。
- [x] 衣橱分类筛选数量改为依据当前已有单品的真实分类统计。
- [x] 单品页与衣橱页的文案收敛为“上传照片 -> 模型识别回填”的最小接口表达。

---

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
