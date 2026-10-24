import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export function readJsonFile(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Merge configs left-to-right. Later configs win; tiers are merged per field.
 */
export function mergeConfigs(...configs) {
  const out = {
    defaultTier: "implementation",
    tiers: {},
    extraKeywords: {}
  };

  for (const cfg of configs) {
    if (!cfg || typeof cfg !== "object") continue;

    if (typeof cfg.defaultTier === "string") {
      out.defaultTier = cfg.defaultTier;
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
  }

  return out;
}

export function configPaths(cwd = process.cwd()) {
  return {
    global: path.join(os.homedir(), ".claude", "model-router.json"),
    project: path.join(cwd, ".claude", "model-router.json")
  };
}

/**
 * Load global config first, then project config (project wins).
 */
export function loadConfig(cwd = process.cwd()) {
  const paths = configPaths(cwd);
  return mergeConfigs(
    readJsonFile(paths.global),
    readJsonFile(paths.project)
  );
}
