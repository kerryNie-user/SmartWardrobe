# services/backend

这是当前给 `apps/web` 使用的轻量联调后端。

## 定位

- 优先服务前端开发与联调
- 不依赖 MySQL
- 使用本地 SQLite 持久化
- 同源服务 `apps/web` 与 `/api/*`

## 启动

在仓库根目录运行：

```bash
zsh ./scripts/dev/start_backend.sh
```

默认地址：

- `http://127.0.0.1:8140/index.html`
- `http://127.0.0.1:8140/api/health`

## 默认数据

- 开发数据库：`services/backend/data/smartwardrobe.db`
- 静态种子：`services/backend/data/*_seed.json`
- 示例媒体：`services/backend/uploads/`

`BACKEND_DATA_FILE` 当前用于确定数据目录，运行时实际 SQLite 文件会落在同目录的 `smartwardrobe.db`。

## 环境变量

- `BACKEND_HOST`
- `BACKEND_PORT`
- `BACKEND_WEB_ROOT`
- `BACKEND_DATA_FILE`

## 已实现接口

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET/POST /api/profile`
- `GET/POST /api/settings`
- `GET/POST/PUT/DELETE /api/schedules`
- `GET/POST/DELETE /api/favorites`
- `GET/POST/PUT/DELETE /api/wardrobe`
- `GET /api/closettwin/status`
- `POST /api/closettwin/start`
- `POST /api/closettwin/stop`
- `POST /api/closettwin/model1/call`
- `POST /api/closettwin/model2/call`

## 目录职责

- `server.py`：进程入口、HTTPServer 组装、日志配置。
- `handler.py`：HTTP 适配器，只做请求分发、响应输出、错误映射。
- `http/`：API 路由、文件资产服务、响应契约。
- `http/routes.py`：暴露 `/api/closettwin/*` HTTP facade，转发请求到 `services/closettwin`，不持有模型实现。
- `storage.py`：`JsonDatabase` 兼容 facade，只组装数据库和 domain mixin。
- `storage_domains/`：按业务域拆分存储逻辑。
- `database.py`：Peewee 数据库绑定。
- `models.py`：Peewee 模型和 `ALL_MODELS` 注册表。
- `init_db.py`：创建表的维护脚本。
- `migrate_content_seed.py`：将 JSON seed 迁入 SQLite 的维护脚本。
- `tests/`：后端 API、启动契约、边界和数据契约测试。

## 用户识别方式

- `X-User-Id`
- `?userId=...`
- 请求体 `userId`
- 兜底 `guest`

## 适用场景

- 前端页面联调
- 本地状态与远端状态打通
- 先验证数据边界、hydrate、写回流程

## 不适用场景

- 正式生产环境
- 严格鉴权
- 复杂并发写冲突

## 相关目录

- 当前主线前端：`apps/web`

## ClosetTwin 模型边界

模型实现位于 `services/closettwin/`，不直接绑定页面或存储层。后端 HTTP facade 只使用：

- `start()`
- `stop()`
- `status()`
- `call_model1(function_name, payload)`
- `call_model2(function_name, payload)`
- `recommend_daily(payload)`

`POST /api/closettwin/recommendations/daily` 是推荐主入口。它把衣橱记录里来自 model1 的 `aiJson` 上下文作为 `model1` 字段传给 runtime，再由 runtime 并入 model2 `daily_recommendation` 输入；如后续需要同请求即时跑 model1，可通过 `model1Request` 接入同一 pipeline。

外部模型仓库通过环境变量配置：

- `CLOSETTWIN_MODEL1_PATH`
- `CLOSETTWIN_MODEL2_PATH`

未配置或模型资产缺失时，adapter 返回 `unavailable`，后端进程不应因此启动失败。

Web App 当前接入方式：

- 衣橱新增页上传照片后，`apps/web/js/lib/wardrobeItemScanner.js` 默认调用 `model1` 的 `daily_context`，并把返回结果写入衣橱记录的 `aiJson`。
- 首页推荐流通过 `apps/web/js/lib/closetTwinRecommendations.js` 调用双模型 daily recommendation pipeline；如果 pipeline/model2 不可用或无结果，继续使用现有本地推荐。
- 兼容旧扫描服务：如设置 `window.__CT_WARDROBE_SCAN_ENDPOINT__` 或 `localStorage.ct_wardrobe_scan_endpoint`，衣橱扫描仍会走旧 endpoint。
