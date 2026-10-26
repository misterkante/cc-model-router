#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { effectiveTiers } from "../src/classifier.js";
import { loadConfig } from "../src/config.js";

let input = {};
try {
  const raw = readFileSync(0, "utf8");
  input = raw.trim() ? JSON.parse(raw) : {};
} catch {
  input = {};
}

const config = loadConfig();
const tiers = effectiveTiers(config);
const firstDebugging = config.debuggingFirst?.model || "sonnet";
const model = input?.model?.display_name || input?.model?.id || "model?";
const mapping = Object.entries(tiers)
  .map(([tier, def]) => {
    if (tier === "debugging" && config.debuggingStrategy === "sonnet-first") {
      return `D:${firstDebugging}→${def.model}`;
    }
    return `${tier[0].toUpperCase()}:${def.model}`;
  })
  .join(" ");

console.log(`${model} · ${mapping}`);
