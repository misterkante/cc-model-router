#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith("--"));
const [baseFile, overlayFile] = positional;
const outIndex = args.indexOf("--out");
const outFile = outIndex === -1 ? null : args[outIndex + 1];
const tasksIndex = args.indexOf("--tasks");
const taskFilter =
  tasksIndex === -1 ? null : args[tasksIndex + 1].split(",").filter(Boolean);

if (!baseFile || !overlayFile) {
  console.error(
    "usage: node bench/merge.mjs <base.json> <overlay.json> [--tasks id,...] [--out merged.json]"
  );
  process.exit(1);
}

const base = JSON.parse(readFileSync(baseFile, "utf8"));
const overlay = JSON.parse(readFileSync(overlayFile, "utf8"));

if (!Array.isArray(base.results) || !Array.isArray(overlay.results)) {
  console.error("both files must contain a results array");
  process.exit(1);
}

const overlayTasks = new Set(
  taskFilter || overlay.results.map((record) => record.task)
);

const kept = base.results.filter((record) => !overlayTasks.has(record.task));
const results = [...kept, ...overlay.results];

function accepted(record) {
  return record.accepted ?? record.check?.pass ?? false;
}

function aggregate(variant) {
  const rows = results.filter((record) => record.variant === variant);
  const passed = rows.filter(accepted);
  const cost = rows.reduce((sum, record) => sum + (record.cost_usd || 0), 0);
  const tokens = rows.reduce((sum, record) => sum + (record.tokens || 0), 0);
  return {
    runs: rows.length,
    passed: passed.length,
    passRate: rows.length ? passed.length / rows.length : 0,
    totalCostUsd: Number(cost.toFixed(6)),
    costPerPassedUsd: passed.length
      ? Number((cost / passed.length).toFixed(6))
      : null,
    totalTokens: tokens,
    tokensPerPassed: passed.length ? Math.round(tokens / passed.length) : null
  };
}

const variants = [...new Set(results.map((record) => record.variant))];
const summary = Object.fromEntries(
  variants.map((variant) => [variant, aggregate(variant)])
);

const output = {
  ...base,
  generatedAt: new Date().toISOString(),
  mergedAt: new Date().toISOString(),
  mergedTasks: [...overlayTasks],
  results,
  summary
};

const target = outFile || baseFile.replace(/\.json$/, "-merged.json");
writeFileSync(target, JSON.stringify(output, null, 2) + "\n");

console.log(
  `Merged ${overlay.results.length} run(s) for ${[...overlayTasks].join(", ")} -> ${target}`
);
console.log(
  `Runs: ${results.length} · routed ${summary.routed?.passed}/${summary.routed?.runs} · baseline ${summary.baseline?.passed}/${summary.baseline?.runs}`
);
