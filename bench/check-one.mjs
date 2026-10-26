#!/usr/bin/env node
/**
 * Run one benchmark check against a directory and exit 0/1.
 *
 * Useful as a `ccmr run --verify` command for checks that only need the
 * directory (for example `impl-angular`). Checks that need the Claude result
 * or before/after hashes are not supported here; use the full benchmark runner
 * for those.
 *
 * Usage: node bench/check-one.mjs <check> [dir]
 */
import path from "node:path";
import { runCheck } from "./checks.mjs";

const [name, dir = "."] = process.argv.slice(2);
if (!name) {
  console.error("usage: node bench/check-one.mjs <check> [dir]");
  process.exit(2);
}

const result = runCheck(name, { dir: path.resolve(dir) });
console.log(result.detail || (result.pass ? "ok" : "failed"));
process.exit(result.pass ? 0 : 1);
