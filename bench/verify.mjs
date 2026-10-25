#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync
} from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TASKS } from "./tasks.mjs";
import { hasCheck, runCheck } from "./checks.mjs";
import { classify } from "../src/classifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TIERS = new Set(["mechanical", "implementation", "debugging"]);
const MODELS = new Set(["haiku", "sonnet", "opus", "fable"]);
const EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);
const FILE_CHECKS = new Set([
  "impl-roadmap",
  "impl-profile",
  "impl-angular",
  "impl-questions",
  "debug-calc",
  "debug-parse",
  "debug-state",
  "debug-search"
]);

const errors = [];

function fail(message) {
  errors.push(message);
}

function ok(message) {
  console.log(`  ok  ${message}`);
}

function ids(prefix, from, to) {
  return Array.from(
    { length: to - from + 1 },
    (_, i) => `${prefix}${String(from + i).padStart(2, "0")}`
  );
}

function snapshot(dir, base = dir, acc = {}) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") continue;
    const full = path.join(dir, entry);
    const rel = path.relative(base, full);
    if (statSync(full).isDirectory()) snapshot(full, base, acc);
    else acc[rel] = createHash("sha1").update(readFileSync(full)).digest("hex");
  }
  return acc;
}

function copyFixture(fixture) {
  const source = path.join(ROOT, "bench", "fixtures", fixture);
  const root = mkdtempSync(path.join(os.tmpdir(), `cc-router-verify-${fixture}-`));
  const dir = path.join(root, "repo");
  cpSync(source, dir, { recursive: true });
  return { root, dir };
}

console.log("Bench protocol verification\n");

// Prerequisites
const python = spawnSync("python3", ["--version"], { encoding: "utf8" });
if (python.status !== 0) {
  fail("python3 is required for the benchmark fixtures");
} else {
  const yaml = spawnSync("python3", ["-c", "import yaml"], { encoding: "utf8" });
  if (yaml.status !== 0) {
    fail("PyYAML is required for impl-profile (pip install pyyaml)");
  } else {
    ok(`python3 + PyYAML available (${python.stdout.trim()})`);
  }
}

// Task definitions
const seen = new Set();
for (const task of TASKS) {
  const label = `task ${task.id}`;

  if (!task.id || seen.has(task.id)) fail(`${label}: id missing or duplicate`);
  seen.add(task.id);

  if (!task.prompt || typeof task.prompt !== "string") {
    fail(`${label}: prompt missing`);
  }
  if (!TIERS.has(task.tier)) fail(`${label}: unknown tier ${task.tier}`);
  if (!task.baseline || !MODELS.has(task.baseline.model)) {
    fail(`${label}: invalid baseline model`);
  }
  if (!task.baseline || !EFFORTS.has(task.baseline.effort)) {
    fail(`${label}: invalid baseline effort`);
  }
  if (!hasCheck(task.check)) fail(`${label}: unknown check ${task.check}`);
  if (!Array.isArray(task.allowedChanges)) {
    fail(`${label}: allowedChanges must be an array`);
  }
  if (!existsSync(path.join(ROOT, "bench", "fixtures", task.fixture))) {
    fail(`${label}: fixture ${task.fixture} missing`);
  }

  const routing = classify(task.prompt);
  if (routing.tier !== task.tier) {
    fail(`${label}: prompt routes to ${routing.tier}, expected ${task.tier}`);
  } else {
    ok(`${label}: routes to ${routing.tier} (${routing.model})`);
  }
}

// Devquiz fixture content
const spec = path.join(ROOT, "bench", "fixtures", "devquiz", "docs", "SPEC.md");
if (!existsSync(spec)) {
  fail("devquiz fixture: docs/SPEC.md missing");
} else {
  const text = readFileSync(spec, "utf8");
  const missing = [...ids("F-", 1, 14), ...ids("Q-", 1, 11)].filter(
    (id) => !text.includes(id)
  );
  if (missing.length) {
    fail(`devquiz fixture: missing ${missing.join(", ")}`);
  } else {
    ok("devquiz fixture: F-01..F-14 and Q-01..Q-11 present");
  }
}

// File-based checks must be red on a fresh fixture copy
for (const task of TASKS.filter((t) => FILE_CHECKS.has(t.check))) {
  const { root, dir } = copyFixture(task.fixture);
  try {
    const before = snapshot(dir);
    const result = runCheck(task.check, {
      dir,
      result: {},
      beforeHashes: before,
      afterHashes: before
    });
    if (result.pass) {
      fail(`${task.id}: check is green before the task (not a real test)`);
    } else {
      ok(`${task.id}: red before the task (${result.detail.replace(/\s+/g, " ").slice(0, 90)})`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// The buggy fixture must fail before the fix
const calcDir = path.join(ROOT, "bench", "fixtures", "buggy-python");
if (existsSync(calcDir)) {
  const tests = spawnSync("python3", ["-m", "unittest", "-q", "test_calc"], {
    cwd: calcDir,
    encoding: "utf8",
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
  });
  if (tests.status === 0) {
    fail("buggy-python fixture: tests pass before the fix (fixture is not buggy)");
  } else {
    ok("buggy-python fixture: red before the fix");
  }
}

console.log("");
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const checkCount = new Set(TASKS.map((task) => task.check)).size;
console.log(
  `✓ protocol ok: ${TASKS.length} tasks, ${checkCount} checks, all file-based checks red before the work.`
);
