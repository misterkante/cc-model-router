#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [source, name] = process.argv.slice(2);
if (!source || !name) {
  console.error("usage: node bench/publish.mjs <results.json> <name>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(source, "utf8"));

function sanitize(value, dir) {
  if (typeof value === "string") {
    let out = dir ? value.split(dir).join("<sandbox>") : value;
    out = out.replace(/\/tmp\/cc-router-bench-[^\s"']*/g, "<sandbox>");
    return out;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, dir));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitize(item, dir)])
    );
  }
  return value;
}

const clean = {
  generatedAt: data.generatedAt,
  claudeVersion: data.claudeVersion,
  routerVersion: data.routerVersion,
  nodeVersion: data.nodeVersion,
  budgetPerRunUsd: data.budgetPerRunUsd,
  repeats: data.repeats,
  mergedAt: data.mergedAt,
  mergedTasks: data.mergedTasks,
  summary: data.summary,
  results: (data.results || []).map(
    ({ dir, beforeHashes, afterHashes, stderr, resultPreview, ...rest }) =>
      sanitize(rest, dir)
  )
};

const outFile = path.join("docs", "benchmarks", `${name}.json`);
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(clean, null, 2) + "\n");
console.log(`Wrote ${outFile}`);
