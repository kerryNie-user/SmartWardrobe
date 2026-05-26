# services/closettwin

ClosetTwin 双模型服务边界。

## 公开接口

调用方只使用：

- `create_closettwin_runtime()`
- `runtime.start()`
- `runtime.stop()`
- `runtime.status()`
- `runtime.call_model1(function_name, payload)`
- `runtime.call_model2(function_name, payload)`
- `runtime.recommend_daily(payload)`

`recommend_daily(payload)` 是双模型串联入口：它接收已持久化的 `model1` 衣物识别/场景上下文，或可选的 `model1Request` 即时调用请求，然后把 model1 上下文并入 `model2` 的 `daily_recommendation` 输入。

## 配置

- `CLOSETTWIN_MODEL1_PATH`
- `CLOSETTWIN_MODEL2_PATH`

未配置路径或缺少模型资产时，runtime 返回 `unavailable`，不应阻塞后端进程启动。

## 职责边界

- `model1.py`：适配 `li-jinhang/26-101ClosetTwin`。
- `model2.py`：适配 `William-Zhou-7/ClosetTwin_model2_table`。
- `runtime.py`：提供最小生命周期、单模型调用与双模型推荐 pipeline facade。
- `contract.py`：定义状态、返回值和 adapter protocol。

Web App 不直接导入本目录；它通过 `services/backend` 暴露的 `/api/closettwin/*` 调用。
