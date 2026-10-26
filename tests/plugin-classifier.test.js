import { test } from "node:test";
import assert from "node:assert/strict";
import { classify as cliClassify } from "../src/classifier.js";
import { classify as pluginClassify } from "../plugin/lib/classifier.js";

const prompts = [
  "lint and format the changed files",
  "git commit the current changes",
  "implement a REST endpoint for user authentication",
  "create a new React component for the dashboard",
  "debug why the login test is flaky",
  "fix the race condition in the session cache",
  "hello there",
  "mets a jour le libelle du bouton"
];

const configs = [
  {},
  {
    defaultTier: "implementation",
    extraKeywords: { mechanical: ["libelle"] }
  },
  {
    tiers: {
      mechanical: { model: "claude-haiku-custom" },
      debugging: { effort: "max" }
    }
  }
];

test("the plugin classifier matches the CLI classifier", () => {
  for (const config of configs) {
    for (const prompt of prompts) {
      assert.deepEqual(
        pluginClassify(prompt, config),
        cliClassify(prompt, config),
        `prompt: ${prompt}`
      );
    }
  }
});
