import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function ids(prefix, from, to) {
  return Array.from(
    { length: to - from + 1 },
    (_, i) => `${prefix}${String(from + i).padStart(2, "0")}`
  );
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
      "    docs = n.get('docs') or ([n['url']] if n.get('url') else [])",
      "    urls = []",
      "    for d in docs:",
      "        if isinstance(d, str): urls.append(d)",
      "        elif isinstance(d, dict) and d.get('url'): urls.append(d['url'])",
      "    assert urls and all(u.startswith('http') for u in urls), 'notion.docs.url'",
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

  "debug-calc": ({ dir, beforeHashes, afterHashes }) => {
    if (beforeHashes["test_calc.py"] !== afterHashes["test_calc.py"]) {
      return { pass: false, detail: "test_calc.py was modified" };
    }
    const res = spawnSync("python3", ["-m", "unittest", "-q", "test_calc"], {
      cwd: dir,
      encoding: "utf8"
    });
    return {
      pass: res.status === 0,
      detail:
        res.status === 0
          ? "tests pass"
          : String(res.stderr || res.stdout || "").trim().slice(0, 300)
    };
  }
};

export function runCheck(name, ctx) {
  const fn = CHECKS[name];
  if (!fn) return { pass: false, detail: `unknown check: ${name}` };
  try {
    return fn(ctx);
  } catch (err) {
    return { pass: false, detail: err.message };
  }
}
