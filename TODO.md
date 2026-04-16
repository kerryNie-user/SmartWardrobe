# TODO

## AI Blogger：强制补齐“结语”段落

### 目标
- 无论大模型输出如何波动，最终生成的文章必须显式包含 `section_name="结语"` 的段落，且内容具备“结语式收束”的写法（总结观点、升华立意、形成编辑部式落点）。
- 不改变现有 10 段结构硬约束：最终仍为 10 段，且段落类型仅来自 `"导语" / "深度解析" / "穿搭实操" / "穿搭误区" / "结语"`（见 [@agent_outline_planner.md](file:///Users/kerry-mac/SmartWardrobe/worktrees/ai_blogger/services/ai_blogger/agents/@agent_outline_planner.md#L5-L24)）。

### 实施步骤（TDD）
- [x] 新增测试：当 Phase2/Phase3 的输出缺少“结语”时，后处理会强制补齐（推荐策略：将最后一段强制改名为“结语”，并在必要时进行最小文本修正提示）。
  - 新测试文件建议：`services/ai_blogger/tests/test_conclusion_enforcement.py`
  - 覆盖两类情况：
    - [x] Phase2 大纲 10 段但 `section_name` 没有 “结语”
    - [x] Phase3 草稿 10 段但 `section_name` 没有 “结语”
- [x] 代码改动点（推荐优先级）：
  - [x] 在 [chain_runner.py](file:///Users/kerry-mac/SmartWardrobe/worktrees/ai_blogger/services/ai_blogger/chain_runner.py) 中对 Phase2 输出做一次结构修复：确保第 10 段 `section_name="结语"`，若缺失则强制替换。
  - [x] 在 [chain_runner.py](file:///Users/kerry-mac/SmartWardrobe/worktrees/ai_blogger/services/ai_blogger/chain_runner.py) 的 Phase3 组装阶段再做一次兜底：若最终 paragraphs 无“结语”，则将最后一段 `section_name` 强制设为“结语”。
  - [x] 如需“结语式收束”更强，可考虑在 Phase3 输入里对最后段追加一条硬性要求（不改 schema，只增强 prompt 输入文本）。

### 验证（每次改完都要跑）
- 本地运行真实链路：`python -m services.ai_blogger.run_pipeline --count 1 --llm real`
- 检查生成物：
  - HTML 中必须出现 `<strong>结语</strong>`（在 [chain_blogs_*.html](file:///Users/kerry-mac/SmartWardrobe/worktrees/ai_blogger/services/ai_blogger/output/) 中 grep/搜索）
  - `report_*.json` 的 `paragraph_count` 仍为 10

