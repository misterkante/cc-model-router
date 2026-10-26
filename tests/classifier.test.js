import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, effectiveTiers } from "../src/classifier.js";
import { configPaths, mergeConfigs } from "../src/config.js";

const cases = [
  ["lint and format the changed files", "mechanical"],
  ["git commit the current changes", "mechanical"],
  ["rename getUserData to fetchUserData", "mechanical"],
  ["implement a REST endpoint for user authentication", "implementation"],
  ["create a new React component for the dashboard", "implementation"],
  ["write unit tests for the payment service", "implementation"],
  ["debug why the login test is flaky", "debugging"],
  ["fix the race condition in the session cache", "debugging"],
  ["investigate the regression in the build pipeline", "debugging"]
];

for (const [prompt, expected] of cases) {
  test(`routes "${prompt}" to ${expected}`, () => {
    assert.equal(classify(prompt).tier, expected);
  });
}

test("falls back to the default tier when there is no signal", () => {
  const result = classify("hello there");
  assert.equal(result.tier, "implementation");
  assert.equal(result.confidence, 0.4);
});

test("config overrides the tier model", () => {
  const result = classify("lint the files", {
    tiers: { mechanical: { model: "claude-haiku-custom" } }
  });
  assert.equal(result.tier, "mechanical");
  assert.equal(result.model, "claude-haiku-custom");
});

test("extra keywords extend a tier", () => {
  const result = classify("bump deps for the release", {
    extraKeywords: { mechanical: ["bump deps"] }
  });
  assert.equal(result.tier, "mechanical");
});

test("project config wins over global config", () => {
  const merged = mergeConfigs(
    { defaultTier: "implementation", tiers: { mechanical: { model: "haiku" } } },
    { tiers: { mechanical: { model: "sonnet" } } }
  );
  assert.equal(merged.tiers.mechanical.model, "sonnet");
  assert.equal(merged.defaultTier, "implementation");
});

test("config preserves debuggingStrategy and merges debuggingFirst", () => {
  const merged = mergeConfigs(
    { debuggingStrategy: "sonnet-first", debuggingFirst: { model: "sonnet" } },
    { debuggingFirst: { effort: "low" } }
  );
  assert.equal(merged.debuggingStrategy, "sonnet-first");
  assert.deepEqual(merged.debuggingFirst, { model: "sonnet", effort: "low" });

  const projectWins = mergeConfigs(
    { debuggingStrategy: "sonnet-first" },
    { debuggingStrategy: "opus" }
  );
  assert.equal(projectWins.debuggingStrategy, "opus");
});

test("invalid debuggingStrategy falls back to opus", () => {
  assert.equal(
    mergeConfigs({ debuggingStrategy: "turbo" }).debuggingStrategy,
    "opus"
  );
});

test("effective tiers keep defaults when config is empty", () => {
  const tiers = effectiveTiers({});
  assert.equal(tiers.mechanical.model, "haiku");
  assert.equal(tiers.implementation.model, "sonnet");
  assert.equal(tiers.debugging.model, "opus");
  assert.equal(tiers.mechanical.effort, "low");
  assert.equal(tiers.implementation.effort, "medium");
  assert.equal(tiers.debugging.effort, "high");
});

test("classify returns the fallback chain", () => {
  const result = classify("debug why the login test is flaky");
  assert.equal(result.fallback, "sonnet,haiku");
});

test("CC_ROUTER_CONFIG_DIR overrides the global config location", () => {
  const previous = process.env.CC_ROUTER_CONFIG_DIR;
  process.env.CC_ROUTER_CONFIG_DIR = "/tmp/cc-router-test";
  try {
    const paths = configPaths("/work");
    assert.equal(paths.global, "/tmp/cc-router-test/model-router.json");
  } finally {
    if (previous === undefined) delete process.env.CC_ROUTER_CONFIG_DIR;
    else process.env.CC_ROUTER_CONFIG_DIR = previous;
  }
});
