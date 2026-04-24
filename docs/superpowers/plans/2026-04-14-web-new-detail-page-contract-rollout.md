# apps/web-new 详情与编辑页统一页面协议落地计划

## 目标

- 将 `profile-edit`、`schedule-event`、`wardrobe-item`、`wardrobe-detail` 纳入与聚合页一致的显式 page contract 协议。
- 为这 4 个页面补齐统一的首帧渲染、hydrate、teardown、retry、sync feedback 处理。
- 保持当前交互与路由行为稳定，不在本轮扩展 discovery / post-detail 的领域状态重构。

## 转端定位

- 本轮工作直接服务 `apps/web-new` 的 Android / Apple 转端准备，而不是 Web-only 优化。
- 复用逻辑应继续沉淀在 `js/lib/pageContracts.js`、`js/lib/pageStoreBinding.js` 和现有 store 中。
- 页面 controller 只保留 DOM 事件桥接与 contract 消费，不继续内联拼装 page state。

## 数据边界与 Source Of Truth

- `profile-edit`
  - source of truth: `profileStore`
  - hydrate / retry / sync 来源：`hydrateProfile()`、`retryProfileSync()`、`getProfileSyncState()`
- `schedule-event`
  - source of truth: `scheduleStore` + 新建态时的 `scheduleDraft`
  - hydrate / retry / sync 来源：`hydrateSchedule()`、`retryScheduleSync()`、`getScheduleSyncState()`
- `wardrobe-item`
  - source of truth: `wardrobeStore`
  - hydrate / retry / sync 来源：`hydrateWardrobe()`、`retryWardrobeSync()`、`getWardrobeSyncState()`
- `wardrobe-detail`
  - source of truth: `wardrobeStore`
  - hydrate / retry / sync 来源：`hydrateWardrobe()`、`retryWardrobeSync()`、`getWardrobeSyncState()`

## 文件地图

- `docs/superpowers/specs/2026-04-13-web-new-explicit-page-contracts-v1.md`
- `docs/superpowers/plans/2026-04-14-web-new-detail-page-contract-rollout.md`
- `apps/web-new/js/lib/pageContracts.js`
- `apps/web-new/js/lib/pageStoreBinding.js`
- `apps/web-new/js/pages/profileEditPage.js`
- `apps/web-new/js/pages/scheduleEventPage.js`
- `apps/web-new/js/pages/wardrobeItemPage.js`
- `apps/web-new/js/pages/wardrobeDetailPage.js`
- `apps/web-new/tests/page-contracts.shell.test.js`
- `apps/web-new/tests/profile.shell.test.js`
- `apps/web-new/tests/schedule.shell.test.js`
- `apps/web-new/tests/wardrobe-item.shell.test.js`
- `apps/web-new/tests/page-store-binding.shell.test.js`

## 统一 contract 约束

- 4 个新 builder 均输出：
  - `state`
  - `derivedView`
  - `actions`
  - `loading`
  - `empty`
  - `error`
  - `sync`
- `sync` 继续复用 `createSyncSemantics()`，surface 保持 `topbar`。
- `loading.initialLoading` 在首帧仍为 `false`，页面通过 `bindPageStores()` 实现“先 paint，再 hydrate”。
- `error` 仅表达 sync 失败、stale、conflict 等统一语义；详情页的“item not found”继续作为页面级 empty/error content，由 contract 的 `derivedView` 产出。

## 变更策略

- `pageContracts.js`
  - 新增 `createProfileEditPageContract()`
  - 新增 `createScheduleEventPageContract()`
  - 新增 `createWardrobeItemPageContract()`
  - 新增 `createWardrobeDetailPageContract()`
  - 保持通用 helper 不分叉，优先复用现有 `createCollectionEmpty()` 与 `createErrorSemantics()`
- `pageStoreBinding.js`
  - 优先保持 API 不变
  - 仅在测试暴露的真实缺口存在时才做最小增强，不为详情页引入新抽象层
- 页面 controller
  - 统一改成 `bindPageStores({ paint, subscriptions, hydrators, syncFeedback })`
  - `paint()` 内先读取 store snapshot，再交给 contract builder，渲染只消费 `contract.derivedView`
  - DOM 事件监听仍留在页面文件，但要与 binding 的 `teardown()` 协同，避免重复挂载

## TDD 步骤

1. 扩展 contract 失败测试
   - 修改 `apps/web-new/tests/page-contracts.shell.test.js`
   - 为 4 个新 builder 加入 shape 校验
   - 为 `schedule-event / wardrobe-detail` 增加可断言的 `empty/error/sync` 语义
   - 先运行：
     - `node apps/web-new/tests/page-contracts.shell.test.js`
   - 预期：因 builder 未实现而失败

2. 扩展页面壳层失败测试
   - 修改 `apps/web-new/tests/profile.shell.test.js`
   - 新增 `profile-edit` 页面通过统一 binding 进行 hydrate 后仍能保存、返回，并在 sync failed 时渲染 retry domain 入口
   - 修改 `apps/web-new/tests/schedule.shell.test.js`
   - 新增 `schedule-event` 首帧先渲染表单、hydrate 后刷新编辑态、failed sync 时出现 retry domain
   - 修改 `apps/web-new/tests/wardrobe-item.shell.test.js`
   - 新增 `wardrobe-item` 与 `wardrobe-detail` 的 sync feedback、retry-domain、teardown 覆盖
   - 先运行：
     - `node apps/web-new/tests/profile.shell.test.js`
     - `node apps/web-new/tests/schedule.shell.test.js`
     - `node apps/web-new/tests/wardrobe-item.shell.test.js`
   - 预期：因页面尚未接入 binding / sync feedback 而失败

3. 实现最小 contract
   - 修改 `apps/web-new/js/lib/pageContracts.js`
   - 为 4 个页面补 builder，并让字段命名与现有页面一致：
     - `profile-edit`：`profile`、`content`、`status`
     - `schedule-event`：`eventId`、`event`、`scheduleDraft`、`content`
     - `wardrobe-item`：`itemId`、`item`、`content`、`imagePreview`
     - `wardrobe-detail`：`itemId`、`item`
   - 运行：
     - `node apps/web-new/tests/page-contracts.shell.test.js`
   - 预期：contract 测试通过，页面测试仍失败

4. 接入 `profileEditPage.js`
   - 引入 `bindPageStores()`、`ensureSyncFeedbackRoot()`、`createProfileEditPageContract()`
   - 页面订阅：
     - `subscribeProfileStore()`
     - `subscribeProfileSyncState()`
   - hydrator：
     - `hydrateProfile(getLocale())`
   - retry：
     - `retryProfileSync(getLocale())`
   - `teardown`：
     - 页面 click / submit 监听需在 binding teardown 中解绑
   - 运行：
     - `node apps/web-new/tests/profile.shell.test.js`

5. 接入 `scheduleEventPage.js`
   - 引入 `bindPageStores()`、`ensureSyncFeedbackRoot()`、`createScheduleEventPageContract()`
   - 页面订阅：
     - `subscribeScheduleStore()`
     - `subscribeScheduleSyncState()`
   - hydrator：
     - `hydrateSchedule(getLocale())`
   - retry：
     - `retryScheduleSync(getLocale())`
   - 保持 `scheduleDraft` 只在新建态参与 `derivedView`
   - `teardown`：
     - submit 监听由页面保存解绑函数并在 binding teardown 时调用
   - 运行：
     - `node apps/web-new/tests/schedule.shell.test.js`

6. 接入 `wardrobeItemPage.js`
   - 引入 `bindPageStores()`、`ensureSyncFeedbackRoot()`、`createWardrobeItemPageContract()`
   - 页面订阅：
     - `subscribeWardrobeStore()`
     - `subscribeWardrobeSyncState()`
   - hydrator：
     - `hydrateWardrobe(getLocale())`
   - retry：
     - `retryWardrobeSync(getLocale())`
   - 保持上传预览逻辑在页面内，但 item/form copy 从 contract 读取
   - `teardown`：
     - file change 与 submit 监听都要解绑
   - 运行：
     - `node apps/web-new/tests/wardrobe-item.shell.test.js`

7. 接入 `wardrobeDetailPage.js`
   - 引入 `bindPageStores()`、`ensureSyncFeedbackRoot()`、`createWardrobeDetailPageContract()`
   - 页面订阅：
     - `subscribeWardrobeStore()`
     - `subscribeWardrobeSyncState()`
   - hydrator：
     - `hydrateWardrobe(getLocale())`
   - retry：
     - `retryWardrobeSync(getLocale())`
   - 缺失 item 时由 contract 产出 state panel copy
   - 运行：
     - `node apps/web-new/tests/wardrobe-item.shell.test.js`

8. 回归 `pageStoreBinding.js`
   - 仅当 detail/edit 页 teardown 测试失败时，最小修正 binding 使用方式或测试夹具
   - 运行：
     - `node apps/web-new/tests/page-store-binding.shell.test.js`

## 验证顺序

- `node apps/web-new/tests/page-contracts.shell.test.js`
- `node apps/web-new/tests/profile.shell.test.js`
- `node apps/web-new/tests/schedule.shell.test.js`
- `node apps/web-new/tests/wardrobe-item.shell.test.js`
- `node apps/web-new/tests/page-store-binding.shell.test.js`
- `node apps/web-new/tests/wardrobe.shell.test.js`
- `node apps/web-new/tests/profile.shell.test.js`
- `node apps/web-new/tests/schedule.shell.test.js`

## 语言诊断

- 页面与 contract 实现完成后运行 VS Code diagnostics：
  - `apps/web-new/js/lib/pageContracts.js`
  - `apps/web-new/js/pages/profileEditPage.js`
  - `apps/web-new/js/pages/scheduleEventPage.js`
  - `apps/web-new/js/pages/wardrobeItemPage.js`
  - `apps/web-new/js/pages/wardrobeDetailPage.js`

## 完成标准

- 4 个页面均通过统一 builder 输出显式 contract
- 4 个页面均通过 `bindPageStores()` 处理首帧、hydrate、retry、sync feedback
- 页面事件监听不会因重复 paint 产生重复绑定，teardown 可释放监听
- `profile / schedule / wardrobe` 三个域的 sync feedback 在详情/编辑页可见且可点击 retry
- 相关 shell tests 全部通过，且无新增 diagnostics
