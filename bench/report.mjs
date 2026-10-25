#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const file = argv.find((arg) => !arg.startsWith("--"));
const outIndex = argv.indexOf("--out");
const outFile = outIndex === -1 ? null : argv[outIndex + 1];

if (!file) {
  console.error("usage: node bench/report.mjs <results.json> [--out report.md]");
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, "utf8"));
const results = data.results || [];

function accepted(record) {
  return record.accepted ?? record.check?.pass ?? false;
}

function money(value) {
  return value == null ? "-" : `$${Number(value).toFixed(4)}`;
}

function number(value) {
  return value == null ? "-" : Number(value).toLocaleString("en-US");
}

function percent(value) {
  return value == null ? "-" : `${(value * 100).toFixed(1)}%`;
}

function aggregate(rows) {
  const ok = rows.filter(accepted);
  const cost = rows.reduce((sum, record) => sum + (record.cost_usd || 0), 0);
  const tokens = rows.reduce((sum, record) => sum + (record.tokens || 0), 0);
  return {
    runs: rows.length,
    accepted: ok.length,
    passRate: rows.length ? ok.length / rows.length : 0,
    cost,
    costPerAccepted: ok.length ? cost / ok.length : null,
    tokens,
    tokensPerAccepted: ok.length ? Math.round(tokens / ok.length) : null
  };
}

function modelList(rows) {
  const models = [...new Set(rows.flatMap((record) => record.model || []))];
  return models.join(", ") || "-";
}

const variants = [...new Set(results.map((record) => record.variant))];
const tasks = [...new Set(results.map((record) => record.task))];
const tiers = [...new Set(results.map((record) => record.tier))];

const lines = [];
lines.push("# Benchmark report");
lines.push("");
lines.push(`Source: \`${file}\`  `);
lines.push(
  `Generated: ${data.generatedAt || "?"} · Claude Code ${data.claudeVersion || "?"} · router ${data.routerVersion || "?"} · repeats ${data.repeats || 1}`
);
lines.push("");

lines.push("## Global");
lines.push("");
lines.push(
  "| Variant | Runs | Accepted | Pass rate | Cost | Cost / accepted | Tokens | Tokens / accepted |"
);
lines.push("|---|---|---|---|---|---|---|---|");
for (const variant of variants) {
  const stats = aggregate(
    results.filter((record) => record.variant === variant)
  );
  lines.push(
    `| ${variant} | ${stats.runs} | ${stats.accepted} | ${percent(stats.passRate)} | ${money(stats.cost)} | ${money(stats.costPerAccepted)} | ${number(stats.tokens)} | ${number(stats.tokensPerAccepted)} |`
  );
}
lines.push("");

lines.push("## By tier");
lines.push("");
lines.push(
  "| Tier | Variant | Runs | Accepted | Pass rate | Cost / accepted | Tokens / accepted |"
);
lines.push("|---|---|---|---|---|---|---|");
for (const tier of tiers) {
  for (const variant of variants) {
    const stats = aggregate(
      results.filter(
        (record) => record.tier === tier && record.variant === variant
      )
    );
    if (stats.runs === 0) continue;
    lines.push(
      `| ${tier} | ${variant} | ${stats.runs} | ${stats.accepted} | ${percent(stats.passRate)} | ${money(stats.costPerAccepted)} | ${number(stats.tokensPerAccepted)} |`
    );
  }
}
lines.push("");

lines.push("## By task");
lines.push("");
lines.push(
  "| Task | Tier | Routed | Routed pass | Routed $/ok | Baseline | Baseline pass | Baseline $/ok | Δ cost / accepted |"
);
lines.push("|---|---|---|---|---|---|---|---|---|");
for (const task of tasks) {
  const routedRows = results.filter(
    (record) => record.task === task && record.variant === "routed"
  );
  const baselineRows = results.filter(
    (record) => record.task === task && record.variant === "baseline"
  );
  const routed = aggregate(routedRows);
  const baseline = aggregate(baselineRows);
  const delta =
    routed.costPerAccepted != null && baseline.costPerAccepted != null
      ? (routed.costPerAccepted - baseline.costPerAccepted) /
        baseline.costPerAccepted
      : null;

  lines.push(
    `| ${task} | ${routedRows[0]?.tier || baselineRows[0]?.tier || "-"} | ${modelList(routedRows)} | ${routed.accepted}/${routed.runs} | ${money(routed.costPerAccepted)} | ${modelList(baselineRows)} | ${baseline.accepted}/${baseline.runs} | ${money(baseline.costPerAccepted)} | ${delta == null ? "-" : `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`} |`
  );
}
lines.push("");

const failures = results.filter((record) => !accepted(record));
lines.push("## Failures");
lines.push("");
if (failures.length === 0) {
  lines.push("None.");
} else {
  for (const failure of failures) {
    const repeat = failure.repeat ? ` / repeat ${failure.repeat}` : "";
    const unexpected = (failure.unexpectedChanges || []).length
      ? ` (unexpected: ${failure.unexpectedChanges.join(", ")})`
      : "";
    lines.push(
      `- ${failure.task} / ${failure.variant}${repeat}: ${failure.check?.detail || "?"}${unexpected}`
    );
  }
}
lines.push("");

const unexpected = results.filter(
  (record) => (record.unexpectedChanges || []).length > 0
);
lines.push("## Unexpected file changes");
lines.push("");
if (unexpected.length === 0) {
  lines.push("None.");
} else {
  for (const record of unexpected) {
    lines.push(
      `- ${record.task} / ${record.variant}: ${record.unexpectedChanges.join(", ")}`
    );
  }
}
lines.push("");

const output = lines.join("\n");
if (outFile) {
  writeFileSync(outFile, output);
  console.log(`Wrote ${outFile}`);
} else {
  console.log(output);
}
