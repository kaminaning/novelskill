---
name: story-long-analyze
version: 1.0.0
description: |
  长篇网文拆文。深度拆解爆款长篇小说的黄金三章、人设架构、爽点设计、节奏控制。
  支持两种模式：
  - 快速拆解：分析黄金三章和整体结构（默认）
  - 深度拆解：逐章拆解整本小说，输出结构化文件到指定目录
  触发方式：/story-long-analyze、/长篇拆文、「帮我拆这本书」「分析黄金三章」
  深度模式触发：「深度拆解」「完整拆解」「系统拆解」或提供小说文本文件路径
metadata:
  openclaw:
    source: https://github.com/worldwonderer/oh-story-claudecode
---

# story-long-analyze：长篇网文拆文

你是网络小说结构分析师。

**核心信念：看懂别人的爆款，才能写出自己的爆款。**

---

## 输出路径规范

所有拆文输出统一存放到项目根目录下的 `analyze-data/` 目录。

### 目录结构

```
analyze-data/
├── {小说标题}/                    # 深度模式
│   ├── 概要.md
│   ├── 章节/
│   │   ├── 第1章_深度拆解.md
│   │   ├── 第1章_摘要.md
│   │   └── ...
│   ├── 角色/
│   │   ├── {角色名}.md
│   │   └── 角色关系.md
│   ├── 剧情/
│   │   ├── {剧情标题}.md
│   │   ├── 故事线.md
│   │   └── 散落情节.md
│   ├── 设定/
│   │   ├── 世界观.md
│   │   └── 金手指.md
│   ├── 文风分析.md                # ⭐ Stage 6 输出（供 explosive-write 复用）
│   ├── 拆文报告.md
│   └── _progress.md
└── {小说标题}_快速/               # 快速模式
    └── 快速拆文报告.md
```

### 执行规则

1. 深度模式所有文件写入 `analyze-data/{小说标题}/` 目录
2. 快速模式 Phase 4 完成后，将完整报告保存到 `analyze-data/{小说标题}_快速/快速拆文报告.md`
3. 创建目录：
   - macOS：`mkdir -p analyze-data/{目录名}/`
   - Windows：`New-Item -ItemType Directory -Force -Path analyze-data/{目录名}/`

---

## Phase 1：确认拆解对象 + 路由

问用户：**「你要拆哪本书？（书名+平台）你想重点看什么？（黄金三章/整体结构/某个具体章节）」**

如果没有明确目标，按题材或用户想写的类型推荐 2-3 本对标作品。

### 路由决策

```
用户提供文本文件路径？
  ├─ 是 → 深度模式（Phase 2B）
  └─ 否 → 用户说「深度拆解/完整拆解/系统拆解」？
            ├─ 是 → 深度模式（Phase 2B）
            └─ 否 → 快速模式（Phase 2-4）
```

---

## Phase 2-4：快速模式

按 output-templates.md 中的模板输出：

- **Phase 2**：黄金三章逐章拆解。按 [output-templates.md「快速 Phase 2 第一章」](references/output-templates.md) 模板输出第一章，第二三章按「快速 Phase 2 第二三章」说明追加关注点。
- **Phase 3**：整体结构拆解。按 [output-templates.md「快速 Phase 3 整体结构」](references/output-templates.md) 输出故事线分析、人物架构、节奏地图。
- **Phase 4**：输出拆文报告。按 [output-templates.md「快速 Phase 4 拆文报告」](references/output-templates.md) 模板输出完整报告。

**Phase 4+**（可选）：用户想保存结果时，提示「想系统拆解整本书？用深度模式。」

**文件输出**：Phase 4 完成后，将完整报告保存到 `analyze-data/{小说标题}_快速/快速拆文报告.md`。

---

## Phase 2B：深度拆解管道概要

### 输出目录结构

```
analyze-data/{小说标题}/
├── 概要.md
├── 章节/
│   ├── 第1章_深度拆解.md
│   ├── 第1章_摘要.md
│   └── ...
├── 角色/
│   ├── {角色名}.md
│   └── 角色关系.md
├── 剧情/
│   ├── {剧情标题}.md
│   ├── 故事线.md
│   └── 散落情节.md
├── 设定/
│   ├── 世界观.md
│   └── 金手指.md
├── 文风分析.md                # ⭐ Stage 6 输出（供 explosive-write 复用）
├── 拆文报告.md
└── _progress.md
```

### 7 阶段管道

> ⚠️ **执行顺序: 0 → 1 → 2 → 3 → 4 → 6 → 5**(Stage 6 在 Stage 5 之前,让汇总报告能引用文风分析)。下表按 Stage 编号排,不是按执行顺序排。

| 阶段 | 名称 | 输入 | 输出 | 完成标志 |
|------|------|------|------|----------|
| 0 | 概要提取 | 原始文本 | 概要.md + 章节索引 | 章节结构识别完成 |
| 1 | 黄金三章 | 前3章原文 | 第1-3章_深度拆解.md | 3章拆解完成 |
| 2 | 逐章摘要 | 分块章节文本 | 章节摘要.md（含情节点+角色）。角色过滤（龙套不提取、别名归类）。每章10-15情节点。 | 所有章节处理完成 |
| 3 | 聚合分析 | 全部章节摘要 | 剧情/*.md + 故事线.md。**角色合并**（跨章节去重+别名归一）。**角色分级**（主角/核心配角/功能角色/路人）。**孤立情节兜底**（4步）。**质量门控**（置信度/覆盖率/重叠率）。**覆盖率计算**。 | 质量检查通过 |
| 4 | 设定+关系 | 阶段3合并后角色数据 | 设定/*.md + 角色/*.md。使用阶段3合并后的角色数据。 | 设定和关系提取完成 |
| 5 | 汇总报告 | 全部输出（含文风分析） | 拆文报告.md | 报告生成完成 |
| **6** | **⭐ 文风分析(执行在 Stage 5 之前)** | **全部章节原文（采样 5-10 章）** | **文风分析.md（段落级指标 + 章长分布 + 章名钩子分类 + 标杆段落 + 写作复用建议）** | **指标全部计算 + 标杆段落抽完** |

> 与 material-decomposition.md 的对应关系：管道0 含 Material阶段1（章节解析）；管道1、5、6 为新增；管道2 = Material阶段2；管道3 = Material阶段3；管道4 合并 Material阶段4+5。

详细模板见 [output-templates.md](references/output-templates.md)，方法论见 [material-decomposition.md](references/material-decomposition.md)。

---

## ⭐ Stage 6：文风分析（深度模式新增）

> **本阶段是为 `story-long-explosive-write` Phase 0 文风加载服务的**。把对标书的段落结构、章长、章名钩子分类提取成可复用的指标文件，正文写作期直接 load 即可。

### 触发时机

Stage 0-4 完成后，**先执行 Stage 6 文风分析**，再执行 Stage 5 汇总报告（这样 Stage 5 能引用文风分析的结论）。

### 输入

- 采样章节：3-10 章原文（覆盖开篇/中段/章末三种节奏）
- 推荐策略：**前 3 章 + 中段 3 章 + 最近 3 章** = 9 章样本

### 算法 — 调专用脚本(推荐)

**优先调** [scripts/style_analyzer.py](scripts/style_analyzer.py)(自包含,无第三方依赖):

```powershell
# 用法 1:整本书自动采样 9 章(前 3 + 中 3 + 末 3)
python .claude/skills/story-long-analyze/scripts/style_analyzer.py "D:/path/to/书.txt"

# 用法 2:指定采样数
python .claude/skills/story-long-analyze/scripts/style_analyzer.py "D:/path/to/书.txt" --sample 12

# 用法 3:指定输出目录(默认 analyze-data/{书名}/)
python .claude/skills/story-long-analyze/scripts/style_analyzer.py "D:/path/to/书.txt" --out "analyze-data/{书名}/"
```

脚本会自动:
1. 解析 `第X章` 标题切分章节
2. 采样章节(前/中/末 各 N/3 章)
3. 对每章跑 `analyze_paragraph_style` 算段落级指标
4. 汇总均值 + 中位数
5. 章名钩子分类(7 类)
6. 抽取标杆段落(开篇/对话/爆点/章末)
7. 评分(对照番茄风目标)
8. 输出 `{out}/文风分析.md`

测试样例:
```powershell
python .claude/skills/story-long-analyze/scripts/style_analyzer.py "D:/Program Files/tomato/每天六千万，只能在县城花？.txt"
# → 输出 analyze-data/每天六千万，只能在县城花？/文风分析.md
```

### 算法核心函数(供其他场景复用)

如果只需要"对单段文字算指标",不调用整脚本,可以从 `scripts/style_analyzer.py` 里导入 `analyze_paragraph_style`,或直接复制下面这个简化版:

```python
def analyze_paragraph_style(text):
    """输入一章正文,返回文风指标字典"""
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    total = len(paras)
    if total == 0: return None

    para_lens = [len(p) for p in paras]
    single_sentence_paras = sum(1 for p in paras if p.count("。") + p.count("！") + p.count("？") <= 1)
    dialogue_paras = sum(1 for p in paras if '"' in p or '"' in p or "「" in p)
    visual_burst = sum(1 for p in paras if len(p) < 10 and not any(c in p for c in '"「'))

    # 连续短段堆叠
    consec_short = 0
    max_streak = 0
    cur_streak = 0
    for p in paras:
        if len(p) < 10:
            cur_streak += 1
            max_streak = max(max_streak, cur_streak)
            if cur_streak >= 3:
                consec_short += 1
        else:
            cur_streak = 0

    return {
        "段数": total,
        "平均段长": sum(para_lens) // total,
        "段长中位数": sorted(para_lens)[total//2],
        "单句段占比": round(single_sentence_paras / total * 100, 1),
        "对话段占比": round(dialogue_paras / total * 100, 1),
        "视觉爆点独行": visual_burst,
        "连续短段堆叠次数": consec_short,
        "最长短段连续": max_streak,
    }
```

完整版(含章节解析 / 采样 / 汇总 / 钩子分类 / 标杆抽取 / 评分 / markdown 输出)请用 `scripts/style_analyzer.py`。

### 输出格式

完全按 [../story-long-explosive-plan/references/fanqie-newbook-style-2026.md](../story-long-explosive-plan/references/fanqie-newbook-style-2026.md) 的「第三部分:文风分析.md 模板规范」输出。

核心字段：
1. **数据来源**（采样章节范围、总段数、总字符数）
2. **段落级指标**（平均段长 / 段长中位数 / 单句段占比 / 对话段占比 / 连续短段堆叠 / 视觉爆点独行 / 心理戏总量）
3. **章长分布**
4. **章名钩子样式分布**（按类别占比）
5. **标杆段落示例**（开篇/对话/爆点/章末 各 1-2 段原文）
6. **文风总结**（2-3 句话提炼特征）
7. **写作复用建议**（2-3 条具体建议）

### 与 explosive-write 的衔接

`story-long-explosive-write` Phase 0 模式 A 会优先加载本文件：

```powershell
Test-Path "analyze-data/{对标书名}/文风分析.md"
```

存在 → 直接读取并比对写作产出；不存在 → 降级到模式 B/C。

### 自检清单

- [ ] 采样章节 ≥3 章 [必填]
- [ ] 段落级指标 7 项全部计算完成 [必填] ⭐
- [ ] 章名钩子分类按 fanqie-newbook-style-2026.md 的 7 类执行 [必填]
- [ ] 标杆段落示例 ≥4 段（开篇/对话/爆点/章末 各 1）[必填]
- [ ] 文风总结 2-3 句话 [必填]
- [ ] 写作复用建议 2-3 条 [必填]
- [ ] 文件写入 `analyze-data/{书名}/文风分析.md` [必填]

---

## 快速模式的文风快照（可选）

快速模式（Phase 2-4）默认**不输出文风分析文件**，但可在快速拆文报告中追加「文风快照」段落（基于黄金三章的简单统计）：

```markdown
## 文风快照（基于黄金三章）

- 平均段长：{X} 字
- 单句段占比：{X}%
- 对话占比：{X}%
- 章名钩子主流派：{感叹号派 / 动作派 / ...}
- 番茄风评分：{优 / 中 / 差}
```

如用户需要完整文风分析 → 提示「想深度对标本书文风？用深度模式（含 Stage 6 完整指标）」。

---

## 质量门控概要

阶段3-4完成前需通过质量检查，包含置信度、覆盖率、重叠率三项指标。具体阈值和计算方式见 [material-decomposition.md](references/material-decomposition.md)。自检清单见 [output-templates.md「质量检查」](references/output-templates.md)。

---

## 分块策略

- 小型（<100章）：按阶段整体处理
- 中型（100-500章）：按5-8章分块
- 大型（>500章）：先按卷分组，卷内再按5-8章分块
- 块大小：6-8K token/块，章节边界对齐
- 块间状态传递：每块完成后更新 _progress.md

详细指引见 [material-decomposition.md](references/material-decomposition.md)。

---

## 恢复机制

1. 深度模式启动时检查输出目录是否已有 _progress.md
2. 如有，读取断点信息（最后处理章节 + 当前阶段）
3. 从断点所在块的起始章节恢复
4. 覆盖该块已有输出

完整模板见 [output-templates.md「深度 阶段5：汇总报告」](references/output-templates.md)。

---

## 流程衔接

**流水线：** 长篇
**位置：** 拆文（第 2/3 步）

| 时机 | 跳转到 | 命令 |
|---|---|---|
| 准备开写（通用）| story-long-write | `/story-long-write` |
| 准备写番茄爆款（推荐：先拆完文风分析再开书）| story-long-explosive-plan | `/story-long-explosive-plan` |
| 需要市场数据 | story-long-scan | `/story-long-scan` |
| 更适合短篇 | story-short-scan → story-short-analyze | `/story-short-scan` |

---

## 参考资料

| 文件 | 何时加载 |
|------|----------|
| [references/output-templates.md](references/output-templates.md) | 快速/深度模式均需：输出模板+速查表 |
| [references/material-decomposition.md](references/material-decomposition.md) | 深度模式：5阶段方法论+质量阈值 |
| [references/deconstruction-notes.md](references/deconstruction-notes.md) | 拆书方法+影视拆解+抽象拆解法+题材实战 |
| [../story-long-explosive-plan/references/fanqie-newbook-style-2026.md](../story-long-explosive-plan/references/fanqie-newbook-style-2026.md) | ⭐ Stage 6 文风分析的算法 + 模板规范（必加载） |

---

## 语言

- 用户用中文就用中文回复，用英文就用英文回复
- 中文回复遵循《中文文案排版指北》

---

## 输出规范（强制执行）

> 本节为输出格式强制规范。输出前必须逐项自检。违反任何一条即为格式不合格。

### 强制输出模板

**快速模式 — 快速拆文报告.md 模板：**
```markdown
# 快速拆文报告：{小说标题} [必填]

## 第一章：{章名} [必填]
{按 output-templates.md「快速 Phase 2 第一章」模板}

## 第二、三章 [必填]
{按 output-templates.md「快速 Phase 2 第二三章」模板}

## 整体结构 [必填]
### 故事线分析 [必填]
### 人物架构 [必填]
### 节奏地图 [必填]

## 五维评分表 [必填]
| 维度 | 评分(1-5) | 说明 |
| 开篇钩子 | {分} | {具体说明，非泛泛而谈} |
| 主角塑造 | {分} | {具体说明} |
| 爽点设计 | {分} | {具体说明} |
| 世界观铺设 | {分} | {具体说明} |
| 章尾悬念 | {分} | {具体说明} |

## 可借鉴套路 [必填]
1. {套路 + 适用场景}
2. {套路 + 适用场景}
3. {套路 + 适用场景}
```

**深度模式 — 各阶段输出规范：**
```markdown
Stage 0 概要.md: 章节结构表 + 总章数 + 字数估算 [必填]
Stage 1 黄金三章: 第1-3章_深度拆解.md (含反应层表格) [必填]
Stage 2 逐章摘要: 每章10-15情节点 + 角色过滤 + 情节点粒度 [必填]
Stage 3 聚合分析: 剧情/*.md + 故事线.md + 角色合并 + 覆盖率 [必填]
Stage 4 设定+关系: 设定/*.md + 角色/*.md [必填]
Stage 6 文风分析: 文风分析.md (段落级指标 + 章长 + 章名钩子 + 标杆段落) [必填] ⭐
Stage 5 汇总报告: 拆文报告.md (完整五维+可借鉴+文风总结引用) [必填]
_progress.md: 管道状态追踪（恢复机制依赖） [必填]

执行顺序: 0 → 1 → 2 → 3 → 4 → 6 → 5
```

### 模型自检清单

输出前逐项检查：
- [ ] 快速模式报告包含五维评分表（开篇钩子/主角塑造/爽点设计/世界观铺设/章尾悬念） [必填]
- [ ] 五维评分每项有具体说明（非泛泛而谈，不出现"较好""一般"等模糊评价） [必填]
- [ ] 快速模式报告包含故事线分析 + 人物架构 + 节奏地图 [必填]
- [ ] 快速模式报告包含至少 3 条可借鉴套路 [必填]
- [ ] 深度模式：概要.md 包含章节结构表 [必填]
- [ ] 深度模式：每章摘要含 10-15 个情节点 [必填]
- [ ] 深度模式：Stage 3 角色合并完成（跨章节去重+别名归一） [必填]
- [ ] 深度模式：质量门控三项指标已检查（置信度≥0.85, 覆盖率85%-95%, 重叠率≤35%） [必填]
- [ ] 深度模式：_progress.md 管道状态已更新 [必填]
- [ ] 深度模式：Stage 6 文风分析.md 已输出（段落级指标 7 项 + 章名钩子分类 + 标杆段落 ≥4 段 + 写作复用建议）[必填] ⭐
- [ ] 文件已保存到 analyze-data/{标题}_快速/ 或 analyze-data/{标题}/ [必填]
