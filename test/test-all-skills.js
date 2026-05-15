#!/usr/bin/env node
/**
 * oh-story-claudecode 全技能跨平台（Windows + macOS）兼容性测试套件
 *
 * TDD 测试覆盖：
 *   T1  所有 JS 脚本可 require() 无语法/依赖错误
 *   T2  cdp-utils.js 导出全部 6 个函数
 *   T3  cdp-utils.js 函数签名和行为正确
 *   T4  所有 SKILL.md 中引用的相对路径文件存在
 *   T5  所有 require() 依赖链解析正确
 *   T6  所有 .md 参考文件可读取且非空
 *   T7  cdp-helper.mjs 语法正确且可被 cdp-utils 调用
 *   T8  setup_cdp_windows.ps1 文件存在且编码正确 (UTF-8 BOM)
 *   T9  所有 scraper 脚本 --help 不崩溃（验证 CLI 解析）
 *   T10 跨技能引用一致性（SKILL.md 中的跳转命令对应真实 skill）
 *   T11 SKILL.md Windows 兼容性（bash-only 代码块需有 PowerShell 替代）
 *   T12 参考文件非重定向（所有 .md 文件包含实际内容，非符号链接占位符）
 *   T13 story-cover API 调用同时提供 bash 和 PowerShell 代码
 *   T14 browser-cdp 常用操作同时提供 macOS 和 Windows 代码
 *   T15 setup_cdp_chrome.sh 存在且使用标准 macOS 路径
 *   T16 所有 SKILL.md 平台指令同时覆盖 macOS 和 Windows
 *   T17 cdp-helper.mjs 和 cdp-utils.js 仅使用跨平台 Node.js API
 *   T18 setup_cdp_chrome.sh 具有有效 bash 结构
 *   T19 路径引用一致性 — 不允许 <browser-cdp skill> 占位符
 *   T20 Reference 文件无平台特定命令
 *   T21 所有 scraper 脚本内部使用跨平台 API
 *   T22 运行时验证 (safeStr, evalJSON 解析链, 中文文件名, JS 注入)
 *   T25 输出路径规范存在性（6 个 skill 的 SKILL.md 都包含路径规范章节）
 *   T26 输出基础目录存在（scan-data/、analyze-data/、novels/）
 *   T27 会话/书籍文件夹命名规范（scan 用 YYYYMMDD_HHmm，其他用标题）
 *   T28 Scraper --outdir 兼容性
 *   T29 跨技能流水线路径一致性
 * 用法：
 *   node test-all-skills.js
 *   node test-all-skills.js --live          # 包含 CDP 连接测试
 *   node test-all-skills.js --live --port 9222
 */

const fs = require("fs");
const path = require("path");

const CLAUDE_DIR = path.resolve(__dirname, "..", ".claude");
const SKILLS_DIR = path.join(CLAUDE_DIR, "skills");
const SHARED_DIR = path.join(CLAUDE_DIR, "shared");

const LIVE = process.argv.includes("--live");
const PORT = process.argv.find((a, i) => process.argv[i - 1] === "--port") || "9222";

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

function skip(msg) {
  skipped++;
  console.log(`  SKIP: ${msg}`);
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

// ---------------------------------------------------------------------------
// T1: 所有 JS 脚本可 require() 无语法/依赖错误
// ---------------------------------------------------------------------------

function testT1() {
  section("T1: JS 脚本 require() 无崩溃");

  const jsFiles = [
    "shared/scripts/cdp-utils.js",
    "skills/story-long-scan/scripts/cdp-utils.js",
    "skills/story-short-scan/scripts/cdp-utils.js",
  ];

  for (const rel of jsFiles) {
    const abs = path.join(CLAUDE_DIR, rel);
    try {
      const mod = require(abs);
      assert(typeof mod === "object" || typeof mod === "function", `${rel} require() returns object/function`);
    } catch (err) {
      assert(false, `${rel} require() threw: ${err.message}`);
    }
  }

  // Scraper scripts: they run main() on require, but should at least parse
  // We test them by checking syntax with --check or by checking they don't crash on missing CDP
  const scraperFiles = [
    "skills/story-long-scan/scripts/qidian-rank-scraper.js",
    "skills/story-long-scan/scripts/fanqie-rank-scraper.js",
    "skills/story-long-scan/scripts/qimao-rank-scraper.js",
    "skills/story-long-scan/scripts/jjwxc-rank-scraper.js",
    "skills/story-long-scan/scripts/ciweimao-rank-scraper.js",
    "skills/story-short-scan/scripts/heiyan-booklist-scraper.js",
    "skills/story-short-scan/scripts/dz-browse-scraper.js",
  ];

  for (const rel of scraperFiles) {
    const abs = path.join(CLAUDE_DIR, rel);
    // Use node --check to validate syntax without executing
    try {
      const { execSync } = require("child_process");
      execSync(`node --check "${abs}"`, { encoding: "utf-8", timeout: 5000 });
      assert(true, `${path.basename(rel)} syntax OK`);
    } catch (err) {
      assert(false, `${path.basename(rel)} syntax error: ${err.stderr?.substring(0, 200) || err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// T2: cdp-utils.js 导出全部 6 个函数
// ---------------------------------------------------------------------------

function testT2() {
  section("T2: cdp-utils.js 导出 6 个函数");

  const requiredExports = ["ab", "sleep", "evalJSON", "safeStr", "scrollLoad", "getArg"];

  // Test shared version
  const shared = require(path.join(SHARED_DIR, "scripts", "cdp-utils.js"));
  for (const name of requiredExports) {
    assert(typeof shared[name] === "function", `shared/cdp-utils.js exports ${name}`);
  }

  // Test both proxy versions
  const proxyPaths = [
    path.join(SKILLS_DIR, "story-long-scan", "scripts", "cdp-utils.js"),
    path.join(SKILLS_DIR, "story-short-scan", "scripts", "cdp-utils.js"),
  ];

  for (const proxyPath of proxyPaths) {
    const mod = require(proxyPath);
    const skillRel = proxyPath.includes("story-long-scan") ? "long-scan" : "short-scan";
    for (const name of requiredExports) {
      assert(typeof mod[name] === "function", `${skillRel}/cdp-utils.js proxy exports ${name}`);
    }
  }
}

// ---------------------------------------------------------------------------
// T3: cdp-utils.js 函数签名和行为正确
// ---------------------------------------------------------------------------

function testT3() {
  section("T3: cdp-utils.js 函数行为");

  const cdp = require(path.join(SHARED_DIR, "scripts", "cdp-utils.js"));

  // getArg
  assert(cdp.getArg(["--port", "9222", "--type", "hotsales"], "--port") === "9222",
    "getArg --port returns '9222'");
  assert(cdp.getArg(["--port", "9222", "--type", "hotsales"], "--type") === "hotsales",
    "getArg --type returns 'hotsales'");
  assert(cdp.getArg(["--port", "9222"], "--missing") === undefined,
    "getArg --missing returns undefined");
  assert(cdp.getArg(["--flag"], "--flag") === undefined,
    "getArg with no value returns undefined");

  // safeStr
  assert(cdp.safeStr("hello") === '"hello"', 'safeStr("hello") === \'"hello"\'');
  assert(cdp.safeStr('test "world"') === '"test \\"world\\""', 'safeStr escapes quotes');
  assert(cdp.safeStr("line1\nline2") === '"line1\\nline2"', 'safeStr escapes newlines');
  assert(cdp.safeStr(123) === '"123"', "safeStr converts number to string");
  assert(cdp.safeStr("") === '""', "safeStr empty string");

  // sleep (test short duration)
  const t0 = Date.now();
  cdp.sleep(100);
  const elapsed = Date.now() - t0;
  assert(elapsed >= 80 && elapsed < 500, `sleep(100) took ${elapsed}ms (expected ~100)`);

  // ab / evalJSON / scrollLoad — these need CDP, test they don't crash without it
  if (!LIVE) {
    // ab should not throw even if no CDP
    try {
      cdp.ab(19999, "open", "https://example.com"); // non-existent port
      assert(true, "ab() does not throw on connection failure");
    } catch (err) {
      assert(false, `ab() threw: ${err.message}`);
    }

    // evalJSON should return null on failure
    try {
      const result = cdp.evalJSON(19999, "1+1");
      assert(result === null, "evalJSON returns null on connection failure");
    } catch (err) {
      assert(false, `evalJSON threw: ${err.message}`);
    }

    // scrollLoad should not throw
    try {
      cdp.scrollLoad(19999, 1);
      assert(true, "scrollLoad() does not throw on connection failure");
    } catch (err) {
      assert(false, `scrollLoad threw: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// T4: SKILL.md 中引用的相对路径文件存在
// ---------------------------------------------------------------------------

function testT4() {
  section("T4: SKILL.md 引用文件存在");

  const skills = fs.readdirSync(SKILLS_DIR).filter((d) =>
    fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
  );

  for (const skill of skills) {
    const skillDir = path.join(SKILLS_DIR, skill);
    const skillMd = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;

    const content = fs.readFileSync(skillMd, "utf-8");
    // Match [text](relative/path) but skip http:// and https:// links
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const link = match[2];
      if (link.startsWith("http://") || link.startsWith("https://")) continue;
      // Resolve relative to skill directory
      const resolved = path.resolve(skillDir, link);
      assert(fs.existsSync(resolved), `[${skill}] link exists: ${link}`);
    }
  }
}

// ---------------------------------------------------------------------------
// T5: 所有 require() 依赖链解析正确
// ---------------------------------------------------------------------------

function testT5() {
  section("T5: require() 依赖链");

  // Test that each scraper can load its cdp-utils dependency
  const scrapers = [
    { skill: "story-long-scan", scripts: [
      "qidian-rank-scraper.js", "fanqie-rank-scraper.js", "qimao-rank-scraper.js",
      "jjwxc-rank-scraper.js", "ciweimao-rank-scraper.js"
    ]},
    { skill: "story-short-scan", scripts: [
      "heiyan-booklist-scraper.js", "dz-browse-scraper.js"
    ]},
  ];

  for (const { skill, scripts } of scrapers) {
    for (const script of scripts) {
      const scriptPath = path.join(SKILLS_DIR, skill, "scripts", script);
      const content = fs.readFileSync(scriptPath, "utf-8");

      // Check it requires ./cdp-utils
      assert(content.includes('require("./cdp-utils")') || content.includes("require('./cdp-utils')"),
        `${script} requires ./cdp-utils`);

      // Verify the chain resolves: script -> local cdp-utils -> shared cdp-utils -> cdp-helper.mjs
      const localCdpUtils = path.join(SKILLS_DIR, skill, "scripts", "cdp-utils.js");
      assert(fs.existsSync(localCdpUtils), `${skill}/scripts/cdp-utils.js exists`);

      const localContent = fs.readFileSync(localCdpUtils, "utf-8");
      assert(localContent.includes("shared/scripts/cdp-utils.js"),
        `${skill}/scripts/cdp-utils.js delegates to shared`);

      const sharedCdpUtils = path.join(SHARED_DIR, "scripts", "cdp-utils.js");
      assert(fs.existsSync(sharedCdpUtils), "shared/scripts/cdp-utils.js exists");

      const sharedContent = fs.readFileSync(sharedCdpUtils, "utf-8");
      assert(sharedContent.includes("cdp-helper.mjs"),
        "shared/cdp-utils.js references cdp-helper.mjs");

      const helperPath = path.join(SHARED_DIR, "scripts", "cdp-helper.mjs");
      assert(fs.existsSync(helperPath), "shared/scripts/cdp-helper.mjs exists");
    }
  }
}

// ---------------------------------------------------------------------------
// T6: 所有 .md 参考文件可读取且非空
// ---------------------------------------------------------------------------

function testT6() {
  section("T6: 参考文件非空");

  function walkMd(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkMd(full));
      } else if (entry.name.endsWith(".md")) {
        results.push(full);
      }
    }
    return results;
  }

  const mdFiles = walkMd(CLAUDE_DIR);
  for (const f of mdFiles) {
    const rel = path.relative(CLAUDE_DIR, f);
    const stat = fs.statSync(f);
    assert(stat.size > 0, `${rel} is non-empty (${stat.size} bytes)`);
  }
}

// ---------------------------------------------------------------------------
// T7: cdp-helper.mjs 语法正确
// ---------------------------------------------------------------------------

function testT7() {
  section("T7: cdp-helper.mjs");

  const helperPath = path.join(SHARED_DIR, "scripts", "cdp-helper.mjs");
  const content = fs.readFileSync(helperPath, "utf-8");

  assert(content.includes("async function"), "cdp-helper.mjs contains async functions");
  assert(content.includes("WebSocket"), "cdp-helper.mjs uses WebSocket");
  assert(content.includes("fetch("), "cdp-helper.mjs uses fetch");
  assert(content.includes("Runtime.evaluate"), "cdp-helper.mjs sends Runtime.evaluate");
  assert(content.includes("Page.navigate"), "cdp-helper.mjs sends Page.navigate");
  assert(content.includes("addEventListener"), "cdp-helper.mjs uses addEventListener (not on*)");
  assert(!content.includes("ws.onopen"), "cdp-helper.mjs does NOT use ws.onopen (Node v22 compat)");
  assert(!content.includes("ws.onmessage"), "cdp-helper.mjs does NOT use ws.onmessage");

  // Syntax check with node --check
  const { execSync } = require("child_process");
  try {
    execSync(`node --check "${helperPath}"`, { encoding: "utf-8", timeout: 5000 });
    assert(true, "cdp-helper.mjs syntax OK");
  } catch (err) {
    assert(false, `cdp-helper.mjs syntax error: ${err.stderr?.substring(0, 200)}`);
  }

  // Test that it runs and shows usage
  try {
    execSync(`node "${helperPath}"`, { encoding: "utf-8", timeout: 5000 });
    assert(false, "cdp-helper.mjs should exit with error when no command given");
  } catch (err) {
    assert(err.status === 1, "cdp-helper.mjs exits with code 1 when no command");
    assert(err.stderr.includes("Usage"), "cdp-helper.mjs shows Usage on error");
  }
}

// ---------------------------------------------------------------------------
// T8: setup_cdp_windows.ps1 文件存在且编码正确
// ---------------------------------------------------------------------------

function testT8() {
  section("T8: setup_cdp_windows.ps1");

  const ps1Path = path.join(SKILLS_DIR, "browser-cdp", "scripts", "setup_cdp_windows.ps1");
  assert(fs.existsSync(ps1Path), "setup_cdp_windows.ps1 exists");

  const buf = fs.readFileSync(ps1Path);
  // Check UTF-8 BOM (EF BB BF)
  assert(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf,
    "setup_cdp_windows.ps1 has UTF-8 BOM encoding");

  const content = buf.toString("utf-8");
  assert(content.includes("remote-debugging-port"), "Contains --remote-debugging-port");
  assert(content.includes("msedge.exe") || content.includes("Edge"), "References Edge browser");
  assert(content.includes("chrome.exe") || content.includes("Chrome"), "References Chrome browser");
  assert(content.includes("json/version"), "Checks CDP /json/version endpoint");
  assert(content.includes("$Port"), "Accepts port parameter");

  // Must check 64-bit Edge path (Windows 11 default)
  assert(content.includes("Program Files\\Microsoft\\Edge"),
    "setup_cdp_windows.ps1 checks 64-bit Edge path (Program Files, not x86)");
  // Must also have 32-bit fallback
  assert(content.includes("Program Files (x86)\\Microsoft\\Edge"),
    "setup_cdp_windows.ps1 has 32-bit Edge fallback path");

  // Start-Process should pass array, not joined string
  assert(!content.includes("-join"),
    "setup_cdp_windows.ps1 passes ArgumentList as array (not -join string)");

  // Syntax check by writing a temp .ps1 that sources the script
  const { execFileSync } = require("child_process");
  const tmpPs1 = path.join(require("os").tmpdir(), `test-syntax-${Date.now()}.ps1`);
  fs.writeFileSync(tmpPs1, `$null = [System.Management.Automation.PSParser]::Tokenize((Get-Content -Path '${ps1Path}' -Raw), [ref]$null)\nWrite-Host 'OK'\n`, "utf-8");
  try {
    const result = execFileSync("powershell", [
      "-ExecutionPolicy", "Bypass",
      "-NoProfile",
      "-File", tmpPs1,
    ], { encoding: "utf-8", timeout: 10000 });
    assert(result.trim() === "OK", "setup_cdp_windows.ps1 PowerShell syntax OK");
  } catch (err) {
    assert(false, `setup_cdp_windows.ps1 syntax error: ${(err.stderr || "").substring(0, 300)}`);
  } finally {
    try { fs.unlinkSync(tmpPs1); } catch (_) {}
  }
}

// ---------------------------------------------------------------------------
// T9: 所有 scraper 脚本 CLI 解析不崩溃
// ---------------------------------------------------------------------------

function testT9() {
  section("T9: Scraper CLI 解析");

  const { execSync } = require("child_process");

  const scrapers = [
    { path: path.join(SKILLS_DIR, "story-long-scan", "scripts", "qidian-rank-scraper.js"),
      args: "--port 19999 --type hotsales", expectExit: 0 },
    { path: path.join(SKILLS_DIR, "story-long-scan", "scripts", "fanqie-rank-scraper.js"),
      args: "--port 19999 --channel 1 --type 2", expectExit: 0 },
    { path: path.join(SKILLS_DIR, "story-long-scan", "scripts", "qimao-rank-scraper.js"),
      args: "--port 19999 --channel male --type hot", expectExit: 0 },
    { path: path.join(SKILLS_DIR, "story-long-scan", "scripts", "jjwxc-rank-scraper.js"),
      args: "--port 19999 --type 12", expectExit: 0 },
    { path: path.join(SKILLS_DIR, "story-long-scan", "scripts", "ciweimao-rank-scraper.js"),
      args: "--port 19999 --type click", expectExit: 0 },
    { path: path.join(SKILLS_DIR, "story-short-scan", "scripts", "heiyan-booklist-scraper.js"),
      args: "--port 19999 --pages 1", expectExit: 0 },
    { path: path.join(SKILLS_DIR, "story-short-scan", "scripts", "dz-browse-scraper.js"),
      args: "--port 19999 --channel male", expectExit: 0 },
  ];

  for (const s of scrapers) {
    const name = path.basename(s.path);
    try {
      execSync(`node "${s.path}" ${s.args}`, {
        encoding: "utf-8",
        timeout: 15000,
      });
      assert(true, `${name} runs without crash (exit 0, no CDP)`);
    } catch (err) {
      // Even if CDP fails, it should exit cleanly (code 0) not crash
      assert(err.status === 0, `${name} exits cleanly (got code ${err.status})`);
    }
  }
}

// ---------------------------------------------------------------------------
// T10: 跨技能引用一致性
// ---------------------------------------------------------------------------

function testT10() {
  section("T10: 跨技能引用一致性");

  const skillNames = fs.readdirSync(SKILLS_DIR).filter((d) =>
    fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
  );

  // All SKILL.md references to /command should correspond to a real skill
  const validCommands = skillNames.map((s) => `/${s}`);

  for (const skill of skillNames) {
    const skillMd = path.join(SKILLS_DIR, skill, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;

    const content = fs.readFileSync(skillMd, "utf-8");

    // Find all /story-* or /browser-* commands
    const cmdRegex = /\/(story-[a-z-]+|browser-cdp)/g;
    let match;
    while ((match = cmdRegex.exec(content)) !== null) {
      const cmd = "/" + match[1];
      // Skip if it's in a code block or comment
      const before = content.substring(Math.max(0, match.index - 20), match.index);
      if (before.includes("```") || before.includes("//") || before.includes("<!--")) continue;

      assert(validCommands.includes(cmd) || ["/browser-cdp"].includes(cmd),
        `[${skill}] references existing command: ${cmd}`);
    }
  }
}

// ---------------------------------------------------------------------------
// T15: setup_cdp_chrome.sh 存在且使用标准 macOS 路径
// ---------------------------------------------------------------------------

function testT15() {
  section("T15: setup_cdp_chrome.sh macOS 路径");

  const shPath = path.join(SKILLS_DIR, "browser-cdp", "scripts", "setup_cdp_chrome.sh");
  assert(fs.existsSync(shPath), "setup_cdp_chrome.sh exists");

  const content = fs.readFileSync(shPath, "utf-8");

  // Must reference macOS Chrome path
  assert(content.includes("/Applications/Google Chrome.app"),
    "setup_cdp_chrome.sh references /Applications/Google Chrome.app");

  // Must reference macOS Chrome profile path
  assert(content.includes("$HOME/Library/Application Support/Google/Chrome"),
    "setup_cdp_chrome.sh references macOS Chrome profile path");

  // Must reference debug profile directory
  assert(content.includes("chrome-debug-profile"),
    "setup_cdp_chrome.sh references chrome-debug-profile");

  // Must use --remote-debugging-port
  assert(content.includes("--remote-debugging-port"),
    "setup_cdp_chrome.sh uses --remote-debugging-port");

  // Must check CDP /json/version endpoint
  assert(content.includes("/json/version"),
    "setup_cdp_chrome.sh checks /json/version endpoint");

  // Must accept port parameter
  assert(content.includes("CDP_PORT") || content.includes("$1"),
    "setup_cdp_chrome.sh accepts port parameter");

  // Must have set -e for safety
  assert(content.includes("set -e"),
    "setup_cdp_chrome.sh has 'set -e'");

  // Must have shebang
  assert(content.startsWith("#!/bin/bash"),
    "setup_cdp_chrome.sh starts with #!/bin/bash");
}

// ---------------------------------------------------------------------------
// T16: 所有 SKILL.md 平台指令同时覆盖 macOS 和 Windows
// ---------------------------------------------------------------------------

function testT16() {
  section("T16: SKILL.md 双平台覆盖");

  const skills = fs.readdirSync(SKILLS_DIR).filter((d) =>
    fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
  );

  for (const skill of skills) {
    const skillMd = path.join(SKILLS_DIR, skill, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;

    const content = fs.readFileSync(skillMd, "utf-8");
    const hasBashBlock = /```bash/.test(content);
    const hasPsBlock = /```powershell/.test(content);

    // If skill has bash code blocks, it should also have PowerShell or be clearly macOS-only
    if (hasBashBlock) {
      // Skills with platform-specific code must provide both platforms
      assert(hasPsBlock || content.includes("Windows"),
        `[${skill}] has bash blocks — must also mention Windows or have PowerShell blocks`);
    }

    // browser-cdp must cover both platforms in setup section
    if (skill === "browser-cdp") {
      assert(content.includes("macOS"), "[browser-cdp] mentions macOS");
      assert(content.includes("Windows"), "[browser-cdp] mentions Windows");
      assert(content.includes("setup_cdp_chrome.sh"), "[browser-cdp] references setup_cdp_chrome.sh");
      assert(content.includes("setup_cdp_windows.ps1"), "[browser-cdp] references setup_cdp_windows.ps1");
    }

    // story-cover must have both bash and PowerShell API calls
    if (skill === "story-cover") {
      assert(hasBashBlock, `[${skill}] has bash code blocks`);
      assert(hasPsBlock, `[${skill}] has PowerShell code blocks`);
    }

    // Scraping skills must reference both setup scripts
    if (skill === "story-long-scan" || skill === "story-short-scan") {
      assert(content.includes("Windows"), `[${skill}] mentions Windows`);
      assert(content.includes("macOS") || content.includes("bash"), `[${skill}] mentions macOS/bash`);
      assert(content.includes("setup_cdp_windows.ps1"), `[${skill}] references setup_cdp_windows.ps1`);
    }
  }
}

// ---------------------------------------------------------------------------
// T17: cdp-helper.mjs 和 cdp-utils.js 仅使用跨平台 Node.js API
// ---------------------------------------------------------------------------

function testT17() {
  section("T17: 跨平台 API 检查");

  const helperPath = path.join(SHARED_DIR, "scripts", "cdp-helper.mjs");
  const utilsPath = path.join(SHARED_DIR, "scripts", "cdp-utils.js");

  const helperContent = fs.readFileSync(helperPath, "utf-8");
  const utilsContent = fs.readFileSync(utilsPath, "utf-8");

  // Allowed Node.js built-in modules (all cross-platform)
  const allowedModules = ["fs", "path", "os", "child_process"];

  // Check cdp-helper.mjs imports only use allowed modules or are built-in globals
  // cdp-helper.mjs uses top-level await import("fs") — that's fine
  const helperImports = helperContent.match(/import\s+.*?\s+from\s+["']([^"']+)["']/g) || [];
  const helperRequire = helperContent.match(/require\s*\(\s*["']([^"']+)["']\s*\)/g) || [];
  const helperDynamicImport = helperContent.match(/import\s*\(\s*["']([^"']+)["']\s*\)/g) || [];

  // Check that all module references are from allowed set
  const allModuleRefs = [...helperImports, ...helperRequire, ...helperDynamicImport];
  for (const ref of allModuleRefs) {
    const modName = ref.match(/["']([^"']+)["']/)?.[1];
    if (modName && !modName.startsWith(".") && !allowedModules.includes(modName)) {
      assert(false, `cdp-helper.mjs uses non-cross-platform module: ${modName}`);
    }
  }
  assert(true, "cdp-helper.mjs module imports are cross-platform");

  // Check cdp-utils.js requires only use allowed modules
  const utilsRequires = utilsContent.match(/require\s*\(\s*["']([^"']+)["']\s*\)/g) || [];
  for (const ref of utilsRequires) {
    const modName = ref.match(/["']([^"']+)["']/)?.[1];
    if (modName && !modName.startsWith(".") && !allowedModules.includes(modName)) {
      assert(false, `cdp-utils.js uses non-cross-platform module: ${modName}`);
    }
  }
  assert(true, "cdp-utils.js module requires are cross-platform");

  // Must NOT use platform-specific APIs
  const forbiddenPatterns = [
    { pattern: /process\.platform\s*===?\s*["']win/, desc: "platform check (win)" },
    { pattern: /process\.platform\s*===?\s*["']darwin/, desc: "platform check (darwin)" },
    { pattern: /process\.platform\s*===?\s*["']linux/, desc: "platform check (linux)" },
    { pattern: /[\\/]windows[\\/]|[\\/]macos[\\/]|[\\/]darwin[\\/]/i, desc: "platform-specific path" },
  ];

  for (const src of [
    { name: "cdp-helper.mjs", content: helperContent },
    { name: "cdp-utils.js", content: utilsContent },
  ]) {
    for (const { pattern, desc } of forbiddenPatterns) {
      assert(!pattern.test(src.content),
        `${src.name} does not use ${desc}`);
    }
  }

  // Must use cross-platform path joining (path.join, not hardcoded slashes)
  assert(utilsContent.includes("path.join("),
    "cdp-utils.js uses path.join() for paths");

  // Must use os.tmpdir() for temp files (not hardcoded /tmp)
  assert(utilsContent.includes("os.tmpdir()"),
    "cdp-utils.js uses os.tmpdir() for temp directory");

  // cdp-helper.mjs uses only built-in fetch and WebSocket (Node.js v22+)
  assert(helperContent.includes("fetch(") && helperContent.includes("WebSocket"),
    "cdp-helper.mjs uses built-in fetch + WebSocket");
}

// ---------------------------------------------------------------------------
// T18: setup_cdp_chrome.sh 具有有效 bash 结构
// ---------------------------------------------------------------------------

function testT18() {
  section("T18: setup_cdp_chrome.sh bash 结构");

  const shPath = path.join(SKILLS_DIR, "browser-cdp", "scripts", "setup_cdp_chrome.sh");
  const content = fs.readFileSync(shPath, "utf-8");

  // Must have proper quoting (variables in double quotes)
  const varRefs = content.match(/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/g) || [];
  let unquotedVars = 0;
  const lines = content.split("\n");
  for (const line of lines) {
    // Skip comments and echo lines (echo "$VAR" is fine)
    if (line.trim().startsWith("#")) continue;
    // Check that variable expansions in arguments are quoted
    // This is a heuristic check, not exhaustive
    if (/\$\{CDP_PORT\}/.test(line) && !line.includes('"') && !line.includes("'")) {
      // $CDP_PORT used without quotes — check context
      if (line.includes("lsof") || line.includes("curl")) {
        // These commands are fine with unquoted vars in args
        continue;
      }
      unquotedVars++;
    }
  }
  assert(unquotedVars === 0,
    "setup_cdp_chrome.sh has no obviously unquoted variables");

  // Must have error handling
  assert(content.includes("exit 1"),
    "setup_cdp_chrome.sh has exit 1 on failure");

  // Must have process kill step
  assert(content.includes("pkill") || content.includes("kill"),
    "setup_cdp_chrome.sh kills existing Chrome processes");

  // Must NOT use pkill -f (too broad, matches full command line)
  assert(!content.includes("pkill -f"),
    "setup_cdp_chrome.sh uses pkill without -f (narrow process matching)");

  // Should use pgrep for process counting (not ps aux | grep hack)
  assert(content.includes("pgrep"),
    "setup_cdp_chrome.sh uses pgrep for process counting");

  // Must have wait/retry loop for CDP startup
  assert(content.includes("sleep") && (content.includes("for") || content.includes("while") || content.includes("seq")),
    "setup_cdp_chrome.sh has wait loop with sleep");

  // Must have profile copy step with permission preservation (-a flag)
  assert(content.includes("cp -a"),
    "setup_cdp_chrome.sh copies profile with cp -a (preserves permissions)");

  // Cookie refresh should also preserve permissions
  assert(content.includes("cp -pf") || !content.includes("Cookies"),
    "setup_cdp_chrome.sh refreshes cookies with cp -pf (preserves permissions)");

  // Must have startup verification (checks CDP responds)
  assert(content.includes("json/version") && content.includes("curl"),
    "setup_cdp_chrome.sh verifies CDP endpoint after startup");

  // Must not use any Windows-specific commands
  const windowsCmds = ["powershell", "cmd.exe", "Start-Process", "reg ", "$env:", "Out-File"];
  for (const cmd of windowsCmds) {
    assert(!content.includes(cmd),
      `setup_cdp_chrome.sh does not contain Windows command: ${cmd}`);
  }
}

// ---------------------------------------------------------------------------
// T19: 路径引用一致性 — 不允许 <browser-cdp skill> 占位符
// ---------------------------------------------------------------------------

function testT19() {
  section("T19: 路径引用一致性");

  function walkFiles(dir, ext) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkFiles(full, ext));
      } else if (entry.name.endsWith(ext)) {
        results.push(full);
      }
    }
    return results;
  }

  const allFiles = [...walkFiles(CLAUDE_DIR, ".md"), ...walkFiles(CLAUDE_DIR, ".js")];

  for (const f of allFiles) {
    const rel = path.relative(CLAUDE_DIR, f);
    const content = fs.readFileSync(f, "utf-8");

    // No <browser-cdp skill> placeholder — must use {SKILL_DIR}/../browser-cdp/
    assert(!content.includes("<browser-cdp skill>"),
      `${rel}: no "<browser-cdp skill>" placeholder (use {SKILL_DIR}/../browser-cdp/)`);
  }

  // Verify all Windows CDP setup references use consistent {SKILL_DIR} format
  const skillsWithCdp = ["story-long-scan", "story-short-scan"];
  for (const skill of skillsWithCdp) {
    const skillMd = path.join(SKILLS_DIR, skill, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;

    const content = fs.readFileSync(skillMd, "utf-8");

    // Extract Windows setup line
    const psMatch = content.match(/powershell.*setup_cdp_windows\.ps1/);
    if (psMatch) {
      assert(psMatch[0].includes("{SKILL_DIR}"),
        `[${skill}] Windows CDP path uses {SKILL_DIR} variable`);
    }
  }
}

// ---------------------------------------------------------------------------
// T20: Reference 文件无平台特定命令
// ---------------------------------------------------------------------------

function testT20() {
  section("T20: Reference 文件无平台命令");

  function walkMd(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkMd(full));
      } else if (entry.name.endsWith(".md")) {
        results.push(full);
      }
    }
    return results;
  }

  const refDir = path.join(CLAUDE_DIR, "skills");
  const mdFiles = walkMd(refDir).filter((f) => f.includes(path.sep + "references" + path.sep));

  const platformCmds = [
    { pattern: /```bash/, desc: "bash code block" },
    { pattern: /```powershell/, desc: "powershell code block" },
    { pattern: /```shell/, desc: "shell code block" },
    { pattern: /\bcurl\s/, desc: "curl command" },
    { pattern: /\bjq\s/, desc: "jq command" },
    { pattern: /\bsed\s/, desc: "sed command" },
    { pattern: /\bawk\s/, desc: "awk command" },
    { pattern: /\bgrep\s/, desc: "grep command" },
    { pattern: /mkdir\s+-p/, desc: "unix mkdir -p" },
    { pattern: /\/tmp\//, desc: "/tmp/ path" },
    { pattern: /~\/\.claude\//, desc: "~/.claude/ path" },
  ];

  let totalChecked = 0;
  for (const f of mdFiles) {
    const rel = path.relative(CLAUDE_DIR, f);
    const content = fs.readFileSync(f, "utf-8");
    totalChecked++;

    for (const { pattern, desc } of platformCmds) {
      assert(!pattern.test(content),
        `${rel}: no ${desc} in reference file`);
    }
  }

  assert(totalChecked > 30, `Checked ${totalChecked} reference files (expect > 30)`);
}

// ---------------------------------------------------------------------------
// T21: 所有 scraper 脚本内部使用跨平台 API
// ---------------------------------------------------------------------------

function testT21() {
  section("T21: Scraper 跨平台 API 审计");

  const scrapers = [
    "skills/story-long-scan/scripts/qidian-rank-scraper.js",
    "skills/story-long-scan/scripts/fanqie-rank-scraper.js",
    "skills/story-long-scan/scripts/qimao-rank-scraper.js",
    "skills/story-long-scan/scripts/jjwxc-rank-scraper.js",
    "skills/story-long-scan/scripts/ciweimao-rank-scraper.js",
    "skills/story-short-scan/scripts/heiyan-booklist-scraper.js",
    "skills/story-short-scan/scripts/dz-browse-scraper.js",
  ];

  const forbiddenPatterns = [
    { pattern: /process\.platform/, desc: "process.platform check" },
    { pattern: /\/tmp\//, desc: "hardcoded /tmp/ path" },
    { pattern: /~\//, desc: "hardcoded ~/ path" },
    { pattern: /C:\\/, desc: "hardcoded Windows path" },
    { pattern: /execSync\s*\(\s*["']bash/, desc: "bash subprocess call" },
    { pattern: /execSync\s*\(\s*["']sh\s/, desc: "sh subprocess call" },
    { pattern: /execSync\s*\(\s*["']powershell/, desc: "powershell subprocess call" },
  ];

  for (const rel of scrapers) {
    const abs = path.join(CLAUDE_DIR, rel);
    const content = fs.readFileSync(abs, "utf-8");
    const name = path.basename(rel);

    // Must use path.join for file paths (not hardcoded separators)
    assert(content.includes("path.join(") || !content.includes("writeFileSync"),
      `${name}: uses path.join() for file operations`);

    // Must require ./cdp-utils
    assert(content.includes('require("./cdp-utils")') || content.includes("require('./cdp-utils')"),
      `${name}: requires ./cdp-utils`);

    // No forbidden patterns
    for (const { pattern, desc } of forbiddenPatterns) {
      assert(!pattern.test(content),
        `${name}: no ${desc}`);
    }

    // Must use fs.writeFileSync for output (cross-platform)
    assert(content.includes("fs.writeFileSync"),
      `${name}: uses fs.writeFileSync for output`);

    // Must construct output filename with date
    assert(content.includes("toISOString") || content.includes("Date"),
      `${name}: uses Date for output filename`);
  }
}

// ---------------------------------------------------------------------------
// T22: 运行时验证 — safeStr, evalJSON 解析链, 中文文件名
// ---------------------------------------------------------------------------

function testT22() {
  section("T22: 运行时功能验证");

  const cdp = require(path.join(SHARED_DIR, "scripts", "cdp-utils.js"));
  const os = require("os");

  // --- safeStr produces valid JS string literals ---
  const safeStrTests = [
    { input: "hello", expected: '"hello"' },
    { input: 'test "world"', expected: '"test \\"world\\""' },
    { input: "line1\nline2", expected: '"line1\\nline2"' },
    { input: "男频", expected: '"男频"' },
    { input: "完结·连载", expected: '"完结·连载"' },
    { input: 42, expected: '"42"' },
    { input: "", expected: '""' },
  ];

  for (const { input, expected } of safeStrTests) {
    const result = cdp.safeStr(input);
    assert(result === expected,
      `safeStr(${JSON.stringify(input)}) === ${expected}`);
    // Verify result evaluates correctly
    try {
      const evaluated = new Function("return " + result)();
      assert(evaluated === String(input),
        `safeStr(${JSON.stringify(input)}) evaluates correctly`);
    } catch (e) {
      assert(false, `safeStr result not valid JS: ${e.message}`);
    }
  }

  // --- JS injection patterns compile ---
  const tab = "男频";
  const js1 = "JSON.stringify((()=>{" +
    "var el=Array.from(document.querySelectorAll('*')).find(function(e){return e.textContent.trim()===" + cdp.safeStr(tab) + "});" +
    "if(el){el.click();return true}return false" +
    "})())";
  try { new Function(js1); assert(true, "safeStr concat produces valid JS"); }
  catch (e) { assert(false, `safeStr concat invalid: ${e.message}`); }

  // --- evalJSON parse chain ---
  function simulateParse(cdpJson) {
    const r = JSON.parse(cdpJson);
    const v = r?.result?.result?.value;
    if (v === undefined || v === null) return null;
    return JSON.parse(v);
  }

  const mockData = [
    { rank: 1, title: "斗破苍穹", score: "9.5分" },
    { rank: 2, title: "遮天", score: "9.3分" },
  ];
  const cdpResp = JSON.stringify({ result: { result: { type: "string", value: JSON.stringify(mockData) } } });
  const parsed = simulateParse(cdpResp);
  assert(parsed !== null && Array.isArray(parsed), "evalJSON parse: returns array");
  assert(parsed.length === 2, "evalJSON parse: correct length");
  assert(parsed[0].title === "斗破苍穹", "evalJSON parse: Chinese title correct");
  assert(parsed[0].score === "9.5分", "evalJSON parse: score field correct");

  const nullResp = JSON.stringify({ result: { result: { type: "undefined" } } });
  assert(simulateParse(nullResp) === null, "evalJSON parse: null for undefined");

  // --- Chinese output filename creation ---
  const tmpDir = path.join(os.tmpdir(), "scraper-rt-" + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const filenames = [
    "起点畅销榜_20260502.md", "番茄男频阅读榜_全题材_20260502.md",
    "七猫男频大热榜_20260502.md", "黑岩书库列表_20260502.md",
    "点众男频短篇_20260502.md", "刺猬猫点击榜_20260502.md",
    "晋江收入金榜_全站_20260502.md",
  ];

  for (const fn of filenames) {
    const fp = path.join(tmpDir, fn);
    try {
      fs.writeFileSync(fp, "# test", "utf-8");
      assert(fs.existsSync(fp), `Chinese filename OK: ${fn}`);
      fs.unlinkSync(fp);
    } catch (e) {
      assert(false, `Chinese filename FAIL: ${fn}: ${e.message}`);
    }
  }
  try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}

  // --- Scraper JS pattern verification ---
  const scraperFiles = [
    "skills/story-long-scan/scripts/qidian-rank-scraper.js",
    "skills/story-long-scan/scripts/fanqie-rank-scraper.js",
    "skills/story-long-scan/scripts/qimao-rank-scraper.js",
    "skills/story-long-scan/scripts/jjwxc-rank-scraper.js",
    "skills/story-long-scan/scripts/ciweimao-rank-scraper.js",
    "skills/story-short-scan/scripts/heiyan-booklist-scraper.js",
    "skills/story-short-scan/scripts/dz-browse-scraper.js",
  ];

  for (const rel of scraperFiles) {
    const src = fs.readFileSync(path.join(CLAUDE_DIR, rel), "utf-8");
    const name = path.basename(rel);

    // Must have ab(), sleep(), evalJSON() calls
    assert(/\bab\s*\(/.test(src), `${name}: calls ab()`);
    assert(/\bsleep\s*\(/.test(src), `${name}: calls sleep()`);
    assert(/evalJSON\s*\(/.test(src), `${name}: calls evalJSON()`);

    // All JS injection strings using JSON.stringify pattern
    const injections = src.match(/JSON\.stringify\(\(\(\)=>\{/g) || [];
    assert(injections.length >= 1, `${name}: has ${injections.length} JS injection blocks`);
  }

  // --- cdp-helper.mjs format contract ---
  const helperSrc = fs.readFileSync(path.join(SHARED_DIR, "scripts", "cdp-helper.mjs"), "utf-8");
  assert(helperSrc.includes("returnByValue: true"), "cdp-helper uses returnByValue for value extraction");
  assert(helperSrc.includes("JSON.stringify(result)"), "cdp-helper JSON.stringifies CDP result");
}

// ---------------------------------------------------------------------------
// T-LIVE: CDP 连接测试 (仅 --live 模式)
// ---------------------------------------------------------------------------

function testLive() {
  if (!LIVE) {
    section("T-LIVE: CDP 连接测试 (SKIPPED, use --live)");
    skip("CDP live tests (use --live flag)");
    return;
  }

  section("T-LIVE: CDP 连接测试");

  const { execSync, execFileSync } = require("child_process");
  const cdp = require(path.join(SHARED_DIR, "scripts", "cdp-utils.js"));
  const helperPath = path.join(SHARED_DIR, "scripts", "cdp-helper.mjs");

  // Test 1: CDP endpoint responds
  try {
    const resp = execSync(`node -e "fetch('http://127.0.0.1:${PORT}/json/version').then(r=>r.text()).then(t=>console.log(t))"`, {
      encoding: "utf-8", timeout: 5000,
    });
    assert(resp.includes("Browser"), `CDP /json/version responds (port ${PORT})`);
  } catch (err) {
    assert(false, `CDP endpoint not responding on port ${PORT}: ${err.message}`);
    return; // Skip remaining live tests
  }

  // Test 2: cdp-helper.mjs eval
  const tmpFile = path.join(require("os").tmpdir(), `test-eval-${Date.now()}.js`);
  fs.writeFileSync(tmpFile, "document.title", "utf-8");
  try {
    const result = execFileSync("node", [helperPath, "eval", PORT, tmpFile], {
      encoding: "utf-8", timeout: 10000,
    });
    const parsed = JSON.parse(result);
    assert(parsed.result?.result?.type === "string",
      "cdp-helper eval returns string result");
  } catch (err) {
    assert(false, `cdp-helper eval failed: ${err.stderr?.substring(0, 200) || err.message}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }

  // Test 3: cdp-helper.mjs open
  try {
    const result = execFileSync("node", [helperPath, "open", PORT, "https://example.com"], {
      encoding: "utf-8", timeout: 10000,
    });
    assert(result.includes("frameId") || result.includes("id"),
      "cdp-helper open returns CDP response");
  } catch (err) {
    assert(false, `cdp-helper open failed: ${err.stderr?.substring(0, 200) || err.message}`);
  }

  // Test 4: cdp-helper.mjs scroll
  try {
    const result = execFileSync("node", [helperPath, "scroll", PORT, "2"], {
      encoding: "utf-8", timeout: 15000,
    });
    assert(result.includes("scrolled"),
      "cdp-helper scroll returns scrolled count");
  } catch (err) {
    assert(false, `cdp-helper scroll failed: ${err.stderr?.substring(0, 200) || err.message}`);
  }

  // Test 5: cdp-utils.js evalJSON
  const evalResult = cdp.evalJSON(PORT, "JSON.stringify({test:true})");
  assert(evalResult?.test === true, "cdp-utils evalJSON returns parsed object");

  // Test 6: cdp-utils.js ab
  try {
    cdp.ab(PORT, "open", "https://example.com");
    assert(true, "cdp-utils ab() succeeds");
  } catch (err) {
    assert(false, `cdp-utils ab() failed: ${err.message}`);
  }

  // Test 7: cdp-utils.js scrollLoad
  try {
    cdp.scrollLoad(PORT, 1);
    assert(true, "cdp-utils scrollLoad() succeeds");
  } catch (err) {
    assert(false, `cdp-utils scrollLoad() failed: ${err.message}`);
  }

  // Test 8: End-to-end scraper — ciweimao click rank
  const outDir = path.join(__dirname, "output");
  fs.mkdirSync(outDir, { recursive: true });
  const ciweimaoScraper = path.join(SKILLS_DIR, "story-long-scan", "scripts", "ciweimao-rank-scraper.js");
  try {
    const scrapeOut = execFileSync("node", [ciweimaoScraper, "--port", PORT, "--type", "click", "--outdir", outDir], {
      encoding: "utf-8", timeout: 30000,
    });
    assert(scrapeOut.includes("提取"), "ciweimao scraper extracts data");
    assert(scrapeOut.includes("条 →") || scrapeOut.includes("已保存"), "ciweimao scraper saves file");

    // Verify output file exists and has correct format
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const outFile = path.join(outDir, `刺猬猫点击榜_${date}.md`);
    assert(fs.existsSync(outFile), "ciweimao output file exists");
    const content = fs.readFileSync(outFile, "utf-8");
    assert(content.startsWith("# 刺猬猫 ·"), "ciweimao output has correct title");
    assert(content.includes("来源："), "ciweimao output has source URL");
    assert(content.includes("条目数："), "ciweimao output has item count");
    assert(content.includes("## #"), "ciweimao output has ranked entries");
  } catch (err) {
    assert(false, `ciweimao scraper failed: ${(err.stderr || "").substring(0, 300) || err.message}`);
  }

  // Test 9: End-to-end scraper — qidian hotsales
  const qidianScraper = path.join(SKILLS_DIR, "story-long-scan", "scripts", "qidian-rank-scraper.js");
  try {
    const scrapeOut = execFileSync("node", [qidianScraper, "--port", PORT, "--type", "hotsales", "--outdir", outDir], {
      encoding: "utf-8", timeout: 30000,
    });
    assert(scrapeOut.includes("提取"), "qidian scraper extracts data");

    const date2 = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const outFile2 = path.join(outDir, `起点畅销榜_${date2}.md`);
    assert(fs.existsSync(outFile2), "qidian output file exists");
    const content2 = fs.readFileSync(outFile2, "utf-8");
    assert(content2.startsWith("# 起点 ·"), "qidian output has correct title");
    assert(content2.includes("简介"), "qidian output includes descriptions");
  } catch (err) {
    assert(false, `qidian scraper failed: ${(err.stderr || "").substring(0, 300) || err.message}`);
  }

  // Cleanup output directory
  try { fs.rmSync(outDir, { recursive: true }); } catch (_) {}
}

// ---------------------------------------------------------------------------
// T11: SKILL.md Windows 兼容性 — 代码块不能只有 bash 无 PowerShell
// ---------------------------------------------------------------------------

function testT11() {
  section("T11: SKILL.md Windows 兼容性");

  const skills = fs.readdirSync(SKILLS_DIR).filter((d) =>
    fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
  );

  for (const skill of skills) {
    const skillMd = path.join(SKILLS_DIR, skill, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;

    const content = fs.readFileSync(skillMd, "utf-8");

    // Check that if a SKILL.md has bash code blocks, it either:
    // (a) also has powershell code blocks, OR
    // (b) is purely instructional (no shell commands), OR
    // (c) is in a macOS-only section clearly labeled
    const hasBashBlock = /```bash/.test(content);
    const hasPsBlock = /```powershell/.test(content);
    const hasBashOnlyApi = hasBashBlock && !hasPsBlock && content.includes("curl");

    // story-cover must have PowerShell alternatives for API calls
    if (skill === "story-cover") {
      assert(hasBashBlock, `[${skill}] has bash code blocks`);
      assert(hasPsBlock, `[${skill}] has PowerShell code blocks (Windows compat)`);
    }

    // browser-cdp common operations must have Windows alternatives
    if (skill === "browser-cdp") {
      const opsSection = content.substring(content.indexOf("## 常用操作"));
      assert(opsSection.includes("Windows"), "[browser-cdp] common ops mention Windows");
    }

    // story-long-scan and story-short-scan must have Windows setup instructions
    if (skill === "story-long-scan" || skill === "story-short-scan") {
      assert(content.includes("Windows"), `[${skill}] mentions Windows`);
      assert(content.includes("setup_cdp_windows.ps1"), `[${skill}] references setup_cdp_windows.ps1`);
    }
  }
}

// ---------------------------------------------------------------------------
// T12: 参考文件非重定向（不是符号链接占位符）
// ---------------------------------------------------------------------------

function testT12() {
  section("T12: 参考文件非重定向占位符");

  function walkMd(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkMd(full));
      } else if (entry.name.endsWith(".md")) {
        results.push(full);
      }
    }
    return results;
  }

  const mdFiles = walkMd(CLAUDE_DIR);
  let redirectCount = 0;

  for (const f of mdFiles) {
    const rel = path.relative(CLAUDE_DIR, f);
    const content = fs.readFileSync(f, "utf-8").trim();

    // A redirect file is one that contains ONLY a relative path like ../../xxx/yyy.md
    const isRedirect = /^(\.\.[\\/])+.*\.md$/.test(content) && !content.includes("\n");

    if (isRedirect) {
      redirectCount++;
      assert(false, `${rel} is still a redirect placeholder: "${content.substring(0, 60)}"`);
    }
  }

  if (redirectCount === 0) {
    assert(true, "No redirect placeholder files found");
  }
}

// ---------------------------------------------------------------------------
// T13: story-cover API 调用有 PowerShell 等价命令
// ---------------------------------------------------------------------------

function testT13() {
  section("T13: story-cover PowerShell API");

  const coverMd = path.join(SKILLS_DIR, "story-cover", "SKILL.md");
  if (!fs.existsSync(coverMd)) {
    skip("story-cover SKILL.md not found");
    return;
  }

  const content = fs.readFileSync(coverMd, "utf-8");

  // Must have Invoke-RestMethod as PowerShell alternative to curl
  assert(content.includes("Invoke-RestMethod"), "story-cover uses Invoke-RestMethod (PowerShell curl)");

  // Must have PowerShell variable syntax, not just bash
  assert(content.includes("$env:GPT_IMAGE_API_KEY") || content.includes("$BaseUrl"),
    "story-cover uses PowerShell variable syntax");

  // Must have base64 decode alternative
  assert(content.includes("FromBase64String") || content.includes("base64"),
    "story-cover has base64 decode (PowerShell or bash)");

  // Must have mkdir alternative
  assert(content.includes("New-Item"), "story-cover uses New-Item (PowerShell mkdir)");
}

// ---------------------------------------------------------------------------
// T14: browser-cdp 常用操作有 Windows/Node.js 代码
// ---------------------------------------------------------------------------

function testT14() {
  section("T14: browser-cdp Windows operations");

  const cdpMd = path.join(SKILLS_DIR, "browser-cdp", "SKILL.md");
  if (!fs.existsSync(cdpMd)) {
    skip("browser-cdp SKILL.md not found");
    return;
  }

  const content = fs.readFileSync(cdpMd, "utf-8");

  // Must have Node.js code alternatives
  assert(content.includes("require(") || content.includes("cdp-utils"),
    "browser-cdp references cdp-utils.js for Windows");

  // Must show evalJSON usage for Windows
  assert(content.includes("evalJSON"), "browser-cdp shows evalJSON for Windows");

  // Common ops section must have both platforms
  const opsSection = content.substring(content.indexOf("## 常用操作"));
  const hasMacOps = opsSection.includes("agent-browser");
  const hasWinOps = opsSection.includes("Windows") || opsSection.includes("Node.js");

  assert(hasMacOps, "browser-cdp shows macOS agent-browser commands");
  assert(hasWinOps, "browser-cdp shows Windows/Node.js alternatives");

  // Windows fallback for killing browser processes
  assert(content.includes("Stop-Process") || content.includes("msedge"),
    "browser-cdp shows Windows process kill command");
}

// ---------------------------------------------------------------------------
// T25: 输出路径规范存在性
// ---------------------------------------------------------------------------

function testT25() {
  section("T25: 输出路径规范存在性");

  const pathSpecs = [
    { skill: "story-long-scan", expectedDir: "scan-data" },
    { skill: "story-short-scan", expectedDir: "scan-data" },
    { skill: "story-long-analyze", expectedDir: "analyze-data" },
    { skill: "story-short-analyze", expectedDir: "analyze-data" },
    { skill: "story-long-write", expectedDir: "novels" },
    { skill: "story-short-write", expectedDir: "novels" },
  ];

  for (const { skill, expectedDir } of pathSpecs) {
    // story-long-write uses lowercase skill.md
    const skillMdUpper = path.join(SKILLS_DIR, skill, "SKILL.md");
    const skillMdLower = path.join(SKILLS_DIR, skill, "skill.md");
    const skillMd = fs.existsSync(skillMdUpper) ? skillMdUpper : skillMdLower;

    if (!fs.existsSync(skillMd)) {
      assert(false, `${skill}/SKILL.md not found`);
      continue;
    }
    const content = fs.readFileSync(skillMd, "utf-8");
    assert(content.includes("输出路径规范"), `${skill} has 输出路径规范 section`);
    assert(content.includes(expectedDir), `${skill} references ${expectedDir}/ directory`);
  }
}

// ---------------------------------------------------------------------------
// T26: 输出基础目录存在
// ---------------------------------------------------------------------------

function testT26() {
  section("T26: 输出基础目录存在");

  const projectRoot = path.resolve(CLAUDE_DIR, "..");
  const dirs = ["scan-data", "analyze-data", "novels"];

  for (const dir of dirs) {
    const full = path.join(projectRoot, dir);
    assert(fs.existsSync(full), `${dir}/ directory exists at project root`);
    assert(fs.statSync(full).isDirectory(), `${dir}/ is a directory`);
  }
}

// ---------------------------------------------------------------------------
// T27: 会话/书籍文件夹命名规范
// ---------------------------------------------------------------------------

function testT27() {
  section("T27: 会话/书籍文件夹命名规范");

  // Scan skills should have YYYYMMDD_HHmm pattern
  const scanSkills = ["story-long-scan", "story-short-scan"];
  for (const skill of scanSkills) {
    const skillMd = path.join(SKILLS_DIR, skill, "SKILL.md");
    const content = fs.readFileSync(skillMd, "utf-8");
    assert(content.includes("YYYYMMDD") && content.includes("HHmm"),
      `${skill} has YYYYMMDD_HHmm datetime format in path spec`);
    assert(content.includes("会话目录") || content.includes("目录命名"),
      `${skill} has session directory naming rules`);
  }

  // Analyze/write skills should use title-based naming under output directory
  const titleSkills = [
    { skill: "story-long-analyze", dir: "analyze-data" },
    { skill: "story-short-analyze", dir: "analyze-data" },
    { skill: "story-long-write", dir: "novels" },
    { skill: "story-short-write", dir: "novels" },
  ];
  for (const { skill, dir } of titleSkills) {
    const skillMdUpper = path.join(SKILLS_DIR, skill, "SKILL.md");
    const skillMdLower = path.join(SKILLS_DIR, skill, "skill.md");
    const skillMd = fs.existsSync(skillMdUpper) ? skillMdUpper : skillMdLower;
    if (!fs.existsSync(skillMd)) {
      assert(false, `${skill}/SKILL.md not found`);
      continue;
    }
    const content = fs.readFileSync(skillMd, "utf-8");
    // Must reference the output directory with a placeholder for the title
    const hasDirRef = content.includes(`${dir}/{`) || content.includes(`${dir}/​{`);
    assert(hasDirRef, `${skill} uses title-based folder naming under ${dir}/`);
  }
}

// ---------------------------------------------------------------------------
// T28: Scraper --outdir 兼容性
// ---------------------------------------------------------------------------

function testT28() {
  section("T28: Scraper --outdir 兼容性");

  const scrapers = [
    "skills/story-long-scan/scripts/qidian-rank-scraper.js",
    "skills/story-long-scan/scripts/fanqie-rank-scraper.js",
    "skills/story-long-scan/scripts/qimao-rank-scraper.js",
    "skills/story-long-scan/scripts/jjwxc-rank-scraper.js",
    "skills/story-long-scan/scripts/ciweimao-rank-scraper.js",
    "skills/story-short-scan/scripts/heiyan-booklist-scraper.js",
    "skills/story-short-scan/scripts/dz-browse-scraper.js",
  ];

  for (const rel of scrapers) {
    const content = fs.readFileSync(path.join(CLAUDE_DIR, rel), "utf-8");
    const name = path.basename(rel);

    assert(content.includes("--outdir"), `${name} supports --outdir parameter`);
    assert(content.includes('getArg') && content.includes("--outdir"),
      `${name} reads --outdir via getArg`);
    assert(content.includes("path.join(") && (content.includes("OUTDIR") || content.includes("outdir")),
      `${name} uses path.join for output path`);
  }
}

// ---------------------------------------------------------------------------
// T29: 跨技能流水线路径一致性
// ---------------------------------------------------------------------------

function testT29() {
  section("T29: 跨技能流水线路径一致性");

  // Both write skills should output to novels/
  for (const skill of ["story-long-write", "story-short-write"]) {
    const skillMdUpper = path.join(SKILLS_DIR, skill, "SKILL.md");
    const skillMdLower = path.join(SKILLS_DIR, skill, "skill.md");
    const skillMd = fs.existsSync(skillMdUpper) ? skillMdUpper : skillMdLower;
    if (!fs.existsSync(skillMd)) continue;
    const content = fs.readFileSync(skillMd, "utf-8");
    assert(content.includes("novels/"), `${skill} outputs to novels/ directory`);
  }

  // Both scan skills should output to scan-data/
  for (const skill of ["story-long-scan", "story-short-scan"]) {
    const skillMd = path.join(SKILLS_DIR, skill, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    const content = fs.readFileSync(skillMd, "utf-8");
    assert(content.includes("scan-data/"), `${skill} outputs to scan-data/ directory`);
  }

  // Both analyze skills should output to analyze-data/
  for (const skill of ["story-long-analyze", "story-short-analyze"]) {
    const skillMd = path.join(SKILLS_DIR, skill, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    const content = fs.readFileSync(skillMd, "utf-8");
    assert(content.includes("analyze-data/"), `${skill} outputs to analyze-data/ directory`);
  }

  // Write skills should know analyze-data exists for 对标/拆文报告 references
  for (const skill of ["story-long-write", "story-short-write"]) {
    const skillMdUpper = path.join(SKILLS_DIR, skill, "SKILL.md");
    const skillMdLower = path.join(SKILLS_DIR, skill, "skill.md");
    const skillMd = fs.existsSync(skillMdUpper) ? skillMdUpper : skillMdLower;
    if (!fs.existsSync(skillMd)) continue;
    const content = fs.readFileSync(skillMd, "utf-8");
    assert(content.includes("analyze-data") || content.includes("story-long-analyze") || content.includes("story-short-analyze"),
      `${skill} references analyze-data or analyze skill for 对标 reports`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("oh-story-claudecode Windows Compatibility Test Suite");
console.log(`Date: ${new Date().toISOString()}`);
console.log(`Node: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Claude dir: ${CLAUDE_DIR}`);
console.log(`Live CDP: ${LIVE}${LIVE ? ` (port ${PORT})` : ""}`);

testT1();
testT2();
testT3();
testT4();
testT5();
testT6();
testT7();
testT8();
testT9();
testT10();
testT11();
testT12();
testT13();
testT14();
testT15();
testT16();
testT17();
testT18();
testT19();
testT20();
testT21();
testT22();
testT25();
testT26();
testT27();
testT28();
testT29();
testLive();

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
