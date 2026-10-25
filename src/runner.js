import { effectiveTiers } from "./classifier.js";

/**
 * Tier ladder used when a verified run fails.
 * mechanical -> implementation -> debugging.
 */
const ESCALATION = {
  mechanical: "implementation",
  implementation: "debugging"
};

export function escalationPlan(tier) {
  const plan = [tier];
  let current = tier;
  while (ESCALATION[current]) {
    current = ESCALATION[current];
    plan.push(current);
  }
  return plan;
}

/**
 * Parse the router-owned flags from the prompt side of `run`.
 * Everything else is prompt text; Claude Code flags stay after `--`.
 */
export function parseRunArgs(args) {
  const promptParts = [];
  let verify = null;
  let escalate = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--verify") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--verify requires a command");
      }
      verify = value;
      i += 1;
    } else if (arg.startsWith("--verify=")) {
      verify = arg.slice("--verify=".length);
      if (!verify) throw new Error("--verify requires a command");
    } else if (arg === "--escalate") {
      escalate = true;
    } else {
      promptParts.push(arg);
    }
  }

  if (escalate && !verify) {
    throw new Error("--escalate requires --verify");
  }

  return { prompt: promptParts.join(" "), verify, escalate };
}

/**
 * Retry prompt for the next model. It carries the original task and the
 * verification failure, not the previous model's hidden reasoning.
 */
export function buildRetryPrompt({
  prompt,
  verify,
  output,
  attempt = 1,
  maxOutput = 4000
}) {
  const text = String(output || "").trim();
  const excerpt =
    text.length > maxOutput ? `${text.slice(0, maxOutput)}\n… (truncated)` : text;

  return [
    prompt,
    "",
    `The previous attempt (attempt ${attempt}) failed verification.`,
    `Verification command: ${verify}`,
    "Verification output:",
    "```",
    excerpt || "(no output)",
    "```",
    "",
    "Fix the remaining issues without undoing correct work.",
    "The router will re-run the verification command after you finish."
  ].join("\n");
}

export function decisionForTier(tier, config = {}, base = {}) {
  const tiers = effectiveTiers(config);
  const def = tiers[tier];
  if (!def) throw new Error(`unknown tier: ${tier}`);
  return {
    ...base,
    tier,
    model: def.model,
    effort: def.effort,
    fallback: def.fallback
  };
}

/**
 * Run the task, then optionally verify it. With `escalate`, a failed check
 * retries with the next tier and includes the failure output in the prompt.
 *
 * `deps.runClaude` and `deps.runVerify` are injected so the flow is testable
 * without spawning Claude or spending quota.
 */
export function runWithVerification({
  prompt,
  decision,
  passthrough = [],
  verify = null,
  escalate = false,
  config = {},
  deps
}) {
  if (
    !deps ||
    typeof deps.runClaude !== "function" ||
    typeof deps.runVerify !== "function"
  ) {
    throw new Error("runWithVerification requires runClaude and runVerify");
  }
  if (escalate && !verify) {
    throw new Error("escalate requires verify");
  }

  const { runClaude, runVerify, log = () => {} } = deps;
  const originalPrompt = prompt;
  const plan = escalate ? escalationPlan(decision.tier) : [decision.tier];
  let current = decision;
  let last = null;

  for (let index = 0; index < plan.length; index += 1) {
    if (index > 0) {
      current = decisionForTier(plan[index], config, decision);
      log(`cc-router: escalating to ${current.model} (${current.tier})`);
    }

    if (verify) {
      log(
        `cc-router: attempt ${index + 1}/${plan.length} with ${current.model} (${current.tier})`
      );
    }
    const run = runClaude({ prompt, decision: current, passthrough });
    if (run && run.error) {
      return {
        ok: false,
        error: run.error,
        attempts: index + 1,
        decision: current,
        run
      };
    }

    let verification = { status: 0, output: "" };
    if (verify) {
      log(`cc-router: verifying with: ${verify}`);
      verification = runVerify({ command: verify, attempt: index + 1 });
    }

    last = { run, verification, decision: current };

    const runStatus = run?.status ?? 0;
    if (verify && runStatus !== 0) {
      log(`cc-router: claude exited with status ${runStatus}`);
    }
    const ok = verify ? verification.status === 0 : runStatus === 0;
    if (ok) {
      if (verify) log("cc-router: verification passed");
      return { ok: true, attempts: index + 1, ...last };
    }

    if (verify) {
      log(`cc-router: verification failed (exit ${verification.status})`);
    }

    if (!escalate || index === plan.length - 1) break;

    prompt = buildRetryPrompt({
      prompt: originalPrompt,
      verify,
      output: verification.output,
      attempt: index + 1
    });
  }

  return { ok: false, attempts: plan.length, ...last };
}
