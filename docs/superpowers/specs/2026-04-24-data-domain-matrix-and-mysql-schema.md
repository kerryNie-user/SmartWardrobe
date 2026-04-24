# SmartWardrobe Data Domain Matrix & MySQL Schema Design

## 1. 概览 (Overview)

为了推进“全量数据迁库”目标并落实 **方案 A**，本规格书明确了 `apps/web-new` 与 `backend_lite` 之间的数据边界、同步策略以及 MySQL 存储的表结构设计。

**核心决策：**
- **远端真相 (Remote Truth)**：所有用户相关的领域实体（衣物、日程、社交互动、收藏、设置）的唯一真相在 `backend_lite` (后续落库 MySQL)。
- **本地态 (Local State)**：前端 `apps/web-new` 仅保留 `fallback seed` (兜底种子数据)、`cache` (缓存)、`draft` (表单草稿) 和 `pending mutation` (待定写回)。
- **外部存放 (Outside DB)**：图片实体放本地/云端对象存储，DB 只存 URL；页面文案 (content) 和推荐分数 (score) 由前端本地维护或实时计算，不入库。

---

## 2. 全域数据边界台账 (Data Domain Matrix)

| 领域 (Domain) | 远端真相 (Remote Truth / DB) | 前端本地态 (Local State) | Hydrate 触发时机 | 写回与重试 (Writeback / Retry) | 冲突与回滚 (Conflict / Rollback) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Wardrobe (衣物)** | 衣物实体、属性、状态、所属类目/标签 | 缓存、创建/编辑草稿 | 启动加载、切换到衣物 Tab 时 | 表单提交时立刻写回 (支持重试) | 失败时回滚本地快照，保留草稿 |
| **Schedule (日程)** | 日程事件、绑定的衣物/穿搭、版本号 | 待同步队列、编辑草稿 | 启动加载、按周/月视图滚动时 | 增删改时立即乐观更新并写回 | 基于 `version` 校验冲突，冲突时覆盖本地并标记 `conflict` |
| **Discovery Social** | 点赞、收藏、关注状态 | 乐观更新态、Pending 队列 | 列表页、详情页加载时 | 触发动作时乐观更新，后台静默写回 | 失败时撤销乐观更新，弹 Toast 提示重试 |
| **Discovery Comments**| 评论实体、稳定 `commentId` | 正在发送的评论、评论草稿 | 详情页加载时、翻页时 | 提交时乐观上屏，获取稳定 ID | 失败时变红/打感叹号，提供手动重试按钮 |
| **Favorites (收藏)** | 用户收藏的衣物、内容、穿搭 | 本地缓存 | 启动加载、进入收藏夹时 | 收藏/取消时乐观更新写回 | 失败时回滚本地状态 |
| **Profile & Settings** | 身材信息、偏好、尺码、推荐开关 | 表单草稿 | 启动加载、进入设置页时 | 点击保存时整体写回 | 失败时保留表单不关闭，提示用户 |

---

## 3. 适合存入数据库的数据 (MySQL 模式设计)

为了把 `backend_lite` 的存储层从 JSON 迁移到 MySQL，以下是需要创建的核心表（逻辑模型）：

### 3.1 用户与偏好 (User & Settings)
- **`users`**: `id`, `username`, `avatar_url`, `created_at`
- **`user_preferences`**: `user_id`, `body_shape`, `size_tops`, `size_bottoms`, `budget_range`, `recommendation_enabled` (JSON 扩展字段存零散设置)

### 3.2 衣物库 (Wardrobe)
- **`wardrobe_items`**: `id`, `user_id`, `image_url` (存引用), `category`, `color`, `brand`, `season`, `material`, `status` (在洗/闲置等), `created_at`
- **`wardrobe_tags`**: `id`, `item_id`, `tag_name`

### 3.3 日程 (Schedule)
- **`schedules`**: `id`, `user_id`, `event_date` (ISO8601), `event_type`, `scene`, `dress_code`, `status`, `version` (用于并发冲突控制)
- **`schedule_outfits`**: `schedule_id`, `wardrobe_item_id` (关联当日穿搭)

### 3.4 社交与内容交互 (Discovery)
- **`posts`**: (如果只做外部 seed，可以仅存基础信息或不建表；如果后续运营，建 `id`, `author_id`, `content`, `image_urls`)
- **`comments`**: `id`, `post_id`, `user_id`, `content`, `created_at`, `status` (正常/已删除)
- **`social_engagements`**: `user_id`, `target_id` (post/user), `engagement_type` (like/save/follow), `created_at`

### 3.5 收藏夹 (Favorites)
- **`favorites`**: `user_id`, `target_type` (item/post/outfit), `target_id`, `created_at`

---

## 4. 适合放在数据库之外的数据 (Outside DB)

1. **页面文案与默认配置 (UI Content & Fallback Seeds)**
   - 存放位置：`apps/web-new/js/data/` 或 `apps/web-new/js/lib/` (如 `wardrobeContent.js`, `scheduleSeed.js`)
   - 理由：属于前端静态资源，跨端复用时可转为 i18n 或本地常量配置，不需要走网络。
2. **派生数据与推荐算分 (Derived Selectors & Scores)**
   - 存放位置：前端 Selector (如 `homeSelectors.js`) 或后端实时计算内存。
   - 理由：属于运行时逻辑计算结果（比如基于偏好、历史行为、天气算出的打分排序），没有持久化价值。
3. **图片/多媒体文件本体 (Media Assets)**
   - 存放位置：本地文件系统 (如 `public/images/`) 或 OSS 对象存储。
   - 理由：数据库只存访问 URL (`image_url`) 和 Metadata。
4. **同步过程态 (Sync Process States)**
   - 存放位置：前端 Store (loading, syncing, stale, failed, conflict)。
   - 理由：反映当前网络与会话状态，刷新即重置。

---

## 5. 迁移执行计划 (Migration Rollout)

- **Phase 1: 基础设施** - 修改 `backend_lite`，引入 SQLite/MySQL ORM（如 SQLAlchemy / Peewee），创建上述基础表。
- **Phase 2: 领域切换 (P0 - Discovery)** - 社交点赞、评论迁移到 DB，保持前端 contract 不变，确保 `syncFeedback` 正常工作。
- **Phase 3: 领域切换 (P1 - Wardrobe/Schedule)** - 衣物和日程入库，重点验证日程的 `version` 冲突逻辑。
- **Phase 4: 领域切换 (P2 - Profile/Favorites)** - 补充其余用户数据，前端数据完全收敛到远端真相。
