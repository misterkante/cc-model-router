import { appendFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { classify } from "./classifier.js";
import { loadConfig } from "./config.js";

/**
 * Claude Code "UserPromptSubmit" hook.
 *
 * Reads the hook payload on stdin, classifies the prompt, appends a JSON line
 * to ~/.claude/router.log and returns an additionalContext message.
 *
 * Note: Claude Code does not currently let a hook change the active model
 * mid-session. This hook observes and recommends; use `cc-router run` (or the
 * native `opusplan` alias) to actually launch with the selected model.
 */
export function runHook({
  stdin = process.stdin,
  stdout = process.stdout,
  stderr = process.stderr,
  cwd = process.cwd()
} = {}) {
  let raw = "";

  stdin.setEncoding("utf8");
  stdin.on("data", (chunk) => {
    raw += chunk;
  });

  stdin.on("end", () => {
    try {
      const input = raw.trim() ? JSON.parse(raw) : {};
      const prompt = input.prompt || "";
      if (!prompt) return;

      const config = loadConfig(cwd);
      const result = classify(prompt, config);

      const dir =
        process.env.CC_ROUTER_CONFIG_DIR || path.join(os.homedir(), ".claude");
      mkdirSync(dir, { recursive: true });
      appendFileSync(
        process.env.CC_ROUTER_LOG || path.join(dir, "router.log"),
        JSON.stringify({ ts: new Date().toISOString(), ...result }) + "\n"
      );

      const strategyNote =
        result.tier === "debugging" &&
        config.debuggingStrategy === "sonnet-first"
          ? "; sonnet-first available with --verify --escalate"
          : "";

      stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: `[cc-router] task tier: ${result.tier} → recommended model: ${result.model} (effort: ${result.effort}, confidence: ${result.confidence})${strategyNote}`
          }
        })
      );
    } catch (err) {
      stderr.write(`[cc-router] hook error: ${err.message}\n`);
    }
  });
}
