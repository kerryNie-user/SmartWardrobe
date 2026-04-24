# 替换 backend_lite JSON 存储为 MySQL ORM 实施计划

## 1. 目标与范围 (Goal & Scope)
本计划旨在将 `services/backend_lite/storage.py` 中的基于内存和 JSON 文件的存储层替换为 MySQL，并使用 Peewee ORM 进行数据建模。
- **范围限制**：只改写存储层，保持现有 API 契约和路由层 (`main.py` 等) 完全一致。
- **验证标准**：运行 `pytest` (如果 `services/backend_lite` 存在测试) 并通过本地手动发起请求验证 API 不被破坏。

## 2. 前置准备 (Prerequisites)
- 确认系统已安装 MySQL 数据库且可用。
- 在 Python 环境中安装 `peewee` 和 `pymysql` (或 `mysqlclient`)。

## 3. 文件变更映射 (File Mapping)

| 文件路径 | 变更动作 | 职责描述 |
| :--- | :--- | :--- |
| `services/backend_lite/requirements.txt` | **修改** | 增加 `peewee` 和 `pymysql` 依赖。 |
| `services/backend_lite/database.py` | **新建** | 定义 Peewee MySQL 数据库连接池和 `BaseModel`。 |
| `services/backend_lite/models.py` | **新建** | 根据台账设计定义所有实体表 (User, WardrobeItem, Schedule 等)。 |
| `services/backend_lite/storage.py` | **修改** | 重写 `Storage` 类，移除 JSON 逻辑，改为调用 `models.py` 进行增删改查。 |
| `services/backend_lite/init_db.py` | **新建** | 提供一个可执行脚本，用于建库建表及插入必要种子数据。 |

## 4. 任务拆解与 TDD 步骤 (Tasks & Execution Steps)

### 步骤 1: 依赖管理与数据库连接池设定
1. 在 `services/backend_lite/requirements.txt` 中添加 `peewee` 和 `pymysql`。
2. 运行 `pip install -r services/backend_lite/requirements.txt`。
3. 创建 `services/backend_lite/database.py`。
   - 编写 `MySQLDatabase` 连接实例化代码（读取环境变量如 `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DB`）。
   - 定义 `BaseModel` 继承自 `peewee.Model` 并绑定 db。

### 步骤 2: 数据表实体建模 (Models)
1. 创建 `services/backend_lite/models.py`。
2. 导入 `BaseModel`。
3. 根据 [2026-04-24-data-domain-matrix-and-mysql-schema.md](../specs/2026-04-24-data-domain-matrix-and-mysql-schema.md) 编写模型类：
   - `User` 和 `UserPreference`
   - `WardrobeItem` 和 `WardrobeTag`
   - `Schedule` 和 `ScheduleOutfit`
   - `Post`, `Comment`, `SocialEngagement`
   - `Favorite`

### 步骤 3: 编写建表脚本 (init_db)
1. 创建 `services/backend_lite/init_db.py`。
2. 导入所有模型类。
3. 编写 `db.create_tables([...])` 逻辑。
4. 运行 `python services/backend_lite/init_db.py` 验证表能在本地 MySQL 中成功创建。
5. （Git Commit: 基础 ORM 与数据表建模完成）

### 步骤 4: 重构 storage.py (核心数据层替换)
1. 打开 `services/backend_lite/storage.py`。
2. 将原有的 JSON 加载和保存逻辑注释或删除。
3. 导入 `models.py` 中的实体。
4. 逐个重写现有方法（如 `get_items()`, `create_item()`, `get_schedule()` 等）：
   - 将原有的字典操作替换为 Peewee 的 `Model.select()`, `Model.create()`, `Model.update()` 等。
   - 确保返回的数据格式与原 JSON 格式完全一致（比如组装为 dict）。

### 步骤 5: 验证 API 兼容性
1. 启动 `backend_lite` 服务 (`uvicorn main:app --reload` 或对应启动命令)。
2. 使用 `curl` 或 Postman 调用现有的核心 API（例如获取衣物列表、创建日程等）。
3. 检查响应 JSON 的字段是否与重构前保持一致。
4. （Git Commit: 替换存储层为 MySQL 并通过兼容性验证）

---
## 5. 跨端契约与同步假定 (Sync Assumptions & Contracts)
- **API 不变**：本次计划不修改任何路由契约（如 `GET /api/wardrobe` 等），因此 `apps/web-new` 前端的 `syncFeedback` 和 `pageStoreBinding` 不需要做任何修改。
- **真相来源**：`backend_lite` 正式从文件级真相升级为 DB 级真相，支持更稳健的事务和冲突处理（尤其是 Schedule 的 `version` 字段在 MySQL 中可以使用乐观锁更新）。