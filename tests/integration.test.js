import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = path.join(ROOT, "hooks", "user-prompt-submit.js");
const STATUSLINE = path.join(ROOT, "bin", "statusline.js");

function tempProject() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cc-router-integration-"));
  const project = path.join(dir, "project");
  const config = path.join(dir, "config");
  mkdirSync(project, { recursive: true });
  return { dir, project, config };
}

function run(file, { cwd, config, input }) {
  return spawnSync(process.execPath, [file], {
    cwd,
    input,
    encoding: "utf8",
    env: { ...process.env, CC_ROUTER_CONFIG_DIR: config }
  });
}

function writeProjectConfig(project, config) {
  mkdirSync(path.join(project, ".claude"), { recursive: true });
  writeFileSync(
    path.join(project, ".claude", "model-router.json"),
    JSON.stringify(config)
  );
}

test("hook classifies a prompt and writes the router log", () => {
  const { dir, project, config } = tempProject();
  try {
    const result = run(HOOK, {
      cwd: project,
      config,
      input: JSON.stringify({ prompt: "debug why the login test is flaky" })
    });

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    const context = payload.hookSpecificOutput.additionalContext;
    assert.match(context, /task tier: debugging/);
    assert.match(context, /recommended model: opus/);

    const log = JSON.parse(
      readFileSync(path.join(config, "router.log"), "utf8").trim()
    );
    assert.equal(log.tier, "debugging");
    assert.equal(log.model, "opus");
    assert.equal(log.effort, "high");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hook honors the project config override", () => {
  const { dir, project, config } = tempProject();
  try {
    writeProjectConfig(project, {
      tiers: { debugging: { model: "sonnet", effort: "medium" } }
    });

    const result = run(HOOK, {
      cwd: project,
      config,
      input: JSON.stringify({ prompt: "debug why the login test is flaky" })
    });

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.match(
      payload.hookSpecificOutput.additionalContext,
      /recommended model: sonnet/
    );

    const log = JSON.parse(
      readFileSync(path.join(config, "router.log"), "utf8").trim()
    );
    assert.equal(log.model, "sonnet");
    assert.equal(log.effort, "medium");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hook ignores an empty prompt and writes no log", () => {
  const { dir, project, config } = tempProject();
  try {
    const result = run(HOOK, { cwd: project, config, input: "{}" });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(existsSync(path.join(config, "router.log")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusline prints the active model and the default mapping", () => {
  const { dir, project, config } = tempProject();
  try {
    const result = run(STATUSLINE, {
      cwd: project,
      config,
      input: JSON.stringify({ model: { display_name: "Sonnet 5.5" } })
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "Sonnet 5.5 · M:haiku I:sonnet D:opus");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusline honors the project config override", () => {
  const { dir, project, config } = tempProject();
  try {
    writeProjectConfig(project, {
      tiers: { debugging: { model: "sonnet", effort: "medium" } }
    });

    const result = run(STATUSLINE, {
      cwd: project,
      config,
      input: JSON.stringify({ model: { display_name: "Sonnet 5.5" } })
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "Sonnet 5.5 · M:haiku I:sonnet D:sonnet");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
