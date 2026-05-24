# SmartWardrobe Architecture

## 重构目标

SmartWardrobe 的代码边界以“页面薄、领域清、接口少”为准：

- 页面只做路由、页面状态和渲染编排。
- 组件只做纯渲染。
- store facade 是页面访问领域能力的唯一入口。
- service 负责同步、乐观写入、失败回滚和 retry。
- local repository 负责本地快照、默认值和兼容迁移。
- remote repository 负责 backend 请求。

## 公开入口

### Page Contracts

公开入口：

- `apps/web/js/lib/pageContracts.js`

内部实现：

- `apps/web/js/lib/pageContracts/*`

规则：

- 页面只能从 `pageContracts.js` 导入 contract。
- `pageContracts.js` 只做 barrel export，不放业务实现。
- `tab / sync / loading / empty / error` 语义统一放在 `pageContracts/shared.js`。

### Domain Stores

公开入口：

- `apps/web/js/lib/profileStore.js`
- `apps/web/js/lib/settingsStore.js`
- `apps/web/js/lib/favoritesStore.js`
- `apps/web/js/lib/wardrobeStore.js`
- `apps/web/js/lib/scheduleStore.js`

建议接口形态：

- read：同步读取当前快照，例如 `getProfile()`、`getWardrobeItems()`
- hydrate：拉取远端并刷新本地，例如 `hydrateProfile()`
- save/mutate：发起必要的领域写入，例如 `saveProfile()`、`toggleFavorite()`
- retry：重试失败同步，例如 `retryWardrobeSync()`
- subscribe：订阅快照或同步状态，例如 `subscribeSettingsStore()`

规则：

- 页面只能依赖 store facade。
- store facade 只编排公开 API、listener 和 sync state。
- localStorage 读写只放 local repository。
- backend 请求只放 remote repository。
- 乐观写入、回滚、pending mutation、retry 只放 service。

## 已整理模块

### Page Contracts

- 公开入口：`apps/web/js/lib/pageContracts.js`
- 内部实现：`apps/web/js/lib/pageContracts/`

### Favorites

- 公开入口：`apps/web/js/lib/favoritesStore.js`
- 内部本地仓库：`apps/web/js/lib/favorites/localRepository.js`
- 内部远端仓库：`apps/web/js/lib/favorites/remoteRepository.js`
- 内部服务：`apps/web/js/lib/favorites/service.js`

### Wardrobe

- 公开入口：`apps/web/js/lib/wardrobeStore.js`
- 内部本地仓库：`apps/web/js/lib/wardrobe/localRepository.js`
- 内部远端仓库：`apps/web/js/lib/wardrobe/remoteRepository.js`
- 内部服务：`apps/web/js/lib/wardrobe/service.js`

### Backend

- HTTP 适配层：`services/backend/handler.py`
- HTTP 内部模块：`services/backend/http/`
- 存储公开入口：`services/backend/storage.py`
- 存储领域模块：`services/backend/storage_domains/`
- 模型注册表：`services/backend/models.py`

规则：

- `handler.py` 只负责请求入口、响应输出和错误映射。
- `http/routes.py` 只负责 URL 到领域调用的路由与契约校验。
- `http/assets.py` 只负责上传文件和 AI 图片的安全读取。
- `http/contracts.py` 只定义 HTTP 层响应和错误契约。
- `storage.py` 只保留 `JsonDatabase` facade，不直接堆业务方法。
- `storage_domains/*` 按账号、日程、收藏、发现、媒体、衣橱、编辑运营和 schema 维护拆分。
- `models.py` 统一维护 Peewee 模型和 `ALL_MODELS` 表注册。
- 后端路由和文件服务不再堆回 `handler.py`。
- 后端业务存储逻辑不再堆回 `storage.py`。

### AI Blogger

公开入口：

- `services/ai_blogger/run_pipeline.py`
- `services/ai_blogger/chain_runner.py`
- `services/ai_blogger/image_sourcer.py`

内部实现：

- `services/ai_blogger/pipeline/`
- `services/ai_blogger/topic/`
- `services/ai_blogger/layouts/`
- `services/ai_blogger/metrics/`
- `services/ai_blogger/protocol/`
- `services/ai_blogger/experience/`

规则：

- `run_pipeline.py` 只负责批量任务编排和 CLI 入口。
- `pipeline/config.py` 只负责配置归一和输出文件路径。
- `pipeline/topics.py` 只负责选题、新闻 seed 和 profile 驱动的标题来源。
- `pipeline/generation.py` 只负责把标题转换成文章结果。
- `pipeline/images.py` 只负责图片下载、去重和图片指标。
- `pipeline/html_renderer.py` 只负责 HTML 输出，不写数据库。
- `pipeline/persistence.py` 只负责将生成结果写入 `ContentPost`。
- `pipeline/reporting.py` 只负责报告结构和报告文件输出。
- `run_pipeline.ImageTracker` 保留兼容 re-export，但实现不再放在入口文件。
- `experience/10_smartwardrobe_editorial_prompt_guide.md` 是 SmartWardrobe 专属博客提示词和布局规则的知识源。
- `agents/*` 只定义 prompt chain 契约，不写图片下载、HTML 渲染或数据库逻辑。
- `profiles/*.json` 只组合栏目、布局池、视觉策略和 KB 文件，不内联长提示词正文。
- HTML 预览必须转义模型生成的标题、正文、布局属性和图片 alt，避免 LLM 输出破坏预览页。

## 禁止依赖

- `apps/web/js/pages/*` 不允许导入 `apps/web/js/lib/*/localRepository.js`
- `apps/web/js/pages/*` 不允许导入 `apps/web/js/lib/*/remoteRepository.js`
- `apps/web/js/pages/*` 不允许导入 `apps/web/js/lib/*/service.js`
- `apps/web/js/pages/*` 不允许直接导入 `apps/web/js/lib/pageContracts/*`
- `apps/web/js/lib/*Store.js` 不允许导入 `apps/web/js/pages/*`
- `apps/web/js/lib/*Store.js` 不允许导入 `apps/web/js/components/*`

这些规则由 `apps/web/tests/module-boundaries.shell.test.js` 覆盖。

AI Blogger 入口边界由 `services/ai_blogger/tests/test_pipeline_boundaries.py` 覆盖。
