#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TASKS } from "./tasks.mjs";
import { runCheck } from "./checks.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARGS = process.argv.slice(2);

function arg(name, fallback) {
  const index = ARGS.indexOf(`--${name}`);
  return index === -1 ? fallback : ARGS[index + 1];
}

const only = arg("tasks", "").split(",").filter(Boolean);
const variants = arg("variants", "routed,baseline").split(",").filter(Boolean);
const budget = arg("budget", "0.20");
const repeats = Number(arg("repeats", "1"));
const devquizRepo = arg("repo", path.join(ROOT, "bench", "fixtures", "devquiz"));

for (const variant of variants) {
  if (variant !== "routed" && variant !== "baseline") {
    console.error(`unknown variant: ${variant} (expected routed or baseline)`);
    process.exit(2);
  }
}
if (!Number.isInteger(repeats) || repeats < 1) {
  console.error(`invalid repeats: ${arg("repeats", "1")}`);
  process.exit(2);
}
const resultsDir = path.join(ROOT, "bench", "results");
mkdirSync(resultsDir, { recursive: true });
const benchConfigDir = mkdtempSync(path.join(os.tmpdir(), "cc-router-bench-config-"));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = arg("out", path.join(resultsDir, `run-${stamp}.json`));

const unknownTasks = only.filter(
  (id) => !TASKS.some((task) => task.id === id)
);
if (unknownTasks.length) {
  console.error(`unknown task(s): ${unknownTasks.join(", ")}`);
  process.exit(2);
}
if (!Number.isFinite(Number(budget)) || Number(budget) <= 0) {
  console.error(`invalid budget: ${budget}`);
  process.exit(2);
}

function fixturePath(name) {
  if (name === "devquiz") return devquizRepo;
  return path.join(ROOT, "bench", "fixtures", name);
}

const settingsPath = path.join(ROOT, ".sandbox", "claude-settings.json");
if (!existsSync(settingsPath)) {
  mkdirSync(path.dirname(settingsPath), { recursive: true });
  writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: "command",
                  command: `node ${path.join(ROOT, "hooks", "user-prompt-submit.js")}`
                }
              ]
            }
          ]
        },
        statusLine: {
          type: "command",
          command: `node ${path.join(ROOT, "bin", "statusline.js")}`
        }
      },
      null,
      2
    )
  );
}

function walk(dir, base = dir, acc = {}) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") continue;
    const full = path.join(dir, entry);
    const rel = path.relative(base, full);
    if (statSync(full).isDirectory()) {
      walk(full, base, acc);
    } else {
      acc[rel] = createHash("sha1").update(readFileSync(full)).digest("hex");
    }
  }
  return acc;
}

function changedFiles(before, after) {
  const all = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...all]
    .filter((file) => before[file] !== after[file])
    .sort();
}

function prepareRepo(task) {
  const source = fixturePath(task.fixture);
  if (!existsSync(source)) throw new Error(`unknown fixture: ${task.fixture}`);
  const root = mkdtempSync(path.join(os.tmpdir(), `cc-router-bench-${task.id}-`));
  const dir = path.join(root, "repo");
  cpSync(source, dir, { recursive: true });
  return dir;
}

function runVariant(task, variant, dir) {
  const common = [
    "-p",
    "--output-format", "json",
    "--max-budget-usd", budget,
    "--permission-mode", "acceptEdits"
  ];

  let command;
  let args;
  if (variant === "routed") {
    command = process.execPath;
    args = [
      path.join(ROOT, "bin", "cc-model-router.js"),
      "run",
      task.prompt,
      "--",
      ...common,
      "--settings", settingsPath
    ];
  } else {
    command = "claude";
    args = [
      "--model", task.baseline.model,
      "--effort", task.baseline.effort,
      ...common,
      task.prompt
    ];
  }

  const result = spawnSync(command, args, {
    cwd: dir,
    encoding: "utf8",
    timeout: 300000,
    env: {
      ...process.env,
      CC_ROUTER_CONFIG_DIR: benchConfigDir
    }
  });

  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    parsed = null;
  }

  return { result, parsed };
}

function tokenTotal(usage = {}) {
  return (
    (usage.input_tokens || 0) +
    (usage.cache_read_input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.output_tokens || 0)
  );
}

const selected = TASKS.filter(
  (task) => only.length === 0 || only.includes(task.id)
);
if (selected.length === 0) {
  console.error("no tasks selected");
  process.exit(2);
}
const records = [];

const runs = [];
for (const task of selected) {
  for (let repeat = 1; repeat <= repeats; repeat++) {
    for (const variant of variants) {
      runs.push({ task, repeat, variant });
    }
  }
}

for (const { task, repeat, variant } of runs) {
  process.stderr.write(
    `\n> ${task.id} / ${variant}${repeats > 1 ? ` / repeat ${repeat}` : ""}\n`
  );

  const dir = prepareRepo(task);
  const before = walk(dir);
  const { result, parsed } = runVariant(task, variant, dir);
  const after = walk(dir);

  const changed = changedFiles(before, after);
  const unexpectedChanges = changed.filter(
    (file) => !task.allowedChanges.includes(file)
  );

  const check = parsed
    ? runCheck(task.check, {
        dir,
        result: parsed,
        beforeHashes: before,
        afterHashes: after
      })
    : { pass: false, detail: "no JSON output from claude" };

  const accepted =
    result.status === 0 && check.pass && unexpectedChanges.length === 0;

  const record = {
    task: task.id,
    tier: task.tier,
    variant,
    repeat,
    exit: result.status,
    model: parsed ? Object.keys(parsed.modelUsage || {}) : [],
    cost_usd: parsed?.total_cost_usd ?? null,
    tokens: tokenTotal(parsed?.usage),
    duration_ms: parsed?.duration_ms ?? null,
    changedFiles: changed,
    unexpectedChanges,
    check,
    accepted,
    resultPreview: parsed?.result ? String(parsed.result).slice(0, 1000) : "",
    beforeHashes: before,
    afterHashes: after,
    dir,
    stderr: result.status === 0 ? "" : String(result.stderr || "").slice(0, 500)
  };

  records.push(record);
  process.stderr.write(
    `  ${accepted ? "PASS" : "FAIL"} | ${record.model.join(",") || "?"} | $${record.cost_usd ?? "?"} | ${record.tokens} tokens | ${check.detail}${unexpectedChanges.length ? ` | unexpected: ${unexpectedChanges.join(", ")}` : ""}\n`
  );
}

function aggregate(variant) {
  const rows = records.filter((record) => record.variant === variant);
  const passed = rows.filter(
    (record) => record.accepted ?? record.check.pass
  );
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

const summary = Object.fromEntries(
  variants.map((variant) => [variant, aggregate(variant)])
);

const claudeVersion = spawnSync("claude", ["--version"], {
  encoding: "utf8"
}).stdout?.trim() || "unknown";
const routerVersion = JSON.parse(
  readFileSync(path.join(ROOT, "package.json"), "utf8")
).version;

writeFileSync(
  outFile,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      claudeVersion,
      routerVersion,
      nodeVersion: process.version,
      budgetPerRunUsd: budget,
      repeats,
      results: records,
      summary
    },
    null,
    2
  )
);

console.log(`\nResults: ${outFile}`);
console.log("\nVariant  | pass  | cost      | $/passed | tokens  | tok/passed");
for (const variant of variants) {
  const s = summary[variant];
  console.log(
    `${variant.padEnd(8)} | ${s.passed}/${s.runs}  | $${String(s.totalCostUsd).padEnd(8)} | $${String(s.costPerPassedUsd).padEnd(7)} | ${String(s.totalTokens).padEnd(7)} | ${s.tokensPerPassed}`
  );
}
