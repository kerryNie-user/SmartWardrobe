# apps/web-new Discovery / Post Detail 统一页面协议落地计划

## 目标

- 将 `discovery`、`post-detail` 纳入统一 page contract 与 `bindPageStores()` 运行时协议。
- 为两个页面补齐首帧、hydrate、teardown、retry、sync feedback。
- 新增轻量 `discoveryViewStore`、`discoverySocialStore`，并扩展 `discoveryCommentStore` 为可订阅 store。

## 转端定位

- 本轮服务 Android / Apple 转端准备。
- `query / tab / share feedback / social / comments` 必须脱离 page controller，收敛成跨端可复用状态边界。
- 不新增远端 API，不把任务扩大为完整 social backend。

## 数据边界与 Source Of Truth

- `discovery`
  - 静态内容：`getDiscoveryContent(locale)`
  - 视图状态：`discoveryViewStore`
  - 社交状态：`discoverySocialStore`
  - saved posts：沿用 `favoritesStore`
- `post-detail`
  - 内容：`getPostDetailContent(locale, postId)`
  - 社交状态：`discoverySocialStore`
  - 评论状态：`discoveryCommentStore`

## 文件地图

- `docs/superpowers/specs/2026-04-15-web-new-discovery-page-contracts-v1.md`
- `docs/superpowers/plans/2026-04-15-web-new-discovery-page-contract-rollout.md`
- `apps/web-new/js/lib/pageContracts.js`
- `apps/web-new/js/lib/pageStoreBinding.js`
- `apps/web-new/js/lib/discoveryViewStore.js`
- `apps/web-new/js/lib/discoverySocialStore.js`
- `apps/web-new/js/lib/discoveryCommentStore.js`
- `apps/web-new/js/pages/discoveryPage.js`
- `apps/web-new/js/pages/postDetailPage.js`
- `apps/web-new/tests/page-contracts.shell.test.js`
- `apps/web-new/tests/discovery.shell.test.js`
- `apps/web-new/tests/post-detail.shell.test.js`

## 变更策略

- 新文件优先，避免把旧 `discoveryState.js` 直接改成巨大杂糅模块。
- 若旧 `discoveryState.js` 仍被少量测试引用，则保留兼容导出并逐步改为委托新 store。
- `discoveryCommentStore.js` 不拆新文件，直接扩成订阅式 store，避免重复持久化逻辑。
- sync 语义采用 local-backed domain 约定，但接口命名与现有 remote-backed store 保持一致。

## TDD 步骤

1. 先补 contract 失败测试
   - 修改 `apps/web-new/tests/page-contracts.shell.test.js`
   - 新增 `createDiscoveryPageContract()`
   - 新增 `createPostDetailPageContract()`
   - 断言：
     - contract shape 完整
     - `discovery` 的 `empty.filteredEmpty`
     - `post-detail` 的 `empty.noData`
     - `sync.domains` 含 `discoveryView / discoverySocial / discoveryComments`
   - 运行：
     - `node apps/web-new/tests/page-contracts.shell.test.js`
   - 预期：因 builder 未实现失败

2. 补页面壳层失败测试
   - 修改 `apps/web-new/tests/discovery.shell.test.js`
   - 新增断言：
     - `renderDiscoveryPage()` 返回 binding
     - 挂载 `[data-ct-sync-feedback-root="discovery"]`
     - 存在 `discoveryView` 与 `discoverySocial` retry domain
     - teardown 可调用
   - 修改 `apps/web-new/tests/post-detail.shell.test.js`
   - 新增断言：
     - `renderPostDetailPage()` 返回 binding
     - 挂载 `[data-ct-sync-feedback-root="post-detail"]`
     - 存在 `discoverySocial` 与 `discoveryComments` retry domain
     - teardown 可调用
   - 运行：
     - `node apps/web-new/tests/discovery.shell.test.js`
     - `node apps/web-new/tests/post-detail.shell.test.js`
   - 预期：因页面尚未接入 binding/sync feedback 失败

3. 补 store 失败测试
   - 在 `apps/web-new/tests/discovery.shell.test.js` 或新增专门 store 壳测试中验证：
     - `discoveryViewStore` 初始 tab/query 正确
     - `setDiscoveryActiveTab()`、`setDiscoveryQuery()` 可触发 subscribe
     - `hydrateDiscoveryView()` 更新 sync state 为 `synced`
     - `discoverySocialStore` 点赞/关注后持久化并通知订阅者
     - `discoveryCommentStore` 写评论后可订阅回流
   - 运行相关测试，确认失败原因正确

4. 实现最小 `discoveryViewStore.js`
   - 新增 `apps/web-new/js/lib/discoveryViewStore.js`
   - 提供：
     - `getDiscoveryViewSnapshot()`
     - `subscribeDiscoveryViewStore()`
     - `setDiscoveryActiveTab()`
     - `setDiscoveryQuery()`
     - `setDiscoveryShareFeedback()`
     - `clearDiscoveryShareFeedback()`
     - `hydrateDiscoveryView()`
     - `retryDiscoveryViewHydration()`
     - `getDiscoveryViewSyncState()`
     - `subscribeDiscoveryViewSyncState()`
   - hydrate 只需从本地 snapshot 恢复当前视图状态并标记 `synced`

5. 实现最小 `discoverySocialStore.js`
   - 新增 `apps/web-new/js/lib/discoverySocialStore.js`
   - 吸收旧 `discoveryState.js` 的 social read/write 逻辑
   - 提供：
     - `getPostSocialState()`
     - `toggleDiscoveryPostLike()`
     - `toggleDiscoveryAuthorFollow()`
     - `toggleDiscoveryPostSave()` 委托 favorites store
     - `hydrateDiscoverySocial()`
     - `retryDiscoverySocialSync()`
     - `getDiscoverySocialSyncState()`
     - `subscribeDiscoverySocialStore()`
     - `subscribeDiscoverySocialSyncState()`
   - 保持用户隔离语义不变

6. 扩展 `discoveryCommentStore.js`
   - 补：
     - `hydrateDiscoveryComments()`
     - `retryDiscoveryCommentSync()`
     - `getDiscoveryCommentSyncState()`
     - `subscribeDiscoveryCommentStore()`
     - `subscribeDiscoveryCommentSyncState()`
   - 保留 `getPostComments()` 与 `savePostComment()` 兼容调用

7. 实现 `pageContracts.js`
   - 新增 `createDiscoveryPageContract()`
   - 新增 `createPostDetailPageContract()`
   - `discovery` contract 输入：
     - locale
     - content
     - activeTab
     - query
     - tabs
     - trendStrip
     - feed
     - shareFeedbackPostId
     - syncStates
   - `post-detail` contract 输入：
     - locale
     - postId
     - post
     - social
     - comments
     - shareFeedback
     - syncStates

8. 接入 `discoveryPage.js`
   - 引入：
     - `bindPageStores()`
     - `ensureSyncFeedbackRoot()`
     - `createDiscoveryPageContract()`
     - `discoveryViewStore`
     - `discoverySocialStore`
   - 页面改造：
     - `paint()` 内从 store 读取 snapshot
     - tabs/search/feed 事件改为调用 store action
     - share feedback 写入 `discoveryViewStore`
     - subscriptions:
       - `subscribeDiscoveryViewStore()`
       - `subscribeDiscoverySocialStore()`
       - 可选 `favoritesStore` 订阅，保证 save 状态刷新
     - hydrators:
       - `hydrateDiscoveryView(getLocale())`
       - `hydrateDiscoverySocial(getLocale())`
     - syncFeedback bindings:
       - `discoveryView`
       - `discoverySocial`
     - teardown 释放 tabs/search/feed 监听

9. 接入 `postDetailPage.js`
   - 引入：
     - `bindPageStores()`
     - `ensureSyncFeedbackRoot()`
     - `createPostDetailPageContract()`
     - `discoverySocialStore`
     - `discoveryCommentStore`
   - 页面改造：
     - `paint()` 内从 content + stores 读取快照
     - click/submit 事件改为 store action
     - commentsRoot 重绘只消费 contract
     - subscriptions:
       - `subscribeDiscoverySocialStore()`
       - `subscribeDiscoveryCommentStore()`
     - hydrators:
       - `hydrateDiscoverySocial(getLocale())`
       - `hydrateDiscoveryComments(getLocale())`
     - syncFeedback bindings:
       - `discoverySocial`
       - `discoveryComments`
     - teardown 释放 detail/comments 监听

10. 兼容旧 `discoveryState.js`
   - 若现有测试仍依赖其导出，则改为委托：
     - `createDiscoveryState()`
     - `setDiscoveryTab()`
     - `setDiscoveryQuery()`
     - `toggleDiscoveryLike()`
     - `toggleDiscoverySave()`
     - `toggleDiscoveryFollow()`
     - `getDiscoveryView()`
     - `getPostSocialState()`
   - 保证旧调用仍能跑通，同时页面主路径使用新 store

## 验证顺序

- `node apps/web-new/tests/page-contracts.shell.test.js`
- `node apps/web-new/tests/discovery.shell.test.js`
- `node apps/web-new/tests/post-detail.shell.test.js`
- `node apps/web-new/tests/page-store-binding.shell.test.js`
- `node apps/web-new/tests/favorites.shell.test.js`

## 浏览器验收

- 启动 `apps/web-new` 本地服务
- 打开：
  - `discovery.html`
  - `post-detail.html?id=brutalist-basics`
- 验证：
  - 首帧可见主壳层
  - 顶部 sync feedback root 存在
  - 点赞 / 收藏 / 评论 / 分享后页面能重绘
  - teardown 改动未导致重复绑定

## Diagnostics

- `apps/web-new/js/lib/discoveryViewStore.js`
- `apps/web-new/js/lib/discoverySocialStore.js`
- `apps/web-new/js/lib/discoveryCommentStore.js`
- `apps/web-new/js/lib/pageContracts.js`
- `apps/web-new/js/pages/discoveryPage.js`
- `apps/web-new/js/pages/postDetailPage.js`

## 完成标准

- `discovery / post-detail` 都通过显式 contract builder 输出统一协议
- `discoveryView / discoverySocial / discoveryComments` 都有可订阅 store 入口
- 两页都通过 `bindPageStores()` 处理首帧、hydrate、retry、teardown、sync feedback
- 相关 shell tests、浏览器验收、diagnostics 全部通过
