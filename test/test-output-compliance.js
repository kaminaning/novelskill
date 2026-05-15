#!/usr/bin/env node
/**
 * oh-story-claudecode 输出规范合规性测试套件
 *
 * TDD 测试覆盖：
 *   OC1-OC7   输出强制块存在性（最后 30%）
 *   OC8-OC14  强制输出模板存在性（含 [必填] 标记）
 *   OC15-OC21 模型自检清单存在性与特异性
 *   OC22      必填字段标记数量
 *   OC23      矛盾检测：story-short-write Markdown 禁令与节拍编号
 *   OC24      矛盾检测：SKILL.md 与 reference 文件 5 条禁令一致性
 *   OC25      占位符一致性
 *   OC26      文件名大小写一致性
 *   OC27      强制语言标记
 *   OC28      强制块位置（在流程衔接之后）
 *   OC29      reference 与 inline 模板必填字段对齐
 *   OC30      模板完整性（多阶段覆盖）
 *
 * 用法：
 *   node test-output-compliance.js
 */

const fs = require("fs");
const path = require("path");

const CLAUDE_DIR = path.resolve(__dirname, "..", ".claude");
const SKILLS_DIR = path.join(CLAUDE_DIR, "skills");

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
    console.log(`  FAIL: ${msg}`);
  }
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

/**
 * Read SKILL.md content, handling both uppercase/lowercase filenames.
 */
function readSkillMd(skill) {
  const upper = path.join(SKILLS_DIR, skill, "SKILL.md");
  const lower = path.join(SKILLS_DIR, skill, "skill.md");
  const filePath = fs.existsSync(upper) ? upper : fs.existsSync(lower) ? lower : null;
  if (!filePath) return null;
  return { path: filePath, content: fs.readFileSync(filePath, "utf-8"), usedUpper: filePath === upper };
}

/**
 * Get the enforcement block section from SKILL.md content.
 * Returns { index, block } or null.
 */
function getEnforcementBlock(content) {
  const marker = "## 输出规范（强制执行）";
  const idx = content.indexOf(marker);
  if (idx === -1) return null;
  return { index: idx, block: content.substring(idx) };
}

// Content-producing skills (story-cover produces images, not text templates)
const CONTENT_SKILLS = [
  "story-short-write",
  "story-long-write",
  "story-long-analyze",
  "story-short-analyze",
  "story-long-scan",
  "story-short-scan",
  "story-deslop",
];

// ---------------------------------------------------------------------------
// OC1-OC7: 输出强制块存在性
// ---------------------------------------------------------------------------

function testOC1to7() {
  section("OC1-OC7: 输出强制块存在性");

  for (const skill of CONTENT_SKILLS) {
    const data = readSkillMd(skill);
    if (!data) {
      assert(false, `${skill}: SKILL.md not found`);
      continue;
    }

    const lines = data.content.split("\n");
    const totalLines = lines.length;
    const threshold = Math.floor(totalLines * 0.6);
    const marker = "## 输出规范（强制执行）";

    // Find the line number of the marker
    let markerLine = -1;
    for (let i = 0; i < totalLines; i++) {
      if (lines[i].includes(marker)) {
        markerLine = i;
        break;
      }
    }

    assert(markerLine >= threshold,
      `${skill}: enforcement block at line ${markerLine + 1}/${totalLines} (must be in last 40%, >= line ${threshold + 1})`);
  }
}

// ---------------------------------------------------------------------------
// OC8-OC14: 强制输出模板存在性
// ---------------------------------------------------------------------------

function testOC8to14() {
  section("OC8-OC14: 强制输出模板存在性");

  for (const skill of CONTENT_SKILLS) {
    const data = readSkillMd(skill);
    if (!data) {
      assert(false, `${skill}: SKILL.md not found`);
      continue;
    }

    const enforcement = getEnforcementBlock(data.content);
    if (!enforcement) {
      assert(false, `${skill}: enforcement block not found (skip template check)`);
      continue;
    }

    // Must have ### 强制输出模板
    const templateMarker = "### 强制输出模板";
    assert(enforcement.block.includes(templateMarker),
      `${skill}: has "${templateMarker}" subsection`);

    // Template must contain [必填] markers
    const templateIdx = enforcement.block.indexOf(templateMarker);
    const afterTemplate = enforcement.block.substring(templateIdx);
    const requiredMarkers = (afterTemplate.match(/\[必填\]/g) || []).length;
    assert(requiredMarkers >= 3,
      `${skill}: template has ${requiredMarkers} [必填] markers (need >= 3)`);

    // Template code block must have >3 lines of content
    const codeBlockMatch = afterTemplate.match(/```[\s\S]*?```/);
    if (codeBlockMatch) {
      const codeContent = codeBlockMatch[0].replace(/```\w*\n?/g, "").replace(/```$/g, "");
      const codeLines = codeContent.split("\n").filter((l) => l.trim().length > 0);
      assert(codeLines.length >= 3,
        `${skill}: template code block has ${codeLines.length} lines (need >= 3)`);
    } else {
      assert(false, `${skill}: no code block found in template section`);
    }
  }
}

// ---------------------------------------------------------------------------
// OC15-OC21: 模型自检清单存在性与特异性
// ---------------------------------------------------------------------------

function testOC15to21() {
  section("OC15-OC21: 模型自检清单存在性与特异性");

  for (const skill of CONTENT_SKILLS) {
    const data = readSkillMd(skill);
    if (!data) {
      assert(false, `${skill}: SKILL.md not found`);
      continue;
    }

    const enforcement = getEnforcementBlock(data.content);
    if (!enforcement) {
      assert(false, `${skill}: enforcement block not found (skip checklist check)`);
      continue;
    }

    const checklistMarker = "### 模型自检清单";
    assert(enforcement.block.includes(checklistMarker),
      `${skill}: has "${checklistMarker}" subsection`);

    // Extract checklist items
    const checklistIdx = enforcement.block.indexOf(checklistMarker);
    const afterChecklist = enforcement.block.substring(checklistIdx);
    const checkItems = afterChecklist.match(/- \[ \] .+/g) || [];

    assert(checkItems.length >= 5,
      `${skill}: checklist has ${checkItems.length} items (need >= 5)`);

    // Each item must be specific (>= 5 chars after "- [ ] ", not generic)
    let genericCount = 0;
    for (const item of checkItems) {
      const text = item.replace(/- \[ \] /, "").trim();
      if (text.length < 5) {
        genericCount++;
      }
    }
    assert(genericCount === 0,
      `${skill}: all checklist items are specific (${genericCount} generic items found)`);
  }
}

// ---------------------------------------------------------------------------
// OC22: 必填字段标记
// ---------------------------------------------------------------------------

function testOC22() {
  section("OC22: 必填字段标记");

  for (const skill of CONTENT_SKILLS) {
    const data = readSkillMd(skill);
    if (!data) {
      assert(false, `${skill}: SKILL.md not found`);
      continue;
    }

    const enforcement = getEnforcementBlock(data.content);
    if (!enforcement) {
      assert(false, `${skill}: enforcement block not found (skip [必填] check)`);
      continue;
    }

    const templateIdx = enforcement.block.indexOf("### 强制输出模板");
    if (templateIdx === -1) {
      assert(false, `${skill}: no template section (skip [必填] check)`);
      continue;
    }

    const templateSection = enforcement.block.substring(templateIdx);
    const count = (templateSection.match(/\[必填\]/g) || []).length;
    assert(count >= 3, `${skill}: has ${count} [必填] markers in template (need >= 3)`);
  }
}

// ---------------------------------------------------------------------------
// OC23: 矛盾检测 — story-short-write Markdown 禁令与节拍编号
// ---------------------------------------------------------------------------

function testOC23() {
  section("OC23: 矛盾检测 — Markdown 禁令与节拍编号");

  const skill = "story-short-write";
  const data = readSkillMd(skill);
  assert(data !== null, `${skill}: SKILL.md found`);

  const refPath = path.join(SKILLS_DIR, skill, "references", "format-and-structure.md");
  assert(fs.existsSync(refPath), `${skill}/references/format-and-structure.md exists`);

  const refContent = fs.readFileSync(refPath, "utf-8");

  // Check Markdown prohibition exists
  const skillHasBan = /禁止.*Markdown/.test(data.content);
  const refHasBan = /禁止.*Markdown/.test(refContent);
  assert(skillHasBan || refHasBan, "Markdown prohibition rule exists");

  // Check that the prohibition explicitly excludes beat markers
  // The fix should add language like "小节编号 ... 不属于此禁令" or "分隔符 ... 排版标记"
  const combined = data.content + "\n" + refContent;
  const hasExclusion =
    /小节编号.*不属于/.test(combined) ||
    /结构.*分隔.*不.*禁/.test(combined) ||
    /排版标记/.test(combined) ||
    /编号.*###.*不属于/.test(combined) ||
    /节拍编号.*排版标记/.test(combined) ||
    /分隔符.*排版标记/.test(combined);
  assert(hasExclusion,
    "Markdown prohibition explicitly excludes beat markers (###1. etc.)");
}

// ---------------------------------------------------------------------------
// OC24: 矛盾检测 — SKILL.md 与 reference 5 条禁令一致性
// ---------------------------------------------------------------------------

function testOC24() {
  section("OC24: 矛盾检测 — 5 条禁令一致性");

  const skill = "story-short-write";
  const data = readSkillMd(skill);
  const refPath = path.join(SKILLS_DIR, skill, "references", "format-and-structure.md");
  const refContent = fs.readFileSync(refPath, "utf-8");

  // The 5 prohibition themes that must match
  const themes = [
    { name: "大段落", patterns: [/大段落|超过.*60.*字|>60|> 60/] },
    { name: "空行", patterns: [/空行/] },
    { name: "对话标签", patterns: [/他说|她道|对话标签/] },
    { name: "缩进", patterns: [/缩进/] },
    { name: "Markdown渲染", patterns: [/Markdown.*渲染|Markdown.*格式/] },
  ];

  for (const theme of themes) {
    const inSkill = theme.patterns.some((p) => p.test(data.content));
    const inRef = theme.patterns.some((p) => p.test(refContent));
    assert(inSkill, `prohibition "${theme.name}" found in SKILL.md`);
    assert(inRef, `prohibition "${theme.name}" found in format-and-structure.md`);
  }
}

// ---------------------------------------------------------------------------
// OC25: 占位符一致性
// ---------------------------------------------------------------------------

function testOC25() {
  section("OC25: 占位符一致性");

  for (const skill of CONTENT_SKILLS) {
    const data = readSkillMd(skill);
    if (!data) continue;

    const enforcement = getEnforcementBlock(data.content);
    if (!enforcement) continue;

    const templateIdx = enforcement.block.indexOf("### 强制输出模板");
    if (templateIdx === -1) continue;

    const templateSection = enforcement.block.substring(
      templateIdx,
      enforcement.block.indexOf("###", templateIdx + 10) > templateIdx
        ? enforcement.block.indexOf("###", templateIdx + 10)
        : enforcement.block.length
    );

    // Check for placeholder patterns: {value} for fill-in, [必填]/[可选] for markers
    // These are different semantic uses, so mixing is OK.
    // But {field} and [field] should not be used interchangeably for the same purpose.
    // Simple check: no bare [placeholder] that looks like a fill-in (not a marker)
    const bareBrackets = templateSection.match(/\[(?!必填\])(?!可选\])(?! ])[^\]]{1,20}\]/g) || [];
    const curlyBraces = templateSection.match(/\{[^}]+\}/g) || [];

    // If both exist, verify bare brackets are not used as fill-in placeholders
    if (bareBrackets.length > 0 && curlyBraces.length > 0) {
      // Bare brackets mixed with curly braces - potential inconsistency
      // Allow if bare brackets are clearly labels/markers (short, no spaces)
      const suspiciousBrackets = bareBrackets.filter((b) => b.includes(" ") || b.length > 10);
      assert(suspiciousBrackets.length === 0,
        `${skill}: no mixed placeholder styles in template (found ${suspiciousBrackets.length} suspicious [brackets] mixed with {braces})`);
    }
  }
}

// ---------------------------------------------------------------------------
// OC26: 文件名大小写一致性
// ---------------------------------------------------------------------------

function testOC26() {
  section("OC26: 文件名大小写一致性");

  const skillDirs = fs.readdirSync(SKILLS_DIR).filter((d) =>
    fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
  );

  for (const skill of skillDirs) {
    // Use readdirSync to get actual filenames (case-sensitive on all platforms)
    const files = fs.readdirSync(path.join(SKILLS_DIR, skill));
    const hasSkillMd = files.includes("SKILL.md");
    const hasLowerSkillMd = files.includes("skill.md");
    assert(hasSkillMd,
      `${skill}/SKILL.md exists with uppercase name${hasLowerSkillMd ? " (found lowercase skill.md instead)" : ""}`);
  }
}

// ---------------------------------------------------------------------------
// OC27: 强制语言标记
// ---------------------------------------------------------------------------

function testOC27() {
  section("OC27: 强制语言标记");

  for (const skill of CONTENT_SKILLS) {
    const data = readSkillMd(skill);
    if (!data) {
      assert(false, `${skill}: SKILL.md not found`);
      continue;
    }

    const enforcement = getEnforcementBlock(data.content);
    if (!enforcement) {
      assert(false, `${skill}: enforcement block not found`);
      continue;
    }

    assert(enforcement.block.includes("必须逐项自检"),
      `${skill}: enforcement block requires self-check (必须逐项自检)`);

    const hasConsequence =
      enforcement.block.includes("格式不合格") ||
      enforcement.block.includes("不合格") ||
      enforcement.block.includes("违反") ||
      enforcement.block.includes("强制");
    assert(hasConsequence,
      `${skill}: enforcement block states consequences for violations`);
  }
}

// ---------------------------------------------------------------------------
// OC28: 强制块位置 — 在流程衔接之后
// ---------------------------------------------------------------------------

function testOC28() {
  section("OC28: 强制块位置（在流程衔接之后）");

  for (const skill of CONTENT_SKILLS) {
    const data = readSkillMd(skill);
    if (!data) continue;

    const enforcementIdx = data.content.indexOf("## 输出规范（强制执行）");
    const flowIdx = data.content.indexOf("## 流程衔接");
    const refIdx = data.content.indexOf("## 参考资料");

    // Enforcement must be after 流程衔接 if 流程衔接 exists
    if (flowIdx !== -1) {
      assert(enforcementIdx > flowIdx,
        `${skill}: enforcement block after 流程衔接 (enforcement=${enforcementIdx}, flow=${flowIdx})`);
    }

    // Enforcement must be after 参考资料 if 参考资料 exists
    if (refIdx !== -1) {
      assert(enforcementIdx > refIdx,
        `${skill}: enforcement block after 参考资料 (enforcement=${enforcementIdx}, ref=${refIdx})`);
    }
  }
}

// ---------------------------------------------------------------------------
// OC29: reference 与 inline 模板必填字段对齐
// ---------------------------------------------------------------------------

function testOC29() {
  section("OC29: reference 与 inline 模板必填字段对齐");

  // Check story-short-analyze and story-long-analyze
  const analyzeSkills = ["story-short-analyze", "story-long-analyze"];

  for (const skill of analyzeSkills) {
    const data = readSkillMd(skill);
    if (!data) {
      assert(false, `${skill}: SKILL.md not found`);
      continue;
    }

    const refPath = path.join(SKILLS_DIR, skill, "references", "output-templates.md");
    if (!fs.existsSync(refPath)) {
      // Skip if no output-templates.md reference file
      assert(true, `${skill}: no separate output-templates.md (inline only)`);
      continue;
    }

    const refContent = fs.readFileSync(refPath, "utf-8");

    // Extract quality gate / mandatory field mentions from both
    const skillMentions = data.content.match(/必填|质量门控|质量检查|必.*检查|置信度|覆盖率/g) || [];
    const refMentions = refContent.match(/必填|质量门控|质量检查|必.*检查|置信度|覆盖率/g) || [];

    // Both should have mandatory field mentions
    assert(skillMentions.length > 0,
      `${skill}: SKILL.md mentions mandatory fields/quality gates`);
    assert(refMentions.length > 0,
      `${skill}: output-templates.md mentions mandatory fields/quality gates`);
  }
}

// ---------------------------------------------------------------------------
// OC30: 模板完整性 — 多阶段覆盖
// ---------------------------------------------------------------------------

function testOC30() {
  section("OC30: 模板完整性 — 多阶段覆盖");

  // story-long-analyze deep mode has 6 stages
  const longAnalyze = readSkillMd("story-long-analyze");
  if (longAnalyze) {
    const enforcement = getEnforcementBlock(longAnalyze.content);
    if (enforcement) {
      // Deep mode should reference at least stages 0-5
      const stages = enforcement.block.match(/Stage\s*[0-5]|阶段\s*[0-5]|第[零一二三四五六]阶段/g) || [];
      // Quick mode should also be mentioned
      const hasQuick = enforcement.block.includes("快速") || enforcement.block.includes("quick");
      assert(stages.length >= 3 || hasQuick,
        "story-long-analyze: enforcement block covers deep mode stages or quick mode");
    } else {
      assert(false, "story-long-analyze: no enforcement block for stage coverage check");
    }
  }

  // story-short-analyze has phases 2-6
  const shortAnalyze = readSkillMd("story-short-analyze");
  if (shortAnalyze) {
    const enforcement = getEnforcementBlock(shortAnalyze.content);
    if (enforcement) {
      // Should reference at least some phases
      const phases = enforcement.block.match(/Phase\s*[2-6]|阶段\s*[2-6]/g) || [];
      assert(phases.length >= 2,
        "story-short-analyze: enforcement block references multiple phases");
    } else {
      assert(false, "story-short-analyze: no enforcement block for phase coverage check");
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("oh-story-claudecode Output Compliance Test Suite");
console.log(`Date: ${new Date().toISOString()}`);
console.log(`Node: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Skills dir: ${SKILLS_DIR}`);

testOC1to7();
testOC8to14();
testOC15to21();
testOC22();
testOC23();
testOC24();
testOC25();
testOC26();
testOC27();
testOC28();
testOC29();
testOC30();

console.log("\n" + "=".repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);

if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log("\nALL TESTS PASSED");
  process.exit(0);
}
