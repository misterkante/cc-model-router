export const DEFAULT_ROUTING = {
  mode: "per-turn",
  cacheAware: true,
  minTurnsBetweenSwitches: 2,
  minConfidence: 0.5
};

/**
 * Merge configs left-to-right. Later configs win; tiers are merged per field.
 * This is the same merge order as the CLI: global first, project second.
 */
export function mergeConfigs(...configs) {
  const out = {
    defaultTier: "implementation",
    debuggingStrategy: "opus",
    tiers: {},
    extraKeywords: {},
    routing: {}
  };

  for (const cfg of configs) {
    if (!cfg || typeof cfg !== "object") continue;

    if (typeof cfg.defaultTier === "string") {
      out.defaultTier = cfg.defaultTier;
    }

    if (
      cfg.debuggingStrategy === "opus" ||
      cfg.debuggingStrategy === "sonnet-first"
    ) {
      out.debuggingStrategy = cfg.debuggingStrategy;
    }

    if (cfg.debuggingFirst && typeof cfg.debuggingFirst === "object") {
      out.debuggingFirst = {
        ...(out.debuggingFirst || {}),
        ...cfg.debuggingFirst
      };
    }

    if (cfg.tiers && typeof cfg.tiers === "object") {
      for (const [tier, def] of Object.entries(cfg.tiers)) {
        out.tiers[tier] = { ...(out.tiers[tier] || {}), ...def };
      }
    }

    if (cfg.extraKeywords && typeof cfg.extraKeywords === "object") {
      for (const [tier, keywords] of Object.entries(cfg.extraKeywords)) {
        out.extraKeywords[tier] = [
          ...(out.extraKeywords[tier] || []),
          ...keywords
        ];
      }
    }

    if (cfg.routing && typeof cfg.routing === "object") {
      out.routing = { ...out.routing, ...cfg.routing };
    }
  }

  out.routing = { ...DEFAULT_ROUTING, ...out.routing };
  return out;
}
