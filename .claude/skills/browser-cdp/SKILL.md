---
name: browser-cdp
version: 1.0.0
description: "Use this skill when you need to control a Chrome browser via CDP (Chrome DevTools Protocol) to reuse existing login sessions. Covers: launching Chrome in debug mode, opening URLs, waiting for page load, evaluating JavaScript, taking snapshots, and extracting auth tokens. Trigger phrases: browser automation, CDP, agent-browser, 浏览器操作, 操作浏览器, Chrome CDP, 复用登录态, extract token from browser."
metadata:
  openclaw:
    source: https://github.com/worldwonderer/oh-story-claudecode
---

# Browser CDP 操作工具

通过 CDP 协议控制 Chrome，复用已有登录态，执行浏览器自动化操作。

## 前置条件

### macOS

- macOS，已安装 Google Chrome
- `agent-browser` 命令行工具已安装

### Windows

- Windows 10/11，已安装 Microsoft Edge 或 Google Chrome
- Node.js v22+（内置 fetch 和 WebSocket）

---

## 第一步：启动 CDP 浏览器环境

### macOS

```bash
bash {SKILL_DIR}/scripts/setup_cdp_chrome.sh 9222
```

成功后所有 `agent-browser` 命令带 `--cdp 9222`。

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File "{SKILL_DIR}/scripts/setup_cdp_windows.ps1" 9222
```

Windows 下采集脚本通过 cdp-utils.js 直接与 CDP 通信，不需要 `agent-browser`。

---

## 常用操作

> macOS 使用 `agent-browser` CLI；Windows 使用 `cdp-helper.mjs` 或在 Node.js 脚本中通过 `cdp-utils.js` 调用。
> 采集脚本（排名爬虫等）已内置 Windows 支持，直接运行即可。

### 打开页面并等待加载

macOS:
```bash
agent-browser --cdp 9222 open "<URL>"
agent-browser --cdp 9222 wait 3000
```

Windows (Node.js):
```js
const { ab, sleep } = require("cdp-utils.js");
ab(9222, "open", "https://example.com");
sleep(3000);
```

### 提取页面文本内容

macOS:
```bash
agent-browser --cdp 9222 eval 'document.body.innerText.substring(0, 8000)'
```

Windows (Node.js):
```js
const { evalJSON } = require("cdp-utils.js");
const text = evalJSON(9222, "JSON.stringify(document.body.innerText.substring(0, 8000))");
```

### 提取 Auth Token

macOS:
```bash
agent-browser --cdp 9222 eval 'localStorage.getItem("token") || document.cookie'
```

Windows (Node.js):
```js
const { evalJSON } = require("cdp-utils.js");
const token = evalJSON(9222, "JSON.stringify(localStorage.getItem('token') || document.cookie)");
```

### 页面截图 / 交互式快照

macOS:
```bash
agent-browser --cdp 9222 snapshot -i
```

Windows: 使用 Claude Code 的 Read 工具读取截图文件，或通过采集脚本间接操作。

### 点击元素

macOS:
```bash
agent-browser --cdp 9222 click "<CSS selector>"
```

Windows (Node.js):
```js
const { evalJSON } = require("cdp-utils.js");
evalJSON(9222, "JSON.stringify(document.querySelector('CSS selector')?.click())");
```

### 填写表单

macOS:
```bash
agent-browser --cdp 9222 type "<CSS selector>" "<text>"
```

Windows (Node.js):
```js
const { evalJSON } = require("cdp-utils.js");
const el = "document.querySelector('CSS selector')";
evalJSON(9222, `JSON.stringify(${el}.focus(), ${el}.value='text', ${el}.dispatchEvent(new Event('input',{bubbles:true})))`);
```

---

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| CDP 端口未监听 | 重新运行 setup 脚本（macOS: `setup_cdp_chrome.sh` / Windows: `setup_cdp_windows.ps1`） |
| 页面跳转到登录页 | `snapshot -i` 找登录按钮并操作 |
| eval 返回 null | 检查 localStorage key 名称，或改用 `document.cookie` |
| 浏览器进程残留 | macOS: `pkill -9 -f "Google Chrome"` / Windows: `Stop-Process -Name msedge -Force` 或重启脚本 |
| Windows 脚本报错 | 确认 Node.js v22+ 已安装，或删除 debug profile 目录后重试 |
