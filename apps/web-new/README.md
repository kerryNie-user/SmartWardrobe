# apps/web-new

这是当前主线前端。

## 定位

- 作为当前主要 Web 实现继续演进
- 同时作为未来 Android 与 Apple 客户端转换前的过渡表面
- 优先沉淀可复用的状态逻辑、数据边界与页面 contract，而不是只做网页专属优化

## 目录约定

- `css/`：样式与页面样式
- `images/`：当前主线前端使用的静态资源
- `js/components/`：可复用 UI 组件
- `js/data/`：静态演示数据与文案组织
- `js/lib/`：store、auth、locale、navigation、sync client
- `js/pages/`：页面控制器
- `tests/`：页面壳与 store 集成测试

## 主要页面入口

- `index.html`
- `discovery.html`
- `favorites.html`
- `login.html`
- `me.html`
- `profile.html`
- `profile-edit.html`
- `schedule.html`
- `schedule-event.html`
- `settings.html`
- `wardrobe.html`
- `wardrobe-item.html`
- `wardrobe-detail.html`

## 推荐启动方式

在仓库根目录运行：

```bash
zsh ./scripts/dev/start_lite_backend.sh
```

默认会：

- 同源服务 `apps/web-new`
- 暴露 `/api/*`
- 使用 `services/backend_lite/data/db.json` 作为本地联调数据文件

默认访问地址：

- `http://localhost:8140/index.html`

## 关键测试

在仓库根目录运行：

```bash
node apps/web-new/tests/home.shell.test.js
node apps/web-new/tests/me.shell.test.js
node apps/web-new/tests/schedule.shell.test.js
node apps/web-new/tests/api-connect.shell.test.js
```

## 当前数据边界

- 页面层尽量通过 `js/lib/*Store.js` 取数与写入
- `js/lib/liteBackendClient.js` 负责与轻量后端通信
- 当前策略是：
  - 本地缓存继续保留
  - 页面初始化时异步 hydrate
  - 写操作在 store 内做本地写穿与后端写回

## 相关目录

- 轻量联调后端：`services/backend_lite`
- Android 客户端：`apps/android`
