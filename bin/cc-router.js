#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { classify, effectiveTiers } from "../src/classifier.js";
import { loadConfig } from "../src/config.js";
import { runHook } from "../src/hook.js";

const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);

function readPrompt(args) {
  if (args.length > 0) return args.join(" ");
  try {
    return readFileSync(0, "utf8").trim();
  } catch {
    return "";
  }
}

function usage() {
  console.log(`cc-router — automatic model routing for Claude Code

Usage:
  cc-router classify "<task>"     Print tier, model and confidence (JSON)
  cc-router run "<task>"          Classify then run: claude --model <model> "<task>"
  cc-router status                Show the effective tier -> model mapping
  cc-router hook                  Hook mode: reads JSON on stdin (UserPromptSubmit)

Env:
  CC_ROUTER_CLAUDE_BIN   Claude binary used by "run" (default: claude)
  CC_ROUTER_DRY_RUN=1    Print the command instead of running it
`);
}

switch (cmd) {
  case "classify": {
    const prompt = readPrompt(rest);
    if (!prompt) {
      console.error('usage: cc-router classify "<task>"');
      process.exit(2);
    }
    console.log(JSON.stringify(classify(prompt, loadConfig()), null, 2));
    break;
  }

  case "run": {
    const prompt = readPrompt(rest);
    if (!prompt) {
      console.error('usage: cc-router run "<task>"');
      process.exit(2);
    }

    const result = classify(prompt, loadConfig());
    const bin = process.env.CC_ROUTER_CLAUDE_BIN || "claude";
    const args = ["--model", result.model, prompt];

    if (process.env.CC_ROUTER_DRY_RUN === "1") {
      console.log(
        JSON.stringify({ command: bin, args, decision: result }, null, 2)
      );
      break;
    }

    const child = spawnSync(bin, args, { stdio: "inherit" });
    if (child.error) {
      console.error(`cc-router: could not run ${bin}: ${child.error.message}`);
      process.exit(1);
    }
    process.exit(child.status ?? 1);
    break;
  }

  case "status": {
    const config = loadConfig();
    console.log(
      JSON.stringify(
        { defaultTier: config.defaultTier, tiers: effectiveTiers(config) },
        null,
        2
      )
    );
    break;
  }

  case "hook": {
    runHook();
    break;
  }

  default:
    usage();
    process.exit(cmd ? 2 : 0);
}
