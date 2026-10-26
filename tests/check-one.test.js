import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONE = path.join(ROOT, "bench", "check-one.mjs");

function runCheckOne(args) {
  return spawnSync(process.execPath, [CHECK_ONE, ...args], {
    encoding: "utf8"
  });
}

test("check-one runs a directory-only benchmark check and exits 0/1", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cc-router-check-one-"));
  try {
    const parcours = path.join(dir, "parcours");
    mkdirSync(parcours, { recursive: true });

    writeFileSync(path.join(parcours, "angular.yaml"), "notions: [\n");
    const invalid = runCheckOne(["impl-angular", dir]);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stdout, /Traceback|not a mapping/);

    const lines = ["notions:"];
    for (let i = 1; i <= 8; i += 1) {
      lines.push(
        `  - id: N${String(i).padStart(2, "0")}`,
        `    titre: Notion ${i}`,
        "    urls:",
        `      - https://angular.dev/guide/n${i}`
      );
    }
    writeFileSync(path.join(parcours, "angular.yaml"), `${lines.join("\n")}\n`);
    const valid = runCheckOne(["impl-angular", dir]);
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /Angular YAML structure ok/);

    const unknown = runCheckOne(["does-not-exist", dir]);
    assert.equal(unknown.status, 1);
    assert.match(unknown.stdout, /unknown check/);

    const usage = runCheckOne([]);
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /usage: node bench\/check-one\.mjs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
