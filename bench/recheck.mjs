#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { TASKS } from "./tasks.mjs";
import { runCheck } from "./checks.mjs";

const [source, ...rest] = process.argv.slice(2);
if (!source) {
  console.error("usage: node bench/recheck.mjs <results.json> [taskId,...]");
  process.exit(1);
}

const only = rest.join(",").split(",").filter(Boolean);
const data = JSON.parse(readFileSync(source, "utf8"));
const tasks = new Map(TASKS.map((task) => [task.id, task]));

let updated = 0;
for (const record of data.results) {
  if (only.length && !only.includes(record.task)) continue;
  const task = tasks.get(record.task);
  if (!task) continue;
  if (!existsSync(record.dir)) {
    console.error(`skip ${record.task}/${record.variant}: ${record.dir} missing`);
    continue;
  }

  const check = runCheck(task.check, {
    dir: record.dir,
    result: {},
    beforeHashes: record.beforeHashes || {},
    afterHashes: record.afterHashes || {}
  });

  if (check.pass !== record.check.pass || check.detail !== record.check.detail) {
    record.check = check;
    updated += 1;
  }
}

function aggregate(variant) {
  const rows = data.results.filter((record) => record.variant === variant);
  const passed = rows.filter((record) => record.check.pass);
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

data.summary = Object.fromEntries(
  Object.keys(data.summary).map((variant) => [variant, aggregate(variant)])
);

const out = source.replace(/\.json$/, "") + "-rescored.json";
writeFileSync(out, JSON.stringify(data, null, 2));

console.log(`updated ${updated} record(s) -> ${out}`);
console.log("\nVariant  | pass  | cost      | $/passed | tokens  | tok/passed");
for (const variant of Object.keys(data.summary)) {
  const s = data.summary[variant];
  console.log(
    `${variant.padEnd(8)} | ${s.passed}/${s.runs}  | $${String(s.totalCostUsd).padEnd(8)} | $${String(s.costPerPassedUsd).padEnd(7)} | ${String(s.totalTokens).padEnd(7)} | ${s.tokensPerPassed}`
  );
}
