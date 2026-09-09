# DSH 项目模板

开箱即用的 AI 开发环境，提供标准化的项目结构、专业技能库、开发规范，方便用 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 进行项目定制开发。

## ✨ 特性

| 特性 | 说明 |
|------|------|
| 🛠 MCP 集成 | 预配置 6 个 MCP 服务器（docx、ragflow、pdf-reader、fetch、excel、web-browsing），通过 `cordis.patch.yml` 挂载 |
| 🎯 专业技能 | 13 个技能覆盖产品、后端、前端、UI设计、内容创作等领域，存放于 `.dsh/skills/` 自动发现 |
| 📋 规范先行 | 内置安全、代码质量、开发流程等硬约束，保证交付质量 |
| 📁 标准结构 | 约定式项目目录结构 + 文档骨架，开箱即用 |
| 🚀 快速上手 | 只需修改 `AGENTS.md` 中的占位符即可启动新项目 |

## 🚀 快速开始

### 1. 创建新项目

```bash
# 复制模板目录为你的新项目
cp -r dsh-project-template your-project
cd your-project
```

Windows 下也可以直接复制文件夹。

> 建议在项目内初始化 Git 仓库（`git init`），`scripts/check-status.ps1` 依赖 Git 来判断文件改动。

### 2. 配置项目

编辑 `AGENTS.md`，替换所有 `{{ 占位符 }}` 内容：

- 项目名称、类型、描述
- 技术栈信息
- 项目特有约定

### 3. 配置 MCP 服务器

编辑项目根目录的 `cordis.patch.yml`（ragflow 等服务的密钥请通过环境变量注入，模板不携带真实密钥），然后启动 DSH Web 时挂载：

```powershell
dsh web --patch ./cordis.patch.yml
```

> 只想在个别项目里启用部分服务时，注释掉 `cordis.patch.yml` 中不需要的条目即可。

### 4. 使用技能

技能随项目一起复制，存放在 `.dsh/skills/`，在项目目录中启动 DSH 时自动可用（项目级技能，优先级最高）。若希望在其他项目中也使用这些技能，可运行：

```powershell
.\scripts\install-skills.ps1     # 安装到 ~/.dsh/skills（用户级）
```

### 5. 开始使用

在项目目录中启动 DSH（Web 或 CLI），DSH 会自动读取 `AGENTS.md` 和 `.dsh/skills/` 配置。

## 📂 目录结构

```
your-project/
├── AGENTS.md                # 项目配置、规范、技能说明 ⭐ 核心文件
├── README.md                # 项目说明（给人看的）
├── cordis.patch.yml         # MCP 服务器配置（dsh web --patch 挂载）
├── .dsh/
│   └── skills/              # 项目级技能库（DSH 自动发现）
│       ├── frontend/        # 前端开发技能
│       ├── backend-midway/  # Midway.js 后端技能
│       ├── skills-product-manager/  # 产品经理技能
│       └── ...              # 其他 10+ 专业技能
├── docs/                    # 文档骨架（PRD/架构/API/数据库/部署/变更日志/状态）
├── scripts/                 # 工具脚本（技能安装、状态检查等）
└── .gitignore               # Git 忽略配置
```

## 🎯 可用技能

技能按描述自动触发，也可在对话中直接点名使用：

| 领域 | 技能 | 核心能力 |
|------|------|----------|
| 📊 产品 | skills-product-manager | 需求分析、PRD创作、产品规划、竞品分析 |
| 💻 后端 | backend-midway | Midway.js + TypeScript + SQLite3 后端开发 |
| 💻 后端 | python-pro | Python 后端、数据分析、脚本开发 |
| 💻 后端 | postgresql-designer | 数据库设计、优化、迁移 |
| 🎨 前端 | frontend | Vue 3 + TypeScript + Ant Design Vue 前端开发 |
| 🎨 前端 | uniapp-architect | UniApp 跨平台应用开发 |
| 🎨 前端 | electron | Electron 桌面应用开发 |
| ✨ 设计 | ui-ux-pro-max | 用户体验设计、交互优化、视觉规范 |
| ✨ 设计 | pencil-design | Pencil 原型设计工具集成 |
| 📝 内容 | skills-ppt-designer | 演示文稿、汇报材料设计 |
| 📝 内容 | skills-wechat-article-writer | 公众号文章、技术博客写作 |
| 🔬 领域 | space | 航天、卫星遥感、遥感影像处理 |

> 注：`backend` 技能也在技能库中，按需使用。

## ⚙️ MCP 服务器

在项目根目录 `cordis.patch.yml` 中配置（每个服务器对应 `@deepseek-ai/dsh-mcp-client` 插件的一行，可用 `dsh web --dump-config` 检查生效配置）：

| 服务（serverName） | 能力 | 模型侧工具名 |
|------|------|------|
| docx | Word 文档创建、填充、格式转换 | `mcp__docx__*` |
| ragflow | RAG 知识库检索、语义搜索 | `mcp__ragflow__*` |
| pdf-reader | PDF 内容提取、表格识别 | `mcp__pdf-reader__*` |
| fetch | HTTP 网络请求、API 调用 | `mcp__fetch__*` |
| excel | Excel 表格读写、数据处理 | `mcp__excel__*` |
| web-browsing | 网页内容提取、元数据解析 | `mcp__web-browsing__*` |

> 服务器命令是可信可执行代码，仅在需要时启用；密钥一律通过 `!!js process.env.XXX` 注入环境变量。

### 所需环境变量

| 变量 | 服务 | 说明 |
|------|------|------|
| `RAGFLOW_API_KEY` | ragflow | RAG 知识库 API 密钥（必填，否则 ragflow 无法启动） |
| `RAGFLOW_URL` | ragflow | RAG 服务地址，如 `http://192.168.10.13:9380/api/v1`（缺省时需在 patch 中填入） |

## 📋 项目状态追踪

项目状态分两文件记录，由两层机制保证 Agent 不会漏更新：

- **`docs/PROJECT_STATUS.md`（快照/索引）**：当前概况、能力基线、最近变更、待开发项、阻塞问题——只反映当前状态，就地更新不追加
- **`docs/logs/PROJECT_STATUS_LOG.md`（明细日志）**：每次修改在表头下方第一行插入新条目（最新在上，按年分卷）

1. **硬约束**：`AGENTS.md` 硬约束 #26 规定，每次完成功能、代码、文档或配置修改后必须同步更新状态文件（快照或日志至少其一），未更新视为任务未完成。
2. **收尾检查**：`AGENTS.md` 要求 Agent 结束任务前核对状态文件已更新。

**读取协议**：开工前只读快照（小文件）；查历史（功能迭代/涉及文件/为什么）才读日志顶部新增条目，勿两文件通读。

DSH 没有 Codex 那样的 Stop 钩子机制，需要强制时可手动运行或在 CI 中调用：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-status.ps1
```

- 脚本依赖 Git 仓库判断改动，`git init` 后生效；非 Git 目录下自动跳过。
- 检测到其他文件有改动而快照与日志均未更新时输出告警并以非零码退出。

## 📝 AGENTS.md 模板使用说明

`AGENTS.md` 是 DSH 的核心配置文件，DSH 会在项目内自动读取。文中定义了 **25+ 条硬约束**，涵盖：

- 🔒 安全约束（敏感信息、SQL注入、XSS防护等）
- 📦 代码质量（TypeScript严格模式、命名规范、错误处理等）
- 🎨 前端约束（组件粒度、状态管理、样式隔离等）
- 🖥️ 后端约束（分层架构、接口规范、数据库设计等）
- 📝 文档约束（接口文档、数据库文档、注释规范等）
- 🧪 测试约束（单元测试、集成测试覆盖要求）

这些约束会被 DSH 读取并在开发过程中自动遵守。

### 占位符清单

所有 `{{ }}` 包裹的内容都需要替换：

| 占位符 | 说明 | 示例 |
|--------|------|------|
| `{{ 项目名称 }}` | 项目的正式名称 | 用户管理系统 |
| `{{ 项目类型 }}` | Web应用/移动端/桌面应用等 | Web应用 |
| `{{ 前端技术栈 }}` | 前端技术组合 | Vue 3 + TypeScript + AntDV |
| `{{ 后端技术栈 }}` | 后端技术组合 | Midway.js + TypeScript |
| `{{ 数据库 }}` | 数据库类型 | PostgreSQL 15 |
| `{{ 其他技术 }}` | 其他关键技术 | Docker + Redis + MinIO |
| `{{ 简要描述项目 }}` | 一句话项目描述 | 企业级用户权限管理系统 |
| `{{ 目标用户群体 }}` | 系统使用者 | 企业IT管理员、运营人员 |
| `{{ v1.0.0 }}` | 版本号 | v1.0.0 |
| `{{ 项目根目录 }}` | Git 仓库目录名 | user-management |
| `{{ 在此添加特有约定 }}` | 项目特殊规则 | 优先兼容 Chrome 浏览器 |

## 🔄 从 Codex / Claude Code 模板迁移说明

| Codex / Claude Code | DSH |
|-------------|------|
| `CLAUDE.md` / `AGENTS.md` | `AGENTS.md`（DSH 自动读取） |
| `.codex/config.toml` / `.mcp.json` | `cordis.patch.yml`（`dsh web --patch` 挂载） |
| `.codex/skills/` / `.claude/skills/` | `.dsh/skills/`（项目级）或 `~/.dsh/skills/`（用户级） |

## 📦 兼容性

- ✅ DSH Web（`dsh web`）
- ✅ DSH CLI（`dsh --profile headless`）
- ✅ Windows / macOS / Linux
