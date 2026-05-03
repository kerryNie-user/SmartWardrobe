# services/backend

这是当前给 `apps/web` 使用的轻量联调后端。

## 定位

- 优先服务前端开发与联调
- 不依赖 MySQL
- 使用本地 JSON 文件持久化
- 同源服务 `apps/web` 与 `/api/*`

## 启动

在仓库根目录运行：

```bash
zsh ./scripts/dev/start_backend.sh
```

默认地址：

- `http://127.0.0.1:8140/index.html`
- `http://127.0.0.1:8140/api/health`

## 默认数据文件

- `services/backend/data/db.json`

这个文件可以直接删除后重建，适合前端联调、重置账号数据、验证 hydrate/writeback。

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
- 完整 service/repository 架构验证

## 相关目录

- 当前主线前端：`apps/web`
