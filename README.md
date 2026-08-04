# Codex 项目模板

开箱即用的 AI 开发环境，提供标准化的项目结构、专业技能库、开发规范，方便用 Codex 进行项目定制开发。

## ✨ 特性

| 特性 | 说明 |
|------|------|
| 🛠 MCP 集成 | 预配置 6 个 MCP 服务器（docx、pdf、excel、fetch、web-browsing、ragflow） |
| 🎯 专业技能 | 13 个技能覆盖产品、后端、前端、UI设计、内容创作等领域 |
| 📋 规范先行 | 内置安全、代码质量、开发流程等硬约束，保证交付质量 |
| 📁 标准结构 | 约定式项目目录结构 + 文档骨架，开箱即用 |
| 🚀 快速上手 | 只需修改 `AGENTS.md` 中的占位符即可启动新项目 |

## 🚀 快速开始

### 1. 创建新项目

```bash
# 复制模板目录为你的新项目
cp -r codex-project-template your-project
cd your-project
```

Windows 下也可以直接复制文件夹。

> 建议在项目内初始化 Git 仓库（`git init`），状态追踪钩子依赖 Git 来判断文件改动。

### 2. 配置项目

编辑 `AGENTS.md`，替换所有 `{{ 占位符 }}` 内容：

- 项目名称、类型、描述
- 技术栈信息
- 项目特有约定

如需要 MCP 服务器，编辑 `.codex/config.toml`（ragflow 等服务的密钥请填入你自己的值，模板不携带真实密钥）。

### 3. 使用技能

技能随项目一起复制，存放在 `.codex/skills/`，在项目内运行 Codex 时自动可用（项目级技能）。若希望在其他项目中也使用这些技能，可运行：

```powershell
.\scripts\install-skills.ps1     # 安装到 ~/.codex/skills（用户级）
```

### 4. 开始使用

在项目目录中启动 Codex（CLI 或桌面版）即可，Codex 会自动读取 `AGENTS.md` 和 `.codex/` 配置。

## 📂 目录结构

```
your-project/
├── .codex/
│   ├── config.toml          # Codex 项目配置（MCP服务器等）
│   └── skills/              # 项目级技能库（Codex 自动发现）
│       ├── frontend/        # 前端开发技能
│       ├── backend-midway/  # Midway.js 后端技能
│       ├── skills-product-manager/  # 产品经理技能
│       └── ...              # 其他 10+ 专业技能
├── AGENTS.md                # 项目配置、规范、技能说明 ⭐ 核心文件
├── README.md                # 项目说明（给人看的）
├── docs/                    # 文档骨架（PRD/架构/API/数据库/部署/变更日志/状态）
├── scripts/                 # 工具脚本（技能安装等）
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

在 `.codex/config.toml` 中配置（也可用 `codex mcp add` 管理）：

| 服务 | 能力 |
|------|------|
| docx-mcp | Word 文档创建、填充、格式转换 |
| ragflow | RAG 知识库检索、语义搜索 |
| pdf-reader | PDF 内容提取、表格识别 |
| fetch | HTTP 网络请求、API 调用 |
| excel | Excel 表格读写、数据处理 |
| web-browsing-mcp | 网页内容提取、元数据解析 |

## 📋 项目状态追踪（自动强制）

项目状态统一记录在 `docs/PROJECT_STATUS.md`，由三层机制保证 Agent 不会漏更新：

1. **硬约束**：`AGENTS.md` 硬约束 #26 规定，每次完成功能、代码、文档或配置修改后必须同步更新状态文件，未更新视为任务未完成。
2. **收尾检查**：`AGENTS.md` 要求 Agent 结束任务前核对状态文件已更新。
3. **Stop 钩子**：`.codex/config.toml` 中的 `[hooks]` 在每轮对话结束后运行 `scripts/check-status.ps1`，检测到其他文件有改动而 `docs/PROJECT_STATUS.md` 未更新时输出告警。

使用说明：

- 钩子依赖 Git 仓库判断改动，`git init` 后生效；非 Git 目录下自动跳过。
- 首次运行 Codex 会询问是否信任该钩子，选择信任即可；自动化环境可用 `--dangerously-bypass-hook-trust`。
- 不需要强制时，注释掉 `.codex/config.toml` 中的 `[hooks]` 段即可。

## 📝 AGENTS.md 模板使用说明

`AGENTS.md` 是 Codex 的核心配置文件，Codex 会在项目内自动读取。文中定义了 **25+ 条硬约束**，涵盖：

- 🔒 安全约束（敏感信息、SQL注入、XSS防护等）
- 📦 代码质量（TypeScript严格模式、命名规范、错误处理等）
- 🎨 前端约束（组件粒度、状态管理、样式隔离等）
- 🖥️ 后端约束（分层架构、接口规范、数据库设计等）
- 📝 文档约束（接口文档、数据库文档、注释规范等）
- 🧪 测试约束（单元测试、集成测试覆盖要求）

这些约束会被 Codex 读取并在开发过程中自动遵守。

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

## 🔄 从 Claude Code 模板迁移说明

| Claude Code | Codex |
|-------------|-------|
| `CLAUDE.md` | `AGENTS.md` |
| `.claude/settings.json` | `.codex/config.toml` |
| `.claude/skills/` | `.codex/skills/`（项目级）或 `~/.codex/skills/`（用户级） |
| `.mcp.json` | `.codex/config.toml` 的 `[mcp_servers.*]` |

## 📦 兼容性

- ✅ Codex CLI
- ✅ Codex Desktop
- ✅ Codex Cloud / Remote
- ✅ Windows / macOS / Linux
