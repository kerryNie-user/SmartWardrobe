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

## 目录职责

- `server.py`：进程入口、HTTPServer 组装、日志配置。
- `handler.py`：HTTP 适配器，只做请求分发、响应输出、错误映射。
- `http/`：API 路由、文件资产服务、响应契约。
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
