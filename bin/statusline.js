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

const tiers = effectiveTiers(loadConfig());
const model = input?.model?.display_name || input?.model?.id || "model?";
const mapping = Object.entries(tiers)
  .map(([tier, def]) => `${tier[0].toUpperCase()}:${def.model}`)
  .join(" ");

console.log(`${model} · ${mapping}`);
