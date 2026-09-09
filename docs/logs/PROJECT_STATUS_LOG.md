# 项目状态追踪 · 变更日志（明细归档）

> 本文件是状态快照 `docs/PROJECT_STATUS.md` 的**明细日志**（硬约束 #26 配套文件）。
>
> **维护规则**：
> - 每次完成功能、代码、文档或配置修改后，在「变更记录」表**表头下方第一行插入新条目**（最新条目在最上方，Keep a Changelog 惯例），条目含日期、变更人、核心内容与涉及文件。
> - 快照 `PROJECT_STATUS.md` 只反映**当前**状态，就地更新、不追加历史；本文件承载全部历史明细。
> - 分卷：本文件持续增长时，旧年份整段移出到 `PROJECT_STATUS_LOG-<年>.md`（如 `PROJECT_STATUS_LOG-2026.md`），当年新条目留在本文件最上方。
> - 完整历史同时可经 git 追溯。

## 变更记录（最新条目在最上方，历史可经 git 追溯）

| 日期 | 变更人 | 变更内容 | 涉及文件/模块 | 版本 |
| ---- | ------ | -------- | ------------- | ---- |
| {{ YYYY-MM-DD }} | {{ DSH / 姓名 }} | {{ 本次改动的核心内容 }} | {{ 文件或模块 }} | {{ v0.1.0 }} |
| {{ YYYY-MM-DD }} | DSH 迁移 | 模板从 Codex 迁移到 DeepSeek Harness：技能移至 .dsh/skills、MCP 改为 cordis.patch.yml、AGENTS.md/README/脚本同步更新；状态文档改为「快照 + 明细日志」双文件（见 AGENTS.md 硬约束 #26 与 docs/logs/ 说明） | .dsh/skills、cordis.patch.yml、AGENTS.md、README.md、scripts/、docs/PROJECT_STATUS.md、docs/logs/ | {{ v1.0.0 }} |
