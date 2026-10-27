export const TASKS = [
  {
    id: "mech-questions",
    tier: "mechanical",
    fixture: "daily-quiz",
    baseline: { model: "sonnet", effort: "medium" },
    prompt:
      "grep the open questions Q-01..Q-11 in docs/SPEC.md and list them with one-line summaries. Do not edit anything.",
    allowedChanges: [],
    check: "mech-questions"
  },
  {
    id: "mech-features",
    tier: "mechanical",
    fixture: "daily-quiz",
    baseline: { model: "sonnet", effort: "medium" },
    prompt:
      "grep the feature table F-01..F-14 in docs/SPEC.md and list each id with its status. Do not edit anything.",
    allowedChanges: [],
    check: "mech-features"
  },
  {
    id: "mech-lots",
    tier: "mechanical",
    fixture: "daily-quiz",
    baseline: { model: "sonnet", effort: "medium" },
    prompt:
      'grep docs/SPEC.md and count the features in each lot (A, B, C). Return a JSON object like {"A": 0, "B": 0, "C": 0}. Do not edit anything.',
    allowedChanges: [],
    check: "mech-lots"
  },
  {
    id: "mech-questions-json",
    tier: "mechanical",
    fixture: "daily-quiz",
    baseline: { model: "sonnet", effort: "medium" },
    prompt:
      "grep the open questions Q-01..Q-11 in docs/SPEC.md and extract them as a JSON array of objects with keys id and question. Do not edit anything.",
    allowedChanges: [],
    check: "mech-questions-json"
  },
  {
    id: "impl-roadmap",
    tier: "implementation",
    fixture: "daily-quiz",
    baseline: { model: "opus", effort: "high" },
    prompt:
      "Create docs/ROADMAP.md grouping features F-01..F-14 into lots A, B and C, with a one-line description per feature and a short milestone plan. Do not modify other files.",
    allowedChanges: ["docs/ROADMAP.md"],
    check: "impl-roadmap"
  },
  {
    id: "impl-profile",
    tier: "implementation",
    fixture: "daily-quiz",
    baseline: { model: "opus", effort: "high" },
    prompt:
      "Create profil.yaml and parcours/python.yaml following the F-01 acceptance criteria in docs/SPEC.md. Do not modify other files.",
    allowedChanges: ["profil.yaml", "parcours/python.yaml"],
    check: "impl-profile"
  },
  {
    id: "impl-angular",
    tier: "implementation",
    fixture: "daily-quiz",
    baseline: { model: "opus", effort: "high" },
    prompt:
      "Create parcours/angular.yaml for beginners following the F-01 acceptance criteria in docs/SPEC.md, with at least 8 ordered notions and official Angular documentation URLs. Do not modify other files.",
    allowedChanges: ["parcours/angular.yaml"],
    check: "impl-angular"
  },
  {
    id: "impl-questions",
    tier: "implementation",
    fixture: "daily-quiz",
    baseline: { model: "opus", effort: "high" },
    prompt:
      "Create docs/QUESTIONS.md answering Q-01..Q-11 with a proposed answer and a one-line rationale for each. Do not modify other files.",
    allowedChanges: ["docs/QUESTIONS.md"],
    check: "impl-questions"
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
  },
  {
    id: "debug-parse",
    tier: "debugging",
    fixture: "buggy-python-parse",
    baseline: { model: "sonnet", effort: "medium" },
    prompt:
      "Debug the failing tests: there are bugs in duration.py, fix them so all tests pass. Do not modify test_duration.py or any other file.",
    allowedChanges: ["duration.py"],
    check: "debug-parse"
  },
  {
    id: "debug-state",
    tier: "debugging",
    fixture: "buggy-python-state",
    baseline: { model: "sonnet", effort: "medium" },
    prompt:
      "Debug the failing tests: there are bugs in cart.py, fix them so all tests pass. Do not modify test_cart.py or any other file.",
    allowedChanges: ["cart.py"],
    check: "debug-state"
  },
  {
    id: "debug-search",
    tier: "debugging",
    fixture: "buggy-python-search",
    baseline: { model: "sonnet", effort: "medium" },
    prompt:
      "Debug the failing tests: there are bugs in search.py, fix them so all tests pass. Do not modify test_search.py or any other file.",
    allowedChanges: ["search.py"],
    check: "debug-search"
  }
];
