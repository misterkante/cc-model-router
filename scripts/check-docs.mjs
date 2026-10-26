#!/usr/bin/env node
/**
 * Check relative Markdown links and the English/French documentation pairs.
 *
 * No network, no model call. Run with `npm run docs:check`.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set([".git", "node_modules", ".sandbox", "bench/results"]);

const BILINGUAL_PAIRS = [
  ["README.md", "README.fr.md"],
  ["CHANGELOG.md", "CHANGELOG.fr.md"],
  ["CODE_OF_CONDUCT.md", "CODE_OF_CONDUCT.fr.md"],
  ["CONTRIBUTING.md", "CONTRIBUTING.fr.md"],
  ["SECURITY.md", "SECURITY.fr.md"],
  ["IMPLEMENTATION_PLAN.md", "IMPLEMENTATION_PLAN.fr.md"],
  ["docs/README.md", "docs/README.fr.md"],
  ["docs/BENCHMARK.md", "docs/BENCHMARK.fr.md"],
  ["docs/COMPETITION.md", "docs/COMPETITION.fr.md"],
  ["docs/RESEARCH.md", "docs/RESEARCH.fr.md"],
  ["docs/PLUGIN.md", "docs/PLUGIN.fr.md"],
  ["bench/README.md", "bench/README.fr.md"],
  ["bench/fixtures/README.md", "bench/fixtures/README.fr.md"],
  ["bench/fixtures/buggy-python/README.md", "bench/fixtures/buggy-python/README.fr.md"]
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else if (entry.endsWith(".md")) out.push(path);
  }
  return out;
}

function relativeLinks(text) {
  const links = [];
  const markdown = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const html = /(?:src|href)="([^"]+)"/g;
  for (const re of [markdown, html]) {
    let match;
    while ((match = re.exec(text)) !== null) links.push(match[1]);
  }
  return links;
}

function isExternal(target) {
  return /^(?:https?:|mailto:|data:|#)/i.test(target);
}

const files = walk(ROOT);
const errors = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const raw of relativeLinks(text)) {
    if (isExternal(raw)) continue;
    const target = raw.split("#")[0].split("?")[0];
    if (!target) continue;
    const decoded = decodeURIComponent(target);
    const path = resolve(dirname(file), decoded);
    if (!existsSync(path)) {
      errors.push(`${file.slice(ROOT.length + 1)}: missing ${raw}`);
    }
  }
}

for (const [en, fr] of BILINGUAL_PAIRS) {
  for (const path of [en, fr]) {
    if (!existsSync(join(ROOT, path))) {
      errors.push(`missing bilingual file: ${path}`);
    }
  }
}

if (errors.length) {
  console.error("Documentation check failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Documentation check passed: ${files.length} Markdown files, ${BILINGUAL_PAIRS.length} bilingual pairs.`);
