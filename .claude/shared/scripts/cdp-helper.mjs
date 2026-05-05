#!/usr/bin/env node
/**
 * CDP Helper — ESM script for direct Chrome/Edge DevTools Protocol communication.
 *
 * Usage (called by cdp-utils.js via execFileSync):
 *   node cdp-helper.mjs open <port> <url>       Open or navigate to URL
 *   node cdp-helper.mjs eval <port> <tmpfile>    Evaluate JS (reads expression from file)
 *   node cdp-helper.mjs scroll <port> <count>    Scroll page N times
 *
 * Requires Node.js v22+ (built-in fetch + WebSocket).
 */

const fs = await import("fs");
const [,, command, ...args] = process.argv;

// ---------------------------------------------------------------------------
// CDP primitives — single-flow WebSocket (avoids cross-function WS issues)
// ---------------------------------------------------------------------------

async function cdpCall(port, method, params = {}) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find((t) => t.type === "page");
  if (!page?.webSocketDebuggerUrl) throw new Error("No page target found");

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    const timer = setTimeout(() => { ws.close(); reject(new Error("CDP timeout")); }, 10000);

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ id: 1, method, params }));
    });

    ws.addEventListener("message", (event) => {
      clearTimeout(timer);
      const data = JSON.parse(event.data);
      ws.close();
      resolve(data);
    });

    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("WebSocket error"));
    });
  });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdOpen(port, url) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const pages = targets.filter((t) => t.type === "page");

  if (pages.length === 0) {
    const target = await (await fetch(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`
    )).json();
    process.stdout.write(JSON.stringify(target));
    return;
  }

  const result = await cdpCall(port, "Page.navigate", { url });
  process.stdout.write(JSON.stringify(result));
}

async function cmdEval(port, tmpFile) {
  const js = fs.readFileSync(tmpFile, "utf-8");
  const result = await cdpCall(port, "Runtime.evaluate", {
    expression: js,
    returnByValue: true,
  });
  process.stdout.write(JSON.stringify(result));
}

async function cmdScroll(port, count) {
  const n = parseInt(count, 10) || 3;
  for (let i = 0; i < n; i++) {
    await cdpCall(port, "Runtime.evaluate", {
      expression: "window.scrollTo(0, document.body.scrollHeight)",
      returnByValue: true,
    });
    await new Promise((r) => setTimeout(r, 500));
  }
  process.stdout.write(JSON.stringify({ scrolled: n }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!command) {
  process.stderr.write("Usage: cdp-helper.mjs <open|eval|scroll> ...\n");
  process.exit(1);
}

try {
  switch (command) {
    case "open": {
      const [port, url] = args;
      if (!port || !url) throw new Error("open requires <port> <url>");
      await cmdOpen(port, url);
      break;
    }
    case "eval": {
      const [port, tmpFile] = args;
      if (!port || !tmpFile) throw new Error("eval requires <port> <tmpfile>");
      await cmdEval(port, tmpFile);
      break;
    }
    case "scroll": {
      const [port, count] = args;
      if (!port) throw new Error("scroll requires <port> [count]");
      await cmdScroll(port, count || "3");
      break;
    }
    default:
      process.stderr.write(`Unknown command: ${command}\n`);
      process.exit(1);
  }
  process.exit(0);
} catch (err) {
  process.stderr.write(`CDP error: ${err.message}\n`);
  process.exit(1);
}
