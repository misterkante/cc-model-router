#!/usr/bin/env node
/**
 * Fail when a private project name or a machine-specific home path is committed.
 *
 * The denylist is base64-encoded so this file does not itself reintroduce the
 * strings it looks for. No network, no model call. Run with `npm run privacy:check`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SELF = fileURLToPath(import.meta.url);
const SKIP = new Set([".git", "node_modules", ".sandbox"]);

function decode(value) {
  return Buffer.from(value, "base64").toString("utf8");
}

const BLOCKED = [
  // Private project name used during the first benchmark runs.
  decode("ZGV2cXVpeg=="),
  // Machine-specific home directories must never be committed.
  decode("L2hvbWUvbWlzdGVya2FudGU="),
  decode("L1VzZXJzLw==")
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const path = join(dir, entry);
    if (path === SELF) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const errors = [];

for (const path of walk(ROOT)) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue; // binary file
  }
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const term of BLOCKED) {
      if (lines[index].includes(term)) {
        errors.push(`${relative(ROOT, path)}:${index + 1}: blocked term "${term}"`);
      }
    }
  }
}

if (errors.length) {
  console.error("Private name or machine path found:");
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log("privacy: no private names or machine paths found");
