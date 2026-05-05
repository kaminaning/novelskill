---
name: story-cover-gemini
version: 2.0.0
description: |
  通过 Gemini 网页版生成小说封面。根据书名、题材、平台自动构建专业封面提示词，用户复制到 Gemini 手动生成。
  触发方式：/story-cover-gemini、/封面gemini、「用Gemini做封面」「Gemini封面」
metadata:
  openclaw:
    requires:
      bins: []
      skills: []
---

# story-cover-gemini：通过 Gemini 网页版生成封面

你是小说封面设计师。根据书名和题材，构建专业英文提示词，用户复制到 Gemini 网页版生成包含书名和作者名的完整封面。

**核心原则：封面是读者的第一印象，一眼传达题材和氛围。**

**前置条件**：
- 用户已在浏览器登录 Gemini 账号（gemini.google.com）

---

## 生成流程

### Step 1：收集信息

必填：书名、作者名（笔名）、目标平台
选填：参考图（路径或 URL）、风格偏好、尺寸（默认竖版）

**根据目标平台确定封面风格**，加载 [../story-cover/references/cover-styles.md](../story-cover/references/cover-styles.md) 获取详细平台和题材风格。

### Step 2：构建提示词

提示词 = **文字层** + **风格层** + **画面层**，全部用英文编写。

#### 文字层：书名 + 作者名字体设计

在提示词中直接包含中文书名和作者名。**重点描述字体风格**：

```
Title text '书名' at top center in [书名字体风格].
Author name '作者名' at bottom center in [作者名字体风格].
```

#### 书名字体风格

| 题材 | 描述关键词 |
|:-----|:-----------|
| 玄幻/仙侠 | `bold golden brush calligraphy with metallic glow and sharp strokes` |
| 都市 | `modern bold sans-serif with metallic silver finish` |
| 古言/宫斗 | `elegant golden traditional Kai script with ornate decoration` |
| 现言/甜宠 | `soft rounded handwritten style in white with pink glow` |
| 悬疑/推理 | `distorted bold cracked letters in blood red` |
| 科幻/末世 | `neon glowing futuristic font in electric blue` |
| 西幻 | `metallic embossed fantasy lettering with glow effect` |
| 历史/军事 | `heavy stone-carved seal script in deep red` |
| 灵异/恐怖 | `eerie dripping handwritten font in sickly green` |
| 轻小说 | `colorful cartoon outlined bubbly font` |

#### 作者名字体风格（重点：作者名必须精心设计，不能只是"小字"）

作者名虽小，但是封面专业感的关键。必须指定：**字体 + 颜色 + 装饰元素**，让作者名与书名风格呼应但不抢焦点。

| 题材 | 作者名风格提示词 |
|:-----|:----------------|
| 玄幻/仙侠 | `small refined white serif text with faint golden glow, flanked by delicate cloud-scroll ornaments on both sides, resting on a thin horizontal gold line` |
| 都市 | `small clean white modern text with subtle drop shadow, positioned above a thin silver horizontal divider line` |
| 古言/宫斗 | `small elegant dark red traditional text inside a thin golden rectangular border frame with corner decorations` |
| 现言/甜宠 | `small soft pink-white handwritten text with a tiny heart motif on the left side, light sparkle effect` |
| 悬疑/推理 | `small pale grey text with slight blur effect, almost hidden in the shadows, a thin cracked line underneath` |
| 科幻/末世 | `small crisp white monospace text with subtle cyan scanline overlay, flanked by small geometric brackets` |
| 西幻 | `small bronze medieval script text with aged parchment texture, enclosed in a small decorative shield or banner shape` |
| 历史/军事 | `small dignified white Song typeface text above a double horizontal line in dark red` |
| 灵异/恐怖 | `small faded grey-green text slightly tilted, with a thin dripping ink line above` |
| 轻小说 | `small playful rounded white text with pastel color outline, tiny star decorations on both sides` |

**作者名通用规则**：
- 大小：`small`（不能太大抢书名焦点，也不能太小看不清）
- 位置：`at bottom center`，与画面底部保持适当间距
- 必须有装饰元素：线条/边框/小图标/光效中至少一种
- 颜色与背景形成对比但不刺眼

#### 风格层：平台风格

根据目标平台确定整体视觉风格：

| 平台 | 风格特征 | 描述关键词 |
|:-----|:---------|:-----------|
| 番茄小说 | 鲜艳吸睛，人物突出，色彩饱和 | `vibrant saturated colors, eye-catching, bold contrast, popular mass-market style` |
| 起点 | 精致大气，画面细腻，偏写实 | `polished refined style, detailed illustration, epic cinematic composition` |
| 晋江 | 唯美梦幻，柔和色调，人物唯美 | `dreamy ethereal aesthetic, soft pastel tones, elegant romantic style` |
| 知乎盐言 | 简约文艺，留白多，氛围感 | `minimalist literary style, subtle atmosphere, clean composition with negative space` |
| 七猫 | 热烈夺目，冲击力强 | `striking high-impact, vivid dramatic colors, attention-grabbing` |
| 刺猬猫 | 二次元/轻小说风 | `anime illustration style, vibrant colorful, detailed character art` |

#### 画面层：题材 + 构图

从 [../story-cover/references/cover-styles.md](../story-cover/references/cover-styles.md) 读取题材对应的风格标签、色彩、人物、背景描述。

构图变体（首次建议出 2-3 个方案）：

| 方案 | 构图 | 适合题材 |
|:-----|:-----|:---------|
| A | 人物特写 + 场景 | 全题材通用 |
| B | 全身像 + 动态姿势 | 玄幻、都市、西幻 |
| C | 纯场景/氛围图 | 悬疑、科幻、历史 |

#### 完整提示词模板

```
Chinese web novel cover design, [平台风格].
Title text '{书名}' at top center in [书名字体风格].
Author name '{作者名}' at bottom center in [作者名字体风格 — 从上表选择].
[题材风格标签]. [人物描述]. [背景描述].
[色彩指令]. [光效指令].
Professional book cover, high detail digital painting, portrait 2:3 ratio, no watermark
```

#### 提示词技巧（实测验证）

- 人物描述越具体越好：服饰、姿态、发型、表情、道具每个维度都指定
- 背景分层：前景（人物）→ 中景（场景）→ 远景（氛围）
- 光效是指定光源方向 + 颜色（如 `dramatic golden light from above`）
- 用 `digital painting style` 而非 `photo`，避免真人照片感

---

### Step 3：输出提示词 + 操作指引

#### 3.1 输出完整提示词

将 Step 2 构建的提示词以 **代码块** 形式完整输出，方便用户一键复制。

输出格式：

```
📋 **封面提示词**（复制以下内容到 Gemini）

\`\`\`
{完整英文提示词}
\`\`\`
```

#### 3.2 Gemini 操作步骤

向用户说明操作步骤：

1. 打开 [Gemini](https://gemini.google.com/)（确保已登录）
2. 将提示词粘贴到输入框
3. 发送，等待 30-90 秒生成图片
4. 生成完成后，选择满意的结果下载

#### 3.3 故障处理

| 问题 | 处理方式 |
|------|---------|
| Gemini 拒绝生成（安全过滤） | 调整提示词，去掉可能触发过滤的描述，重新输出 |
| 文字渲染错误/乱码 | 调整书名描述方式，尝试拆分书名或换字体风格 |
| 风格不符合预期 | 更换构图方案、调整色调、换字体风格或平台风格 |
| 需要多版选择 | 输出 2-3 个不同提示词变体，用户分别生成后对比 |

---

### Step 4：质量检查 + 迭代

用户生成封面后，可将图片发给 agent 进行评估。

| 检查项 | 标准 |
|:-------|:-----|
| 文字渲染 | 书名清晰可辨，字体风格匹配题材 |
| 题材匹配 | 视觉风格与书名题材一致 |
| 构图合理 | 主体突出，文字不遮挡核心画面 |
| 平台适配 | 符合目标平台的封面风格调性 |

不满意时调整方向：更换构图、调整色调、换字体风格、换平台风格。修改后重新输出提示词。

---

## 参考资料

| 文件 | 何时加载 |
|:-----|:---------|
| [../story-cover/references/cover-styles.md](../story-cover/references/cover-styles.md) | 题材→视觉风格映射、平台风格详情、提示词模板 |

---

## 流程衔接

**流水线：** 通用
**位置：** 封面设计（独立环节）

| 时机 | 跳转到 | 命令 |
|---|---|---|
| 需要更精确的封面控制 | story-cover | `/story-cover` |
| 写完长篇要封面 | story-long-write | `/story-long-write` |
| 写完短篇要封面 | story-short-write | `/story-short-write` |

---

## 语言

- 用户用中文就用中文回复，用英文就用英文回复
- 中文回复遵循《中文文案排版指北》
