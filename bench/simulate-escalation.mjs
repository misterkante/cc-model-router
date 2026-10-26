#!/usr/bin/env node
/**
 * Simulate a "Sonnet-first debugging" policy from the published 48-run
 * dataset. This does not call any model and does not change the reference
 * results: it re-uses the Sonnet baseline records and the Opus routed records.
 *
 * Policy: try Sonnet first. If the Sonnet run was not accepted, retry with
 * Opus. The Opus retry cost is proxied by the Opus run from the routed variant.
 *
 * Caveats:
 * - The Opus retry would run on the failed Sonnet working tree and receive the
 *   failure output, so its real cost may differ from the fresh Opus run.
 * - The simulation assumes the Opus retry succeeds whenever the fresh Opus run
 *   succeeded. It does not model retry latency or a second failure.
 * - This is an analysis, not a new benchmark. Label it as such in the docs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARGS = process.argv.slice(2);

function arg(name, fallback) {
  const index = ARGS.indexOf(`--${name}`);
  return index === -1 ? fallback : ARGS[index + 1];
}

const dataFile = arg(
  "data",
  path.join(ROOT, "docs", "benchmarks", "2026-10-26-expanded.json")
);
const asJson = ARGS.includes("--json");
const outFile = arg("out", null);

const data = JSON.parse(readFileSync(dataFile, "utf8"));
const rows = data.results.filter((row) => row.tier === "debugging");
if (!rows.length) {
  console.error("no debugging rows in the dataset");
  process.exit(2);
}

const byTaskRepeat = new Map();
for (const row of rows) {
  const key = `${row.task}\u0000${row.repeat}`;
  const entry = byTaskRepeat.get(key) || { task: row.task, repeat: row.repeat };
  entry[row.variant] = row;
  byTaskRepeat.set(key, entry);
}

const pairs = [...byTaskRepeat.values()].sort(
  (a, b) => a.task.localeCompare(b.task) || a.repeat - b.repeat
);

const records = [];
for (const pair of pairs) {
  const sonnet = pair.baseline;
  const opus = pair.routed;
  if (!sonnet || !opus) {
    console.error(`missing variant for ${pair.task} repeat ${pair.repeat}`);
    process.exit(2);
  }

  const sonnetCost = sonnet.cost_usd ?? 0;
  const opusCost = opus.cost_usd ?? 0;
  const sonnetFirstCost = sonnet.accepted
    ? sonnetCost
    : sonnetCost + opusCost;
  const sonnetFirstAccepted = sonnet.accepted ? true : Boolean(opus.accepted);

  records.push({
    task: pair.task,
    repeat: pair.repeat,
    sonnet: {
      cost: sonnetCost,
      accepted: Boolean(sonnet.accepted),
      tokens: sonnet.tokens ?? null
    },
    opus: {
      cost: opusCost,
      accepted: Boolean(opus.accepted),
      tokens: opus.tokens ?? null
    },
    sonnetFirst: {
      cost: sonnetFirstCost,
      accepted: sonnetFirstAccepted,
      attempts: sonnet.accepted ? 1 : 2
    }
  });
}

function summarize(key) {
  const totalCost = records.reduce((sum, row) => sum + row[key].cost, 0);
  const accepted = records.filter((row) => row[key].accepted).length;
  return {
    runs: records.length,
    accepted,
    passRate: accepted / records.length,
    totalCostUsd: Number(totalCost.toFixed(6)),
    costPerAcceptedUsd: accepted
      ? Number((totalCost / accepted).toFixed(6))
      : null
  };
}

const summary = {
  source: path.relative(ROOT, dataFile),
  policy: "sonnet-first debugging, Opus retry on failed verification",
  caveat:
    "Simulation from existing records; Opus retry cost is proxied by the fresh Opus run. Not a new benchmark.",
  sonnetOnly: summarize("sonnet"),
  opusFirst: summarize("opus"),
  sonnetFirst: summarize("sonnetFirst"),
  deltaVsOpusFirst: {
    totalCostPct: Number(
      (
        ((summarize("sonnetFirst").totalCostUsd -
          summarize("opus").totalCostUsd) /
          summarize("opus").totalCostUsd) *
        100
      ).toFixed(1)
    ),
    costPerAcceptedPct: Number(
      (
        ((summarize("sonnetFirst").costPerAcceptedUsd -
          summarize("opus").costPerAcceptedUsd) /
          summarize("opus").costPerAcceptedUsd) *
        100
      ).toFixed(1)
    )
  },
  records
};

if (outFile) {
  writeFileSync(outFile, `${JSON.stringify(summary, null, 2)}\n`);
}

if (asJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log("Sonnet-first debugging simulation (from the 48-run dataset)");
  console.log("");
  console.log(
    "task          rep  sonnet           opus             sonnet-first"
  );
  console.log(
    "                  cost   acc       cost   acc       cost   acc  att"
  );
  for (const row of records) {
    const fmt = (value) => value.toFixed(4).padStart(7);
    console.log(
      `${row.task.padEnd(13)} ${String(row.repeat).padEnd(4)} ` +
        `${fmt(row.sonnet.cost)}  ${row.sonnet.accepted ? "yes" : "no "}     ` +
        `${fmt(row.opus.cost)}  ${row.opus.accepted ? "yes" : "no "}     ` +
        `${fmt(row.sonnetFirst.cost)}  ${row.sonnetFirst.accepted ? "yes" : "no "}  ` +
        `${row.sonnetFirst.attempts}`
    );
  }
  console.log("");
  for (const [label, value] of [
    ["Sonnet only", summary.sonnetOnly],
    ["Opus first", summary.opusFirst],
    ["Sonnet first + Opus retry", summary.sonnetFirst]
  ]) {
    console.log(
      `${label.padEnd(26)} ${value.accepted}/${value.runs} accepted  ` +
        `$${value.totalCostUsd.toFixed(4)} total  ` +
        `$${value.costPerAcceptedUsd.toFixed(4)}/accepted`
    );
  }
  console.log("");
  console.log(
    `Delta vs Opus first: ${summary.deltaVsOpusFirst.totalCostPct}% total cost, ` +
      `${summary.deltaVsOpusFirst.costPerAcceptedPct}% cost/accepted`
  );
  console.log("");
  console.log(summary.caveat);
}
