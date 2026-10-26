import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
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
const CLI = path.join(ROOT, "bin", "cc-model-router.js");

test("run --verify --escalate retries with the next tier after a failed check", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cc-router-cli-"));
  try {
    const fake = path.join(dir, "fake-claude");
    writeFileSync(
      fake,
      `#!/bin/sh
if [ -f .attempt ]; then
  printf 'ok\\n' > result.txt
else
  printf 'broken\\n' > result.txt
  : > .attempt
fi
exit 0
`
    );
    chmodSync(fake, 0o755);

    const result = spawnSync(
      process.execPath,
      [
        CLI,
        "run",
        "implement a file",
        "--verify",
        "cat result.txt; grep -q '^ok$' result.txt",
        "--escalate"
      ],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CC_ROUTER_CLAUDE_BIN: fake,
          CC_ROUTER_CONFIG_DIR: path.join(dir, "config")
        }
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(path.join(dir, "result.txt"), "utf8").trim(),
      "ok"
    );
    assert.match(result.stderr, /escalating to opus/);
    assert.match(result.stderr, /verification passed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sonnet-first debugging retries with Opus after a failed check", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cc-router-cli-"));
  try {
    const configDir = path.join(dir, "config");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      path.join(configDir, "model-router.json"),
      JSON.stringify({ debuggingStrategy: "sonnet-first" })
    );

    const fake = path.join(dir, "fake-claude");
    writeFileSync(
      fake,
      `#!/bin/sh
model=""
while [ $# -gt 0 ]; do
  case "$1" in
    --model) model="$2"; shift 2 ;;
    *) shift ;;
  esac
done
printf '%s\\n' "$model" >> calls.log
printf '%s\\n' "$model" > model.txt
exit 0
`
    );
    chmodSync(fake, 0o755);

    const result = spawnSync(
      process.execPath,
      [
        CLI,
        "run",
        "debug the failing test",
        "--verify",
        "grep -q '^opus$' model.txt",
        "--escalate"
      ],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CC_ROUTER_CLAUDE_BIN: fake,
          CC_ROUTER_CONFIG_DIR: configDir
        }
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      readFileSync(path.join(dir, "calls.log"), "utf8").trim().split("\n"),
      ["sonnet", "opus"]
    );
    assert.match(result.stderr, /attempt 1\/2 with sonnet/);
    assert.match(result.stderr, /escalating to opus/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("run --verify without --escalate exits non-zero on a failed check", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cc-router-cli-"));
  try {
    const fake = path.join(dir, "fake-claude");
    writeFileSync(
      fake,
      `#!/bin/sh
printf 'broken\\n' > result.txt
exit 0
`
    );
    chmodSync(fake, 0o755);

    const result = spawnSync(
      process.execPath,
      [
        CLI,
        "run",
        "implement a file",
        "--verify",
        "grep -q '^ok$' result.txt"
      ],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CC_ROUTER_CLAUDE_BIN: fake,
          CC_ROUTER_CONFIG_DIR: path.join(dir, "config")
        }
      }
    );

    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /verification failed/);
    assert.doesNotMatch(result.stderr, /escalating/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
