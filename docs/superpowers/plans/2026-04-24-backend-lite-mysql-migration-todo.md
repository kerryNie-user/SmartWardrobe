# 任务执行检查单 (TodoWrite Checklist)

- [x] 步骤 1: 依赖管理与数据库连接池设定
  - [x] 在 `services/backend_lite/requirements.txt` 中添加 `peewee` 和 `pymysql`。
  - [x] 创建 `services/backend_lite/database.py` (配置 MySQL 连接和 `BaseModel`)。

- [x] 步骤 2: 数据表实体建模 (Models)
  - [x] 创建 `services/backend_lite/models.py`。
  - [x] 编写 User, UserPreference, WardrobeItem, Schedule, Favorite, SocialEngagement, Comment 等模型。

- [x] 步骤 3: 编写建表脚本 (init_db)
  - [x] 创建 `services/backend_lite/init_db.py`。
  - [x] 验证建表脚本可成功执行。

- [x] 步骤 4: 重构 storage.py
  - [x] 修改 `services/backend_lite/storage.py`，替换 JSON 读写逻辑为 Peewee ORM 操作。
  - [x] 确保与原有 JSON 字典格式完全一致。

- [x] 步骤 5: 验证 API 兼容性
  - [x] 运行测试用例 `pytest services/backend_lite/tests/`。
  - [x] 确认所有 API 功能正常。
