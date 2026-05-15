# oh-story-claudecode

基于 Claude Code 的中文网文创作工具箱，覆盖从市场调研、爆款拆解、大纲写作到封面制作、去 AI 味的全流程。

> 技能来源：[worldwonderer/oh-story-claudecode](https://github.com/worldwonderer/oh-story-claudecode)

---

## 快速开始

### 前置要求

- 安装 [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 并登录
- Node.js v22+（扫榜脚本需要）
- （可选）`GPT_IMAGE_API_KEY` 环境变量（用于 `/story-cover` 封面生成）

### 安装技能

在项目根目录下，通过 Claude Code 安装技能：

```
claude skills add --from github worldwonderer/oh-story-claudecode
```

安装完成后，`.claude/skills/` 目录下会生成对应的技能文件。

---

## 技能总览

项目按**长篇**和**短篇**两条主线组织，辅以共享工具：

```
              市场调研(扫榜)       爆款分析(拆文)        写作(创作)          润色(去AI味)
长篇路线:  story-long-scan  → story-long-analyze → story-long-write → story-deslop
短篇路线:  story-short-scan → story-short-analyze→ story-short-write→ story-deslop

共享工具:  browser-cdp（浏览器自动化）   story-cover / story-cover-gemini（封面生成）
```

### 技能触发方式

每个技能支持三种触发方式：**斜杠命令**、**中文命令**、**自然语言**。下表列出所有可用触发词：

| 技能 | 斜杠命令 | 中文命令 | 自然语言示例 |
|------|---------|---------|------------|
| 长篇扫榜 | `/story-long-scan` | `/长篇扫榜` | "长篇什么火"、"起点排行" |
| 长篇拆文 | `/story-long-analyze` | `/长篇拆文` | "帮我拆这本书"、"分析黄金三章" |
| 长篇写作 | `/story-long-write` | `/写长篇` | "帮我开书"、"写大纲" |
| 短篇扫榜 | `/story-short-scan` | `/短篇扫榜` | "短篇什么火"、"知乎故事排行" |
| 短篇拆文 | `/story-short-analyze` | `/短篇拆文` | "帮我拆这个短篇" |
| 短篇写作 | `/story-short-write` | `/写短篇` | "帮我写一篇短篇" |
| 封面生成 | `/story-cover` | `/封面` | "帮我做个封面" |
| Gemini 封面 | `/story-cover-gemini` | `/封面gemini` | "用Gemini做封面" |
| 去 AI 味 | `/story-deslop` | `/去AI味` | "这篇太AI了"、"去味" |
| 浏览器控制 | `/browser-cdp` | — | "操作浏览器"、"Chrome CDP" |

---

## 完整使用流程

### 路线一：长篇小说（起点/番茄/七猫等）

#### Step 1：市场调研 — 扫榜

```
/story-long-scan
```

**作用**：抓取起点、番茄、七猫、晋江、刺猬猫等平台的排行榜数据，分析当前热门题材、风口趋势。

**流程**：
1. 选择目标平台（起点/番茄/七猫/晋江/刺猬猫）
2. Claude 调用浏览器自动化脚本，抓取排行数据
3. 输出结构化分析报告到 `scan-data/` 目录

**输出示例**：`scan-data/20260503_1430_番茄/番茄男频阅读榜_全题材.md`

**前提**：需要先通过 `/browser-cdp` 启动浏览器并登录目标平台（部分平台需要登录态）。

#### Step 2：爆款分析 — 拆文

```
/story-long-analyze
```

**作用**：深度拆解爆款小说的黄金三章、人设架构、爽点设计、节奏控制。

**两种模式**：
- **快速拆解**（默认）：分析黄金三章和整体结构
- **深度拆解**：逐章拆解整本小说，输出结构化文件

**流程**：
1. 提供目标小说（文本文件路径或粘贴内容）
2. 快速模式：分析前三章 + 整体结构
3. 深度模式：逐章拆解，输出完整分析
4. 结果保存到 `analyze-data/{书名}/` 目录

**输出结构**：
```
analyze-data/某本小说/
├── 摘要.md          # 整体概览
├── 黄金三章/
│   ├── 第1章_深度分析.md
│   ├── 第2章_深度分析.md
│   └── 第3章_深度分析.md
├── 人物关系.md
├── 世界观.md
├── 情节线.md
└── 拆文报告.md       # 最终分析报告
```

#### Step 3：正式写作 — 开书

```
/story-long-write
```

**作用**：从零开始辅助长篇网文创作，管理世界观、人物、大纲和正文。

**完整流程**：

| 阶段 | 内容 | 说明 |
|------|------|------|
| Phase 1 | 确认题材方向 | 结合扫榜数据，选定赛道 |
| Phase 2 | 核心设定 | 角色设定、世界观、核心冲突 |
| Phase 3 | 大纲构建 | 卷级大纲 + 前30章细纲 |
| Phase 4 | 正文写作 | 逐章创作，自动加载上下文 |
| Phase 4.5 | 阶段复盘 | 每30章复盘一次 |
| Phase 4.6 | 大纲续写 | 继续规划后续章节 |
| Phase 5 | 质检 | 检查情节漏洞、人设一致性 |

**输出结构**：
```
novels/{书名}/
├── 封面.jpg
├── 笔记.md
├── 设定/
│   ├── 书名与简介.md
│   ├── 题材定位.md
│   ├── 角色/          # 每个角色一个文件
│   ├── 势力/          # 势力/组织设定
│   └── 世界观/        # 世界观设定
├── 大纲/
│   ├── 大纲.md        # 卷级大纲
│   ├── 卷纲_第一卷.md
│   └── 细纲_第001章.md ~ 细纲_第030章.md
├── 正文/
│   ├── 第001章_xxx.md
│   └── ...
├── 对标/              # 参考作品拆文
└── 追踪/
    ├── 伏笔.md        # 伏笔追踪
    └── 时间线.md      # 故事时间线
```

#### Step 4：润色 — 去 AI 味

```
/story-deslop
```

**作用**：检测并清除文本中的 AI 写作痕迹，让文字回归自然。

**四阶段处理**：
1. **AI 味扫描**：标记 AI 写作痕迹
2. **诊断报告**：分类列出问题
3. **六道关卡清理**：
   - 禁用词清除
   - 套路化表达消除
   - 内心独白外化修正
   - 节奏打破
   - 对话去俗套
   - 结尾去宏大
4. **输出**：处理后的自然文本

#### Step 5：封面生成

**方式一：API 自动生成**（需要 `GPT_IMAGE_API_KEY`）
```
/story-cover
```

**方式二：Gemini 手动生成**（无需 API Key）
```
/story-cover-gemini
```
生成提示词，复制到 Gemini 网页版手动生成。

---

### 路线二：短篇小说（知乎盐言/七猫/黑岩等）

#### Step 1：市场调研

```
/story-short-scan
```

抓取知乎盐言、七猫、黑岩、点众等短篇平台数据，分析热门题材和风口。

#### Step 2：爆款拆文

```
/story-short-analyze
```

拆解短篇的叙事结构、情绪曲线、反转技巧、钩子设计。五阶段分析：结构 → 情绪 → 反转 → 开头结尾 → 报告。

#### Step 3：短篇写作

```
/story-short-write
```

**核心原则**：情绪先行、一篇一反转、每句话都有用、前三句定生死。

**流程**：
1. 确定情绪目标（虐/甜/爽/惧）
2. 核心框架（反转、情绪曲线、人物）
3. 逐场景写作
4. 打磨输出

#### Step 4：去 AI 味

```
/story-deslop
```

同长篇路线。

---

## 辅助工具

### 浏览器自动化（browser-cdp）

扫榜功能依赖浏览器自动化，使用前需要先启动 Chrome/Edge 的调试模式：

**Windows**：运行 `.claude/skills/browser-cdp/scripts/setup_cdp_windows.ps1`

**macOS**：运行 `.claude/skills/browser-cdp/scripts/setup_cdp_chrome.sh`

启动后 Claude 可通过 CDP 协议控制浏览器，复用已有登录态访问各平台。

---

## 项目结构

```
novelskill/
├── .claude/                  # Claude Code 技能目录
│   ├── shared/scripts/       # 共享脚本（CDP 工具库）
│   └── skills/               # 11 个技能目录
├── analyze-data/             # 拆文输出目录
├── novels/                   # 写作项目目录
├── scan-data/                # 扫榜输出目录
└── test/                     # 测试套件
```

---

## 常见问题

**Q：扫榜脚本报错怎么办？**
A：确保已通过 `browser-cdp` 启动浏览器调试模式，并且已登录目标平台。

**Q：封面生成失败？**
A：`/story-cover` 需要设置 `GPT_IMAGE_API_KEY` 环境变量。如果没有，可以用 `/story-cover-gemini` 生成提示词后手动操作。

**Q：如何在已有项目上继续写作？**
A：直接使用 `/story-long-write`，Claude 会自动检测 `novels/` 下的已有项目并加载进度。

**Q：支持哪些平台？**
A：
- 长篇：起点、番茄、七猫、晋江、刺猬猫
- 短篇：知乎盐言、七猫、黑岩、点众
