# services/backend_legacy

这是仓库里保留的历史 Python + MySQL 后端。

## 定位

- 作为旧后端实现继续保留
- 支撑历史接口、旧联调方式和迁移参考
- 不作为当前 `apps/web-new` 的首选联调入口

## 何时使用

- 需要验证旧 MySQL 数据结构时
- 需要对照历史后端行为时
- 需要继续维护旧接口或旧静态服务入口时

## 推荐启动方式

在仓库根目录运行：

```bash
zsh ./scripts/dev/start_new_server.sh
```

如果只是沿用旧脚本环境，也可以运行：

```bash
zsh ./scripts/dev/start_server.sh
```

## 当前默认行为

- 默认静态根：`apps/web-legacy`
- 可通过 `WEBAPP_DIR` 环境变量改为其他前端目录
- 默认端口：`8080`

## 依赖

- Python 标准库 HTTP 服务
- MySQL
- `services/backend_legacy/mysql_utils.py` 中的建表与初始化逻辑

## 主要模块

- `config.py`：端口、静态根、请求大小
- `server.py`：启动入口
- `handler.py`：HTTP 路由与 API 处理
- `mysql_utils.py`：数据库连通、建表、初始化
- `auth.py`：认证辅助
- `validation.py`：输入校验

## 适用场景

- 历史 Web 行为验证
- 旧接口回归
- 与 `services/backend_lite` 做行为对照

## 相关目录

- 历史 Web：`apps/web-legacy`
- 当前主线前端：`apps/web-new`
- 当前联调后端：`services/backend_lite`
