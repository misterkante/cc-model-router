const DEFAULT_TIERS = {
  mechanical: {
    model: "haiku",
    effort: "none",
    weight: 3,
    keywords: [
      "rename",
      "format",
      "lint",
      "git commit",
      "git status",
      "git add",
      "git diff",
      "git checkout",
      "version bump",
      "changelog",
      "move file",
      "file move",
      "list files",
      "find file",
      "grep",
      "fix typo",
      "typo",
      "boilerplate",
      "scaffold",
      "delete file",
      "copy file",
      "commit"
    ]
  },
  implementation: {
    model: "sonnet",
    effort: "medium",
    weight: 2,
    keywords: [
      "implement",
      "add",
      "create",
      "build",
      "write",
      "refactor",
      "feature",
      "component",
      "api",
      "endpoint",
      "function",
      "tests",
      "update",
      "modify",
      "change",
      "wire",
      "integrate",
      "setup",
      "configure"
    ]
  },
  debugging: {
    model: "opus",
    effort: "high",
    weight: 3,
    keywords: [
      "debug",
      "bug",
      "error",
      "exception",
      "stack trace",
      "traceback",
      "failing",
      "failure",
      "flaky",
      "regression",
      "race condition",
      "investigate",
      "diagnose",
      "broken",
      "crash",
      "why does",
      "reproduce",
      "concurrency",
      "deadlock",
      "memory leak"
    ]
  }
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(text, keyword) {
  const kw = keyword.toLowerCase();
  if (kw.includes(" ")) {
    return text.includes(kw);
  }
  const re = new RegExp(`(^|[^a-z0-9_])${escapeRegExp(kw)}([^a-z0-9_]|$)`, "i");
  return re.test(text);
}

/**
 * Merge the built-in tier definitions with user overrides.
 * Config shape: { tiers: { mechanical: { model, effort, weight } }, extraKeywords: { mechanical: [...] } }
 */
export function effectiveTiers(config = {}) {
  const out = {};
  for (const [tier, def] of Object.entries(DEFAULT_TIERS)) {
    out[tier] = { ...def, ...(config.tiers?.[tier] || {}) };
  }
  for (const [tier, keywords] of Object.entries(config.extraKeywords || {})) {
    if (!out[tier]) continue;
    out[tier] = {
      ...out[tier],
      keywords: [...out[tier].keywords, ...keywords]
    };
  }
  return out;
}

/**
 * Classify a prompt into a task tier and return the recommended model.
 * Pure function: no IO, no side effects.
 */
export function classify(prompt, config = {}) {
  const text = String(prompt || "").toLowerCase();
  const tiers = effectiveTiers(config);

  const scores = {};
  const matched = {};
  const firstIndex = {};

  for (const [tier, def] of Object.entries(tiers)) {
    let score = 0;
    const hits = [];
    let idx = Infinity;

    for (const keyword of def.keywords || []) {
      if (!matchesKeyword(text, keyword)) continue;
      score += def.weight || 1;
      hits.push(keyword);
      const at = text.indexOf(String(keyword).toLowerCase());
      if (at !== -1 && at < idx) idx = at;
    }

    scores[tier] = score;
    matched[tier] = hits;
    firstIndex[tier] = idx;
  }

  const defaultTier =
    config.defaultTier && tiers[config.defaultTier]
      ? config.defaultTier
      : "implementation";

  const ranked = Object.keys(tiers).sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    if (firstIndex[a] !== firstIndex[b]) return firstIndex[a] - firstIndex[b];
    return 0;
  });

  const top = ranked[0];
  const hasSignal = scores[top] > 0;
  const tier = hasSignal ? top : defaultTier;
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const confidence = hasSignal
    ? Math.round((scores[top] / total) * 100) / 100
    : 0.4;

  const def = tiers[tier];
  return {
    tier,
    model: def.model,
    effort: def.effort,
    confidence,
    matched: matched[tier] || [],
    scores
  };
}

export { DEFAULT_TIERS };
