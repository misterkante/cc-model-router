export const TASKS = [
  {
    id: "mech-questions",
    tier: "mechanical",
    fixture: "devquiz",
    baseline: { model: "sonnet", effort: "medium" },
    prompt:
      "grep the open questions Q-01..Q-11 in docs/SPEC.md and list them with one-line summaries. Do not edit anything.",
    allowedChanges: [],
    check: "mech-questions"
  },
  {
    id: "mech-features",
    tier: "mechanical",
    fixture: "devquiz",
    baseline: { model: "sonnet", effort: "medium" },
    prompt:
      "grep the feature table F-01..F-14 in docs/SPEC.md and list each id with its status. Do not edit anything.",
    allowedChanges: [],
    check: "mech-features"
  },
  {
    id: "impl-roadmap",
    tier: "implementation",
    fixture: "devquiz",
    baseline: { model: "opus", effort: "high" },
    prompt:
      "Create docs/ROADMAP.md grouping features F-01..F-14 into lots A, B and C, with a one-line description per feature and a short milestone plan. Do not modify other files.",
    allowedChanges: ["docs/ROADMAP.md"],
    check: "impl-roadmap"
  },
  {
    id: "impl-profile",
    tier: "implementation",
    fixture: "devquiz",
    baseline: { model: "opus", effort: "high" },
    prompt:
      "Create profil.yaml and parcours/python.yaml following the F-01 acceptance criteria in docs/SPEC.md. Do not modify other files.",
    allowedChanges: ["profil.yaml", "parcours/python.yaml"],
    check: "impl-profile"
  },
  {
    id: "debug-calc",
    tier: "debugging",
    fixture: "buggy-python",
    baseline: { model: "sonnet", effort: "medium" },
    prompt:
      "Debug the failing tests: there is a bug in calc.py, fix it so all tests pass. Do not modify test_calc.py or any other file.",
    allowedChanges: ["calc.py"],
    check: "debug-calc"
  }
];
