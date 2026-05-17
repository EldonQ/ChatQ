# EcoQ — AI-Powered Species Distribution Data Assistant

EcoQ 是一个基于 AI Agent 的物种分布数据助手，支持多源数据获取、自动清洗与地图可视化。用户通过自然语言对话即可完成从物种检索到分布地图生成的完整工作流。

## 核心流程

```
用户输入物种名 / 上传文件 / 粘贴图片
  → AI Agent 理解意图并调用工具
    → searchSpecies (GBIF 分类学匹配)
    → fetchAndClean (GBIF + iNaturalist 全量获取 → 服务端缓存 → 标准清洗)
    → generateMap   (Python Cartopy Robinson 投影 + folium 交互式)
  → 工具卡片实时流式展示，地图在对话框中内联显示
  → 原始数据全部走服务端缓存，LLM 仅接收摘要元数据，无数据截断
```

## 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router + Turbopack) |
| **AI Agent** | Vercel AI SDK v6 (`streamText` + `tool` + `useChat`) |
| **模型** | Anthropic 协议兼容 (DeepSeek V4 Pro，可替换) |
| **UI** | React 19 + shadcn/ui v4 (@base-ui/react) + Tailwind CSS v4 |
| **状态** | Zustand (会话管理) |
| **可视化** | Python Cartopy (Robinson 投影静态 PNG) + folium (交互式 HTML) |
| **数据源** | GBIF API + iNaturalist API (可扩展 OBIS / eBird) |

## 项目结构

```
E:\ChatQ\
├── research/                          # 研究方案文档
│   ├── framework-review.md            # 框架选型评估
│   ├── implementation-plan.md         # 多源融合清洗方案
│   ├── data-cleaning-pipeline.md      # 数据清洗方法论
│   └── multi-source-pipeline.md       # 多源数据融合方案
├── src/                               # Next.js 应用
│   ├── src/app/
│   │   ├── page.tsx                   # 主页面
│   │   ├── layout.tsx                 # 布局 + 侧边栏 + 主题
│   │   ├── globals.css                # 自然主题样式 (OKLCH)
│   │   └── api/
│   │       ├── chat/route.ts          # AI Agent API (streamText + tools)
│   │       └── map/route.ts           # 地图生成 API (Python 子进程)
│   ├── src/components/chat/
│   │   ├── ChatArea.tsx               # useChat 客户端
│   │   ├── ChatInput.tsx              # 输入框 + 文件上传 + 图片粘贴
│   │   ├── MessageList.tsx            # 消息气泡 + 工具卡片渲染
│   │   ├── ProgressSteps.tsx          # 步骤进度组件
│   │   ├── DataPreview.tsx            # 数据表格预览
│   │   └── Sidebar.tsx                # 会话侧边栏
│   ├── src/components/ui/             # shadcn/ui 组件
│   ├── src/lib/
│   │   ├── gbif.ts                    # GBIF API 客户端
│   │   ├── inaturalist.ts             # iNaturalist API 客户端
│   │   ├── cleaner.ts                 # 数据清洗引擎
│   │   ├── store.ts                   # Zustand 状态管理
│   │   └── types.ts                   # TypeScript 类型定义
│   ├── scripts/map_viz.py             # Python 地图生成脚本
│   └── public/maps/                   # 生成的地图文件
└── skills/                            # Claude Code Skills
```

## 快速开始

### 前置条件

- Node.js 18+
- Python 3.10+ (地图可视化)
- Anthropic 兼容 API Key (已配置在环境变量中)

### 安装与运行

```bash
# 1. 进入项目
cd E:\ChatQ\src

# 2. 安装前端依赖
npm install

# 3. 安装 Python 依赖 (conda 环境 new)
conda install -c conda-forge cartopy -n new -y
pip install folium geopandas matplotlib pandas

# 4. 配置环境变量 (已配置 .env.local)
# ANTHROPIC_AUTH_TOKEN 从系统环境变量读取
# ANTHROPIC_BASE_URL 指向兼容 API 地址

# 5. 启动开发服务器
npm run dev
# → http://localhost:3000
```

### 使用方式

**自然语言对话** — AI Agent 自动调用工具链：
- `Show me the distribution of snow leopards`
- `获取大熊猫的分布数据并制作地图`
- `Panthera tigris`

**文件上传** — 点击输入框左侧 `+` 按钮：
- 上传图片 (JPEG/PNG/GIF) — 内联预览
- 上传数据文件 (CSV/GeoJSON/TXT) — 自动解析清洗

**图片粘贴** — 直接在对话框 `Ctrl+V` 粘贴剪贴板中的图片

**技能选择** — 点击 ✨ 按钮查看可用工具：
- 🔍 Search Species — GBIF 分类学匹配
- 📊 Fetch & Clean Data — 多源数据获取与清洗
- 🗺️ Generate Map — 分布地图生成

**会话管理** — 左侧栏：
- 新建/切换/删除对话
- 每个对话可保存为 JSON 文件（`⋯` → Save）

## AI Agent 工具链

| 工具 | 描述 | 关键特性 |
|------|------|----------|
| `searchSpecies` | GBIF 分类学名称匹配，返回完整分类层级 | GBIF Taxonomy |
| `fetchAndClean` | 并行获取 GBIF + iNaturalist 全量点位 → 合并去重 → 坐标校验 → 质量标记 | 服务端缓存，LLM 不接触原始数据，无截断 |
| `generateMap` | 生成分布地图 PNG (Cartopy) + 交互式 HTML (folium) | Robinson 投影，出版级质量 |

## 数据清洗能力

- **全量分页加载**: GBIF 分页 API（300条/页，最多2000条），iNaturalist 200条/次
- **无主观截取**: 所有获取的记录全部进入清洗流程，不做任何筛选
- **服务端缓存**: 原始数据存于服务端 `Map`，LLM 仅接收摘要元数据（计数、来源分布、质量标记）
- **坐标验证**: 边界检查、零坐标标记、精度评估
- **分类学清洗**: GBIF Backbone 名称匹配、同物异名合并
- **去重**: 跨源精确匹配 (物种 + 坐标 4 位小数精度)
- **质量标记**: GBIF issues 识别、化石/活体标本标记

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ANTHROPIC_AUTH_TOKEN` | API 认证令牌 | 从系统环境读取 |
| `ANTHROPIC_BASE_URL` | API 地址 | `https://api.deepseek.com/anthropic` |
| `ANTHROPIC_MODEL` | 模型名称 | `deepseek-v4-pro` |

## 命令

```bash
npm run dev      # 开发服务器 (http://localhost:3000)
npm run build    # 生产构建
npm run lint     # ESLint
```

## License

MIT
