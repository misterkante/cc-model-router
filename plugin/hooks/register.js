import { classify } from "../lib/classifier.js";
import { DEFAULT_ROUTING, mergeConfigs } from "../lib/config.js";

const TIER_RANK = {
  mechanical: 0,
  implementation: 1,
  debugging: 2
};

const state = {
  turnNumber: 0,
  lastSwitchTurn: -1,
  lastSwitchModel: null,
  lastDecision: null,
  sessionDecision: null
};

const pending = [];
const byTurn = new Map();

function modelFamily(model) {
  const value = String(model || "").toLowerCase();
  if (value.includes("haiku")) return "haiku";
  if (value.includes("sonnet")) return "sonnet";
  if (value.includes("opus")) return "opus";
  return null;
}

function rankForTier(tier) {
  return TIER_RANK[tier] ?? TIER_RANK.implementation;
}

function rankForModel(model) {
  const family = modelFamily(model);
  return family ? rankForTier(family === "haiku" ? "mechanical" : family === "opus" ? "debugging" : "implementation") : -1;
}

async function readJson($, path) {
  try {
    if (!(await $.fs.exists(path))) return null;
    return JSON.parse(await $.fs.read(path));
  } catch {
    return null;
  }
}

async function loadConfig($) {
  const cwd = await $.session.cwd();
  const home = (await $.env.get("HOME")) || "";
  const configDir =
    (await $.env.get("CC_ROUTER_CONFIG_DIR")) ||
    (home ? `${home}/.claude` : ".claude");
  const globalConfig = await readJson($, `${configDir}/model-router.json`);
  const projectConfig = await readJson($, `${cwd}/.claude/model-router.json`);
  return mergeConfigs(globalConfig, projectConfig);
}

function applyDecision(result, routing) {
  return {
    action: "apply",
    model: result.model,
    effort: result.effort,
    result
  };
}

function chooseDecision(result, config, currentModel) {
  const routing = config.routing || DEFAULT_ROUTING;

  if (routing.mode === "off") {
    return { action: "keep", result, reason: "routing off" };
  }

  if (routing.mode === "session" && state.sessionDecision) {
    return state.sessionDecision;
  }

  const current = modelFamily(currentModel);
  const recommended = modelFamily(result.model);
  if (!recommended) {
    return { action: "keep", result, reason: "unknown model" };
  }

  if (!current || current === recommended) {
    const decision = applyDecision({ ...result, model: recommended }, routing);
    if (routing.mode === "session") state.sessionDecision = decision;
    return decision;
  }

  if (!routing.cacheAware) {
    const decision = applyDecision({ ...result, model: recommended }, routing);
    if (routing.mode === "session") state.sessionDecision = decision;
    return decision;
  }

  const currentRank = rankForModel(current);
  const recommendedRank = rankForTier(result.tier);
  const turnsSinceSwitch = state.turnNumber + 1 - state.lastSwitchTurn;
  const enoughTurns =
    turnsSinceSwitch >= (routing.minTurnsBetweenSwitches ?? 2);
  const confident =
    (result.confidence ?? 0) >= (routing.minConfidence ?? 0.5);

  if (recommendedRank > currentRank) {
    const decision = applyDecision({ ...result, model: recommended }, routing);
    if (routing.mode === "session") state.sessionDecision = decision;
    return decision;
  }

  if (recommendedRank < currentRank && enoughTurns && confident) {
    const decision = applyDecision({ ...result, model: recommended }, routing);
    if (routing.mode === "session") state.sessionDecision = decision;
    return decision;
  }

  return {
    action: "keep",
    result,
    reason: recommendedRank < currentRank ? "cache-aware cooldown" : "same tier"
  };
}

export function register(on) {
  on("session.start", async ($, e, next) => {
    state.turnNumber = 0;
    state.lastSwitchTurn = -1;
    state.lastSwitchModel = null;
    state.lastDecision = null;
    state.sessionDecision = null;
    pending.length = 0;
    byTurn.clear();

    await $.command
      .register({
        name: "ccmr",
        description: "Show the model router's current decision and config"
      })
      .catch(() => {});

    return next(e);
  });

  on("prompt.submit", async ($, e, next) => {
    if (!e.text || /^\s*\//.test(e.text)) return next(e);

    const config = await loadConfig($);
    const result = classify(e.text, config);
    const currentModel = await $.session.model().catch(() => undefined);
    const decision = chooseDecision(result, config, currentModel);
    pending.push({ text: e.text, result, decision });
    return next(e);
  }).catch(async ($, e, next) => {
    // The router only observes prompts. If it fails, let the prompt through.
    return next(e);
  });

  on("turn.start", async ($, e, next) => {
    state.turnNumber += 1;

    let index = pending.findIndex((item) => item.text === e.text);
    if (index === -1) index = 0;
    const item = pending.splice(index, 1)[0];
    byTurn.set(e.turnId, {
      text: item?.text || e.text,
      result: item?.result || null,
      decision: item?.decision || { action: "keep", result: null },
      applied: false
    });

    return next(e);
  });

  on("turn.step", async function* ($, e, next) {
    const item = byTurn.get(e.turnId);
    if (!item || e.agentId) {
      return yield* next(e);
    }

    if (!item.applied) {
      item.applied = true;
      state.lastDecision = {
        turnId: e.turnId,
        text: item.text,
        result: item.result,
        decision: item.decision
      };

      if (
        item.decision.action === "apply" &&
        modelFamily(e.model) !== modelFamily(item.decision.model)
      ) {
        state.lastSwitchTurn = state.turnNumber;
        state.lastSwitchModel = item.decision.model;
      }
    }

    if (item.decision.action !== "apply") {
      return yield* next(e);
    }

    return yield* next({
      ...e,
      model: item.decision.model,
      effort: item.decision.effort
    });
  });

  on("turn.complete", async ($, e, next) => {
    byTurn.delete(e.turnId);
    return next(e);
  });

  on("command.run", { command: "ccmr" }, async ($, e) => {
    const config = await loadConfig($);
    const current = await $.session.model().catch(() => "unknown");
    const routing = config.routing || DEFAULT_ROUTING;
    const last = state.lastDecision;
    const lastLine = last?.decision?.action === "apply"
      ? `${last.decision.model}/${last.decision.effort} for "${last.text}"`
      : last
        ? `kept ${current} (${last.decision.reason || "no switch"}) for "${last.text}"`
        : "no decision yet";

    return {
      text: [
        `cc-model-router: current=${current}`,
        `last=${lastLine}`,
        `mode=${routing.mode} cacheAware=${routing.cacheAware} minTurns=${routing.minTurnsBetweenSwitches}`
      ].join("\n")
    };
  });
}
