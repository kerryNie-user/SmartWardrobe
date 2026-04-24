# apps/web-new Discovery / Post Detail 显式 Page Contract v1

## 目标

- 将 `discovery` 与 `post-detail` 纳入 `apps/web-new` 统一页面协议。
- 把页面内部的 query、tab、share feedback、social state、comment state 收敛为可订阅的 domain store，而不是散落在 page controller 中。
- 为两个页面补齐统一的首帧、hydrate、teardown、retry、sync feedback 处理。
- 保持当前数据来源以本地内容数据和本地持久化为主，不在本轮引入新的远端 API。

## 转端定位

- 本轮直接服务 Android / Apple 转端准备。
- 页面层只负责消费 page contract 与桥接 DOM 事件。
- 可跨端复用的逻辑沉淀到 `js/lib`：
  - `discoveryViewStore`
  - `discoverySocialStore`
  - `discoveryCommentStore`
  - `pageContracts.js`
  - `pageStoreBinding.js`

## 现状问题

- `discoveryPage.js` 当前在页面内创建 `state`，并直接处理 tab、query、like、save、share 逻辑。
- `postDetailPage.js` 当前在页面内直接读取帖子内容、社交状态与评论状态，并直接管理 click/submit 监听。
- 两页虽有本地状态与持久化，但没有统一的：
  - contract builder
  - 订阅式 source of truth
  - hydrate / retry 语义
  - sync feedback surface
  - teardown 约束

## 方案选择

### 方案 A：协议优先，保留现有页面内状态

- 仅新增 `createDiscoveryPageContract()`、`createPostDetailPageContract()`
- 页面继续持有 `state` 并手动 `paint()`
- 优点：改动小
- 缺点：页面协议统一了，但状态边界仍无法跨端复用

### 方案 B：统一协议 + 抽成可订阅 store

- 为 Discovery 视图状态、社交状态、评论状态补轻量 store 入口
- 页面统一走 `bindPageStores()`
- 保留本地持久化实现，不扩大到完整 remote service
- 优点：兼顾收口速度与跨端复用
- 缺点：需要补额外测试与状态同步边界

### 方案 C：完整 repository / service / store 重构

- 为 Discovery 视图、社交、评论全部补 local repository + service + thin store
- 优点：架构最整齐
- 缺点：明显超出“统一页面协议”任务范围

## 本轮采用

- 采用方案 B。
- 目标是先让 `discovery / post-detail` 与 `profile / schedule / wardrobe` 一样，拥有统一 contract、binding、sync 反馈与可订阅状态入口。

## Source Of Truth

### Discovery

- 静态内容：
  - `getDiscoveryContent(locale)`
- 页面视图状态：
  - `discoveryViewStore`
  - 包含 `activeTab`、`query`、`shareFeedbackPostId`
- 社交状态：
  - `discoverySocialStore`
  - 包含 `likedPostIds`、`followedAuthors`、saved post 衍生态
- 页面 contract：
  - `createDiscoveryPageContract()`

### Post Detail

- 内容数据：
  - `getPostDetailContent(locale, postId)`
- 社交状态：
  - `discoverySocialStore`
- 评论状态：
  - `discoveryCommentStore`
- 页面 contract：
  - `createPostDetailPageContract()`

## Store 边界

### discoveryViewStore

- 职责：
  - 维护 Discovery 页本地视图状态
  - 暴露可订阅 snapshot
  - 提供 `hydrate / retry` 语义
- 建议接口：
  - `getDiscoveryViewSnapshot()`
  - `subscribeDiscoveryViewStore(listener)`
  - `hydrateDiscoveryView(locale)`
  - `retryDiscoveryViewHydration(locale)`
  - `setDiscoveryActiveTab(tab)`
  - `setDiscoveryQuery(query)`
  - `setDiscoveryShareFeedback(postId)`
  - `clearDiscoveryShareFeedback()`
  - `getDiscoveryViewSyncState()`
  - `subscribeDiscoveryViewSyncState(listener)`

### discoverySocialStore

- 职责：
  - 吸收 `toggleDiscoveryLike / toggleDiscoveryFollow / getPostSocialState`
  - 继续通过 favorites store 维护 save/un-save
  - 将 social state 变为可订阅快照
- 建议接口：
  - `getDiscoverySocialSnapshot()`
  - `subscribeDiscoverySocialStore(listener)`
  - `hydrateDiscoverySocial(locale)`
  - `retryDiscoverySocialSync(locale)`
  - `toggleDiscoveryPostLike(postId)`
  - `toggleDiscoveryAuthorFollow(authorId)`
  - `getPostSocialState(post)`
  - `getDiscoverySocialSyncState()`
  - `subscribeDiscoverySocialSyncState(listener)`

### discoveryCommentStore

- 职责：
  - 保留本地评论持久化
  - 为 post-detail 提供可订阅读写入口与 sync state
- 建议接口：
  - `getDiscoveryCommentSnapshot(postId)`
  - `subscribeDiscoveryCommentStore(listener)`
  - `hydrateDiscoveryComments(locale)`
  - `retryDiscoveryCommentSync(locale)`
  - `getPostComments(post)`
  - `savePostComment(postId, comment)`
  - `getDiscoveryCommentSyncState()`
  - `subscribeDiscoveryCommentSyncState(listener)`

## 本地 Sync 语义

- 虽然本轮无远端 API，但仍需要统一 sync 语义以服务跨端迁移。
- 三个域统一采用 local-backed sync 约定：
  - `loading`
    - 首次 hydrate 本地 snapshot
  - `synced`
    - 已从本地持久化完成加载
  - `failed`
    - localStorage 解析失败、写入失败或读取异常
  - `stale`
    - 当前不主动制造；保留语义兼容
  - `retry`
    - 重试读取本地 snapshot，并触发 repaint
- sync feedback surface 统一为 `topbar`

## Discovery Page Contract

### state

- `tab: hotspots | posts`
- `query: string`
- `shareFeedbackPostId: string`

### derivedView

- `topbar`
- `tabs`
- `search`
- `trendStrip`
- `feed`
- `activeTab`
- `query`
- `panel`

### actions

- `switchTab(tab)`
- `setQuery(query)`
- `togglePostLike(postId)`
- `togglePostSave(post)`
- `sharePost(postId)`

### loading

- `initialLoading`
- `backgroundSyncing`

### empty

- `filteredEmpty`
- `fallbackContent`

### error

- 以 sync 语义为主
- 内容流空结果仍属于 `empty` 而不是 `error`

### sync

- `sourceOfTruth`: discoveryViewStore + discoverySocialStore + favorites store snapshot
- `hydrateDomains`: discoveryView、discoverySocial
- `writebackDomains`: discoverySocial
- `retrySemantics`: retry-domain / retry-all
- `syncFeedbackSurface`: topbar

## Post Detail Page Contract

### state

- `postId`
- `shareFeedback`

### derivedView

- `topbar`
- `article`
- `social`
- `comments`
- `missingState`

### actions

- `togglePostSave(post)`
- `togglePostLike(postId)`
- `toggleAuthorFollow(authorId)`
- `sharePost(postId)`
- `saveComment(postId, body)`
- `backToDiscovery()`

### loading

- `initialLoading`
- `backgroundSyncing`

### empty

- 评论为空不触发主体空态
- 仅当 `postId` 无对应 post 时，使用 `noData`

### error

- sync 失败、读取失败、评论写入失败

### sync

- `sourceOfTruth`: post content + discoverySocialStore + discoveryCommentStore
- `hydrateDomains`: discoverySocial、discoveryComments
- `writebackDomains`: discoverySocial、discoveryComments
- `retrySemantics`: retry-domain / retry-all
- `syncFeedbackSurface`: topbar

## 页面运行时约束

- 两页都要使用 `bindPageStores({ paint, subscriptions, hydrators, syncFeedback })`
- 首帧始终：
  - 先读取当前 snapshot paint
  - 再运行 hydrator
- 所有 DOM 事件监听：
  - 统一由页面文件注册
  - 在 `teardown()` 中释放
- 页面渲染只消费 contract，不直接拼多个状态源

## 完成标准

- `discovery / post-detail` 都有显式 contract builder
- `discoveryView / discoverySocial / discoveryComments` 具备可订阅 store 入口
- 两页都通过 `bindPageStores()` 驱动首帧、hydrate、retry、teardown
- 顶部有统一 sync feedback，且对应 retry-domain / retry-all 可点击
- 自动化测试、diagnostics、浏览器快照均提供新证据
