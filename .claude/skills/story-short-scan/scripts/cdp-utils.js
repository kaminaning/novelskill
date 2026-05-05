#!/usr/bin/env node
/**
 * cdp-utils.js — delegates to the shared CDP utility module.
 *
 * The real implementation lives at .agents/shared/scripts/cdp-utils.js
 * to avoid code duplication across skills.
 */

module.exports = require("../../../shared/scripts/cdp-utils.js");
