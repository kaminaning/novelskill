#!/usr/bin/env node
/**
 * CDP Utilities — synchronous wrappers for Chrome DevTools Protocol.
 *
 * Provides the same API as the macOS `agent-browser` CLI approach,
 * but uses direct CDP HTTP + WebSocket communication instead.
 *
 * Exports: ab, sleep, evalJSON, safeStr, scrollLoad, getArg
 *
 * Requires Node.js v22+ (built-in fetch + WebSocket in cdp-helper.mjs).
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const HELPER = path.join(__dirname, "cdp-helper.mjs");

// ---------------------------------------------------------------------------
// Synchronous sleep using Atomics.wait (no subprocess overhead)
// ---------------------------------------------------------------------------

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// ---------------------------------------------------------------------------
// ab — browser command (currently only "open" is used by scrapers)
// ---------------------------------------------------------------------------

function ab(port, cmd, url) {
  if (cmd === "open") {
    try {
      execFileSync("node", [HELPER, "open", String(port), url], {
        encoding: "utf-8",
        timeout: 15000,
      });
    } catch (err) {
      // execFileSync throws on non-zero exit; log but don't crash
      if (err.stderr) process.stderr.write(err.stderr);
    }
  }
}

// ---------------------------------------------------------------------------
// evalJSON — evaluate JS in browser and parse JSON result
// ---------------------------------------------------------------------------

function evalJSON(port, js) {
  // Write JS expression to a temp file to avoid CLI arg length limits
  const tmpFile = path.join(os.tmpdir(), `cdp-eval-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(tmpFile, js, "utf-8");

  try {
    const raw = execFileSync("node", [HELPER, "eval", String(port), tmpFile], {
      encoding: "utf-8",
      timeout: 15000,
    });

    // CDP returns: { result: { result: { type, value } } }
    const cdpResult = JSON.parse(raw);
    const value = cdpResult?.result?.result?.value;
    if (value === undefined || value === null) return null;

    // value is the JSON string from JSON.stringify(...) in the scraper's JS
    return JSON.parse(value);
  } catch (err) {
    if (err.stderr) process.stderr.write(err.stderr);
    return null;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// safeStr — produce a safely-escaped quoted JS string literal
// ---------------------------------------------------------------------------

function safeStr(text) {
  return JSON.stringify(String(text));
}

// ---------------------------------------------------------------------------
// scrollLoad — scroll the page to trigger lazy-loaded content
// ---------------------------------------------------------------------------

function scrollLoad(port, count) {
  try {
    execFileSync("node", [HELPER, "scroll", String(port), String(count || 3)], {
      encoding: "utf-8",
      timeout: 30000,
    });
  } catch (err) {
    if (err.stderr) process.stderr.write(err.stderr);
  }
}

// ---------------------------------------------------------------------------
// getArg — parse CLI arguments
// ---------------------------------------------------------------------------

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { ab, sleep, evalJSON, safeStr, scrollLoad, getArg };
