import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRetryPrompt,
  escalationPlan,
  escalationPlanFor,
  initialDecision,
  parseRunArgs,
  runWithVerification
} from "../src/runner.js";

function decision(tier) {
  const tiers = {
    mechanical: { model: "haiku", effort: "low", fallback: "sonnet" },
    implementation: { model: "sonnet", effort: "medium", fallback: "haiku" },
    debugging: { model: "opus", effort: "high", fallback: "sonnet,haiku" }
  };
  return { tier, ...tiers[tier] };
}

test("parseRunArgs extracts the prompt, --verify and --escalate", () => {
  assert.deepEqual(
    parseRunArgs(["fix", "it", "--verify", "npm test", "--escalate"]),
    { prompt: "fix it", verify: "npm test", escalate: true }
  );
});

test("parseRunArgs accepts --verify=<command>", () => {
  assert.deepEqual(parseRunArgs(["--verify=npm test", "fix", "it"]), {
    prompt: "fix it",
    verify: "npm test",
    escalate: false
  });
});

test("parseRunArgs keeps the prompt when no router flag is present", () => {
  assert.deepEqual(parseRunArgs(["fix", "it"]), {
    prompt: "fix it",
    verify: null,
    escalate: false
  });
});

test("parseRunArgs rejects --escalate without --verify", () => {
  assert.throws(
    () => parseRunArgs(["fix", "it", "--escalate"]),
    /--escalate requires --verify/
  );
});

test("parseRunArgs rejects --verify without a command", () => {
  assert.throws(() => parseRunArgs(["--verify"]), /requires a command/);
  assert.throws(
    () => parseRunArgs(["--verify", "--escalate"]),
    /requires a command/
  );
});

test("escalationPlan follows mechanical -> implementation -> debugging", () => {
  assert.deepEqual(escalationPlan("mechanical"), [
    "mechanical",
    "implementation",
    "debugging"
  ]);
  assert.deepEqual(escalationPlan("implementation"), [
    "implementation",
    "debugging"
  ]);
  assert.deepEqual(escalationPlan("debugging"), ["debugging"]);
});

test("initialDecision keeps Opus unless sonnet-first + verify + escalate", () => {
  const opus = decision("debugging");
  const config = { debuggingStrategy: "sonnet-first" };

  assert.equal(initialDecision(opus, config), opus);
  assert.equal(initialDecision(opus, config, { verify: "npm test" }), opus);
  assert.equal(initialDecision(opus, config, { escalate: true }), opus);

  const first = initialDecision(opus, config, {
    verify: "npm test",
    escalate: true
  });
  assert.equal(first.model, "sonnet");
  assert.equal(first.effort, "medium");
  assert.equal(first.tier, "debugging");
  assert.equal(first.strategy, "sonnet-first");
});

test("initialDecision uses debuggingFirst overrides", () => {
  const first = initialDecision(
    decision("debugging"),
    {
      debuggingStrategy: "sonnet-first",
      debuggingFirst: { model: "haiku", effort: "low" }
    },
    { verify: "npm test", escalate: true }
  );

  assert.equal(first.model, "haiku");
  assert.equal(first.effort, "low");
});

test("escalationPlanFor adds an Opus retry for sonnet-first debugging", () => {
  const config = { debuggingStrategy: "sonnet-first" };

  assert.deepEqual(escalationPlanFor(decision("debugging"), config), [
    "debugging"
  ]);
  assert.deepEqual(
    escalationPlanFor(decision("debugging"), config, {
      verify: "npm test",
      escalate: true
    }),
    ["debugging", "debugging"]
  );
  assert.deepEqual(
    escalationPlanFor(decision("implementation"), config, {
      verify: "npm test",
      escalate: true
    }),
    ["implementation", "debugging"]
  );
});

test("buildRetryPrompt includes the task, command and failure output", () => {
  const prompt = buildRetryPrompt({
    prompt: "implement the parser",
    verify: "npm test",
    output: "2 tests failed",
    attempt: 1
  });

  assert.match(prompt, /implement the parser/);
  assert.match(prompt, /Verification command: npm test/);
  assert.match(prompt, /2 tests failed/);
  assert.match(prompt, /Fix the remaining issues/);
});

test("buildRetryPrompt truncates a large failure output", () => {
  const prompt = buildRetryPrompt({
    prompt: "task",
    verify: "npm test",
    output: "x".repeat(5000),
    maxOutput: 100
  });

  assert.match(prompt, /truncated/);
  assert.ok(prompt.includes("x".repeat(100)));
  assert.ok(!prompt.includes("x".repeat(101)));
});

test("runWithVerification accepts a first-attempt pass", () => {
  const calls = [];
  const outcome = runWithVerification({
    prompt: "fix it",
    decision: decision("implementation"),
    verify: "npm test",
    escalate: true,
    deps: {
      runClaude: ({ decision: current, prompt }) => {
        calls.push({ model: current.model, prompt });
        return { status: 0 };
      },
      runVerify: () => ({ status: 0, output: "ok" })
    }
  });

  assert.equal(outcome.ok, true);
  assert.equal(outcome.attempts, 1);
  assert.deepEqual(
    calls.map((call) => call.model),
    ["sonnet"]
  );
});

test("runWithVerification escalates to the next tier and carries the failure", () => {
  const calls = [];
  let verifications = 0;
  const outcome = runWithVerification({
    prompt: "fix it",
    decision: decision("implementation"),
    verify: "npm test",
    escalate: true,
    deps: {
      runClaude: ({ decision: current, prompt }) => {
        calls.push({ model: current.model, prompt });
        return { status: 0 };
      },
      runVerify: () =>
        verifications++ === 0
          ? { status: 1, output: "boom" }
          : { status: 0, output: "ok" }
    }
  });

  assert.equal(outcome.ok, true);
  assert.equal(outcome.attempts, 2);
  assert.deepEqual(
    calls.map((call) => call.model),
    ["sonnet", "opus"]
  );
  assert.match(calls[1].prompt, /boom/);
  assert.match(calls[1].prompt, /Verification command: npm test/);
});

test("runWithVerification stops after a failed check without --escalate", () => {
  const calls = [];
  const outcome = runWithVerification({
    prompt: "fix it",
    decision: decision("implementation"),
    verify: "npm test",
    escalate: false,
    deps: {
      runClaude: ({ decision: current }) => {
        calls.push(current.model);
        return { status: 0 };
      },
      runVerify: () => ({ status: 1, output: "boom" })
    }
  });

  assert.equal(outcome.ok, false);
  assert.equal(outcome.attempts, 1);
  assert.deepEqual(calls, ["sonnet"]);
  assert.equal(outcome.verification.status, 1);
});

test("runWithVerification uses the full mechanical ladder", () => {
  const calls = [];
  const outcome = runWithVerification({
    prompt: "rename a file",
    decision: decision("mechanical"),
    verify: "npm test",
    escalate: true,
    deps: {
      runClaude: ({ decision: current }) => {
        calls.push(current.model);
        return { status: 0 };
      },
      runVerify: () => ({ status: 1, output: "nope" })
    }
  });

  assert.equal(outcome.ok, false);
  assert.equal(outcome.attempts, 3);
  assert.deepEqual(calls, ["haiku", "sonnet", "opus"]);
});

test("runWithVerification sonnet-first debugging retries with Opus", () => {
  const calls = [];
  const prompts = [];
  let verifications = 0;

  const outcome = runWithVerification({
    prompt: "debug the failing test",
    decision: decision("debugging"),
    verify: "npm test",
    escalate: true,
    config: { debuggingStrategy: "sonnet-first" },
    deps: {
      runClaude: ({ prompt, decision: current }) => {
        calls.push({
          model: current.model,
          effort: current.effort,
          strategy: current.strategy
        });
        prompts.push(prompt);
        return { status: 0 };
      },
      runVerify: () =>
        verifications++ === 0
          ? { status: 1, output: "AssertionError: expected 3, got 2" }
          : { status: 0, output: "ok" }
    }
  });

  assert.equal(outcome.ok, true);
  assert.equal(outcome.attempts, 2);
  assert.deepEqual(calls.map((call) => call.model), ["sonnet", "opus"]);
  assert.equal(calls[0].effort, "medium");
  assert.equal(calls[0].strategy, "sonnet-first");
  assert.equal(calls[1].effort, "high");
  assert.match(prompts[1], /AssertionError/);
  assert.match(prompts[1], /debug the failing test/);
});

test("runWithVerification sonnet-first debugging stays on Opus without escalation", () => {
  const calls = [];
  const outcome = runWithVerification({
    prompt: "debug the failing test",
    decision: decision("debugging"),
    verify: "npm test",
    escalate: false,
    config: { debuggingStrategy: "sonnet-first" },
    deps: {
      runClaude: ({ decision: current }) => {
        calls.push(current.model);
        return { status: 0 };
      },
      runVerify: () => ({ status: 0, output: "ok" })
    }
  });

  assert.equal(outcome.ok, true);
  assert.deepEqual(calls, ["opus"]);
});

test("runWithVerification sonnet-first debugging needs a verify command", () => {
  const calls = [];
  const outcome = runWithVerification({
    prompt: "debug the failing test",
    decision: decision("debugging"),
    verify: null,
    escalate: false,
    config: { debuggingStrategy: "sonnet-first" },
    deps: {
      runClaude: ({ decision: current }) => {
        calls.push(current.model);
        return { status: 0 };
      },
      runVerify: () => ({ status: 0, output: "" })
    }
  });

  assert.equal(outcome.ok, true);
  assert.deepEqual(calls, ["opus"]);
});

test("runWithVerification does not escalate beyond debugging", () => {
  const calls = [];
  const outcome = runWithVerification({
    prompt: "debug it",
    decision: decision("debugging"),
    verify: "npm test",
    escalate: true,
    deps: {
      runClaude: ({ decision: current }) => {
        calls.push(current.model);
        return { status: 0 };
      },
      runVerify: () => ({ status: 1, output: "nope" })
    }
  });

  assert.equal(outcome.ok, false);
  assert.equal(outcome.attempts, 1);
  assert.deepEqual(calls, ["opus"]);
});

test("runWithVerification uses config overrides for the escalation tier", () => {
  const calls = [];
  let verifications = 0;
  const outcome = runWithVerification({
    prompt: "fix it",
    decision: decision("implementation"),
    verify: "npm test",
    escalate: true,
    config: { tiers: { debugging: { model: "opus-custom", effort: "max" } } },
    deps: {
      runClaude: ({ decision: current }) => {
        calls.push({ model: current.model, effort: current.effort });
        return { status: 0 };
      },
      runVerify: () =>
        verifications++ === 0
          ? { status: 1, output: "boom" }
          : { status: 0, output: "ok" }
    }
  });

  assert.equal(outcome.ok, true);
  assert.deepEqual(calls[1], { model: "opus-custom", effort: "max" });
});

test("runWithVerification returns a Claude error without verifying", () => {
  let verified = false;
  const outcome = runWithVerification({
    prompt: "fix it",
    decision: decision("implementation"),
    verify: "npm test",
    escalate: true,
    deps: {
      runClaude: () => ({ error: "no claude" }),
      runVerify: () => {
        verified = true;
        return { status: 0, output: "" };
      }
    }
  });

  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, "no claude");
  assert.equal(verified, false);
});

test("runWithVerification without --verify uses the Claude exit status", () => {
  let verified = false;
  const outcome = runWithVerification({
    prompt: "fix it",
    decision: decision("implementation"),
    verify: null,
    escalate: false,
    deps: {
      runClaude: () => ({ status: 1 }),
      runVerify: () => {
        verified = true;
        return { status: 0, output: "" };
      }
    }
  });

  assert.equal(outcome.ok, false);
  assert.equal(outcome.run.status, 1);
  assert.equal(verified, false);
});

test("runWithVerification rejects escalation without a verification command", () => {
  assert.throws(
    () =>
      runWithVerification({
        prompt: "fix it",
        decision: decision("implementation"),
        verify: null,
        escalate: true,
        deps: {
          runClaude: () => ({ status: 0 }),
          runVerify: () => ({ status: 0, output: "" })
        }
      }),
    /escalate requires verify/
  );
});

test("runWithVerification accepts a passing check even if Claude exits non-zero", () => {
  const logs = [];
  const outcome = runWithVerification({
    prompt: "fix it",
    decision: decision("implementation"),
    verify: "npm test",
    escalate: true,
    deps: {
      runClaude: () => ({ status: 1 }),
      runVerify: () => ({ status: 0, output: "ok" }),
      log: (message) => logs.push(message)
    }
  });

  assert.equal(outcome.ok, true);
  assert.equal(outcome.attempts, 1);
  assert.ok(
    logs.some((line) => line.includes("claude exited with status 1"))
  );
});
