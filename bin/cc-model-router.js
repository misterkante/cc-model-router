#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { classify, effectiveTiers } from "../src/classifier.js";
import { loadConfig } from "../src/config.js";
import { runHook } from "../src/hook.js";
import {
  decisionForTier,
  escalationPlanFor,
  initialDecision,
  parseRunArgs,
  runWithVerification
} from "../src/runner.js";

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

function splitArgs(args) {
  const idx = args.indexOf("--");
  if (idx === -1) return { promptArgs: args, passthrough: [] };
  return {
    promptArgs: args.slice(0, idx),
    passthrough: args.slice(idx + 1)
  };
}

function usage() {
  console.log(`cc-model-router (ccmr) — automatic model routing for Claude Code

Usage:
  ccmr classify "<task>"     Print tier, model and confidence (JSON)
  ccmr run "<task>" [--verify "<command>"] [--escalate] [-- <claude args>]
                                  Classify then run with --model/--effort/--fallback-model.
                                  --verify runs a command after the task.
                                  --escalate retries with the next tier on failure.
  ccmr status                Show the effective tier -> model mapping
  ccmr hook                  Hook mode: reads JSON on stdin (UserPromptSubmit)

Env:
  CC_ROUTER_CLAUDE_BIN   Claude binary used by "run" (default: claude)
  CC_ROUTER_DRY_RUN=1    Print the command instead of running it

Config:
  debuggingStrategy      "opus" (default) or "sonnet-first"
                         ("sonnet-first" requires --verify and --escalate)
`);
}

switch (cmd) {
  case "classify": {
    const prompt = readPrompt(rest);
    if (!prompt) {
      console.error('usage: ccmr classify "<task>"');
      process.exit(2);
    }
    console.log(JSON.stringify(classify(prompt, loadConfig()), null, 2));
    break;
  }

  case "run": {
    const { promptArgs, passthrough } = splitArgs(rest);
    let parsed;
    try {
      parsed = parseRunArgs(promptArgs);
    } catch (err) {
      console.error(`cc-model-router: ${err.message}`);
      process.exit(2);
    }

    const prompt = parsed.prompt.trim() || readPrompt([]);
    if (!prompt) {
      console.error(
        'usage: ccmr run "<task>" [--verify "<command>"] [--escalate] [-- <claude args...>]'
      );
      process.exit(2);
    }

    const config = loadConfig();
    const result = classify(prompt, config);
    const strategyOptions = {
      verify: parsed.verify,
      escalate: parsed.escalate
    };
    const initial = initialDecision(result, config, strategyOptions);
    const bin = process.env.CC_ROUTER_CLAUDE_BIN || "claude";

    const claudeArgs = (decision, text) => {
      const args = ["--model", decision.model, "--effort", decision.effort];
      if (decision.fallback) args.push("--fallback-model", decision.fallback);
      args.push(...passthrough, text);
      return args;
    };

    if (process.env.CC_ROUTER_DRY_RUN === "1") {
      console.log(
        JSON.stringify(
          {
            command: bin,
            args: claudeArgs(initial, prompt),
            decision: initial,
            verify: parsed.verify,
            escalate: parsed.escalate,
            escalation: parsed.escalate
              ? escalationPlanFor(result, config, strategyOptions)
                  .slice(1)
                  .map((tier) => decisionForTier(tier, config, result))
              : []
          },
          null,
          2
        )
      );
      break;
    }

    const runClaude = ({ prompt: text, decision }) => {
      const child = spawnSync(bin, claudeArgs(decision, text), {
        stdio: "inherit"
      });
      if (child.error) return { error: child.error.message };
      return { status: child.status ?? 1 };
    };

    const runVerify = ({ command }) => {
      const child = spawnSync(command, [], {
        shell: true,
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"]
      });
      const output = `${child.stdout || ""}${child.stderr || ""}`;
      if (output.trim()) process.stderr.write(`${output.trim()}\n`);
      if (child.error) {
        return { status: 1, output: `${output}\n${child.error.message}` };
      }
      return { status: child.status ?? 1, output };
    };

    const outcome = runWithVerification({
      prompt,
      decision: result,
      passthrough,
      verify: parsed.verify,
      escalate: parsed.escalate,
      config,
      deps: {
        runClaude,
        runVerify,
        log: (message) => console.error(message)
      }
    });

    if (outcome.error) {
      console.error(`cc-model-router: could not run ${bin}: ${outcome.error}`);
      process.exit(1);
    }
    if (outcome.ok) process.exit(0);

    const exitCode = parsed.verify
      ? (outcome.verification?.status ?? 1)
      : (outcome.run?.status ?? 1);
    process.exit(exitCode);
    break;
  }

  case "status": {
    const config = loadConfig();
    console.log(
      JSON.stringify(
        {
          defaultTier: config.defaultTier,
          debuggingStrategy: config.debuggingStrategy,
          debuggingFirst: config.debuggingFirst || null,
          tiers: effectiveTiers(config)
        },
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
