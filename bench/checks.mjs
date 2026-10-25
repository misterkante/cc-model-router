import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function ids(prefix, from, to) {
  return Array.from(
    { length: to - from + 1 },
    (_, i) => `${prefix}${String(from + i).padStart(2, "0")}`
  );
}

function extractJson(text) {
  if (!text) return null;

  const candidates = [];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1]);
  candidates.push(text);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate.trim());
    } catch {
      // Fall through to the substring attempt.
    }

    const start = candidate.search(/[\[{]/);
    const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        // Try the next candidate.
      }
    }
  }

  return null;
}

function normalizeQuestionId(value) {
  const match = String(value || "")
    .toUpperCase()
    .match(/^Q-?0*(\d{1,2})$/);
  return match
    ? `Q-${String(Number(match[1])).padStart(2, "0")}`
    : String(value || "").toUpperCase();
}

const COLLECT_URLS_LINES = [
  "def collect_urls(value):",
  "    if isinstance(value, str):",
  "        return [value] if value.startswith('http') else []",
  "    if isinstance(value, list):",
  "        out = []",
  "        for item in value:",
  "            out.extend(collect_urls(item))",
  "        return out",
  "    if isinstance(value, dict):",
  "        out = []",
  "        for v in value.values():",
  "            out.extend(collect_urls(v))",
  "        return out",
  "    return []",
  ""
];

function pythonDebugCheck(testFile, module) {  return ({ dir, beforeHashes, afterHashes }) => {
    if (beforeHashes[testFile] !== afterHashes[testFile]) {
      return { pass: false, detail: `${testFile} was modified` };
    }

    const res = spawnSync("python3", ["-m", "unittest", "-q", module], {
      cwd: dir,
      encoding: "utf8",
      timeout: 15000,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
    });

    if (res.error && res.error.code === "ETIMEDOUT") {
      return { pass: false, detail: "tests timed out" };
    }

    return {
      pass: res.status === 0,
      detail:
        res.status === 0
          ? "tests pass"
          : String(res.stderr || res.stdout || "").trim().slice(0, 300)
    };
  };
}

const CHECKS = {
  "mech-questions": ({ result }) => {
    const text = result.result || "";
    const missing = ids("Q-", 1, 11).filter((id) => !text.includes(id));
    return {
      pass: missing.length === 0,
      detail: missing.length
        ? `missing ${missing.join(", ")}`
        : "all Q-01..Q-11 present"
    };
  },

  "mech-features": ({ result }) => {
    const text = result.result || "";
    const missing = ids("F-", 1, 14).filter((id) => !text.includes(id));
    return {
      pass: missing.length === 0,
      detail: missing.length
        ? `missing ${missing.join(", ")}`
        : "all F-01..F-14 present"
    };
  },

  "mech-lots": ({ result }) => {
    const data = extractJson(result.result || "");
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { pass: false, detail: "no JSON object found" };
    }

    const get = (key) => {
      const candidates = [
        key,
        `Lot ${key}`,
        `lot${key}`,
        `lot_${key.toLowerCase()}`,
        key.toLowerCase()
      ];
      for (const candidate of candidates) {
        if (data[candidate] !== undefined) return data[candidate];
      }
      return undefined;
    };

    const actual = { A: get("A"), B: get("B"), C: get("C") };
    const expected = { A: 9, B: 3, C: 2 };
    const pass = Object.keys(expected).every(
      (key) => Number(actual[key]) === expected[key]
    );
    return {
      pass,
      detail: pass
        ? "counts 9/3/2"
        : `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`
    };
  },

  "mech-questions-json": ({ result }) => {
    const data = extractJson(result.result || "");
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.questions)
        ? data.questions
        : null;

    if (!list) return { pass: false, detail: "no JSON array found" };

    const expected = ids("Q-", 1, 11);
    const byId = new Map(
      list.map((item) => [normalizeQuestionId(item?.id), item])
    );
    const missing = expected.filter((id) => !byId.has(id));
    const thin = expected.filter((id) => {
      const item = byId.get(id);
      return (
        !item ||
        typeof item.question !== "string" ||
        item.question.trim().length < 10
      );
    });

    const pass = list.length === 11 && missing.length === 0 && thin.length === 0;
    return {
      pass,
      detail: pass
        ? "11 questions with text"
        : `count=${list.length}, missing=${missing.join(",") || "-"}, empty=${thin.join(",") || "-"}`
    };
  },

  "impl-roadmap": ({ dir }) => {
    const file = path.join(dir, "docs", "ROADMAP.md");
    if (!existsSync(file)) {
      return { pass: false, detail: "docs/ROADMAP.md missing" };
    }
    const text = readFileSync(file, "utf8");
    const missing = ids("F-", 1, 14).filter((id) => !text.includes(id));
    const missingLots = ["Lot A", "Lot B", "Lot C"].filter(
      (lot) => !text.includes(lot)
    );
    const pass = missing.length === 0 && missingLots.length === 0;
    return {
      pass,
      detail: pass
        ? "all features + lots present"
        : `missing features: ${missing.join(", ") || "-"}; missing lots: ${missingLots.join(", ") || "-"}`
    };
  },

  "impl-profile": ({ dir }) => {
    const required = ["profil.yaml", "parcours/python.yaml"];
    const missingFiles = required.filter(
      (file) => !existsSync(path.join(dir, file))
    );
    if (missingFiles.length) {
      return { pass: false, detail: `missing ${missingFiles.join(", ")}` };
    }

    const script = [
      "import yaml",
      ...COLLECT_URLS_LINES,
      "profil = yaml.safe_load(open('profil.yaml'))",
      "parcours = yaml.safe_load(open('parcours/python.yaml'))",
      "assert isinstance(profil, dict), 'profil: not a mapping'",
      "assert isinstance(profil.get('langue'), str) and profil['langue'].strip(), 'profil.langue'",
      "pistes = profil.get('pistes_actives') or profil.get('pistes')",
      "assert isinstance(pistes, list) and pistes, 'profil.pistes_actives'",
      "volume = profil.get('volume_quotidien') or profil.get('volume')",
      "assert isinstance(volume, dict) and volume, 'profil.volume_quotidien'",
      "assert isinstance(parcours, dict), 'parcours: not a mapping'",
      "notions = parcours.get('notions')",
      "assert isinstance(notions, list) and notions, 'parcours.notions'",
      "ids = []",
      "for n in notions:",
      "    assert isinstance(n, dict), 'notion: not a mapping'",
      "    assert n.get('id'), 'notion.id'",
      "    assert n.get('titre'), 'notion.titre'",
      "    urls = collect_urls(n)",
      "    assert urls, 'notion has no URL'",
      "    ids.append(n['id'])",
      "assert len(ids) == len(set(ids)), 'duplicate notion id'",
      "print('ok')"
    ].join("\n");

    const res = spawnSync("python3", ["-c", script], {
      cwd: dir,
      encoding: "utf8"
    });
    return {
      pass: res.status === 0,
      detail:
        res.status === 0
          ? "YAML structure ok"
          : String(res.stderr || res.stdout || "").trim().slice(0, 300)
    };
  },

  "impl-angular": ({ dir }) => {
    const file = path.join(dir, "parcours", "angular.yaml");
    if (!existsSync(file)) {
      return { pass: false, detail: "parcours/angular.yaml missing" };
    }

    const script = [
      "import yaml",
      ...COLLECT_URLS_LINES,
      "p = yaml.safe_load(open('parcours/angular.yaml'))",
      "assert isinstance(p, dict), 'not a mapping'",
      "notions = p.get('notions')",
      "assert isinstance(notions, list) and len(notions) >= 8, 'notions >= 8'",
      "ids = []",
      "for n in notions:",
      "    assert isinstance(n, dict), 'notion not a mapping'",
      "    assert n.get('id'), 'notion.id'",
      "    assert n.get('titre'), 'notion.titre'",
      "    urls = collect_urls(n)",
      "    assert urls, 'notion has no URL'",
      "    assert any('angular.dev' in u or 'angular.io' in u for u in urls), 'official angular URL'",
      "    ids.append(n['id'])",
      "assert len(ids) == len(set(ids)), 'duplicate notion id'",
      "print('ok')"
    ].join("\n");

    const res = spawnSync("python3", ["-c", script], {
      cwd: dir,
      encoding: "utf8"
    });
    return {
      pass: res.status === 0,
      detail:
        res.status === 0
          ? "Angular YAML structure ok"
          : String(res.stderr || res.stdout || "").trim().slice(0, 300)
    };
  },

  "impl-questions": ({ dir }) => {
    const file = path.join(dir, "docs", "QUESTIONS.md");
    if (!existsSync(file)) {
      return { pass: false, detail: "docs/QUESTIONS.md missing" };
    }

    const lines = readFileSync(file, "utf8").split("\n");
    const missing = [];
    const thin = [];

    for (const id of ids("Q-", 1, 11)) {
      const index = lines.findIndex((line) => line.includes(id));
      if (index === -1) {
        missing.push(id);
        continue;
      }
      const window = lines
        .slice(index, index + 3)
        .join(" ")
        .replace(id, "")
        .replace(/[|\-:\s]/g, "");
      if (window.length < 20) thin.push(id);
    }

    const pass = missing.length === 0 && thin.length === 0;
    return {
      pass,
      detail: pass
        ? "11 questions answered"
        : `missing=${missing.join(",") || "-"}, too short=${thin.join(",") || "-"}`
    };
  },

  "debug-calc": pythonDebugCheck("test_calc.py", "test_calc"),
  "debug-parse": pythonDebugCheck("test_duration.py", "test_duration"),
  "debug-state": pythonDebugCheck("test_cart.py", "test_cart"),
  "debug-search": pythonDebugCheck("test_search.py", "test_search")
};

export const CHECK_NAMES = Object.keys(CHECKS);

export function hasCheck(name) {
  return Boolean(CHECKS[name]);
}

export function runCheck(name, ctx) {
  const fn = CHECKS[name];
  if (!fn) return { pass: false, detail: `unknown check: ${name}` };
  try {
    return fn(ctx);
  } catch (err) {
    return { pass: false, detail: err.message };
  }
}
