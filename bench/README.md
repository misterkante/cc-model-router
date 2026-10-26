# Benchmark qualité — protocole

> Document **canonique** du process benchmark. Toute contribution suit ce document.
> Résultats publiés : [`docs/BENCHMARK.md`](../docs/BENCHMARK.md) et [`docs/benchmarks/`](../docs/benchmarks/).

## 1. Question

Le routing économise-t-il du **coût/quota** **sans dégrader la qualité** ?

Le benchmark ne cherche **pas** à prouver une économie de tokens bruts. Un modèle moins cher peut être plus bavard ; l'économie vient du prix/poids de quota par token. Toute publication qui parle de « tokens économisés » est hors protocole.

Ce que le benchmark ne mesure pas (encore) : style, maintenabilité, architecture, sessions interactives longues, erreurs de classification, quota exact d'un abonnement.

## 2. Vocabulaire

| Terme | Définition |
|---|---|
| **Run** | Une exécution d'une tâche dans une variante. |
| **Variante** | `routed` (le router choisit) ou `baseline` (modèle de référence imposé). |
| **Tâche acceptée** | Check vert, code de sortie 0 **et** aucun fichier hors `allowedChanges`. |
| **Check** | Fonction déterministe, locale, sans réseau, qui rend `{ pass, detail }`. |
| **Fixture** | Dépôt minimal et synthétique dans lequel le run travaille. |
| **Baseline** | Modèle/effort qu'un utilisateur aurait utilisés sans le router. |
| **Coût API-équivalent** | `total_cost_usd` renvoyé par Claude Code ; proxy du quota, pas une facture. |
| **Contrefactuel** | Le baseline choisi ; le gain dépend de lui (voir §3.6). |

## 3. Protocole

### 3.1 Isolation

- Chaque run part d'une **copie neuve** de la fixture (`mkdtemp` + `cpSync`). Le dépôt source n'est jamais modifié.
- La config du router est déplacée via `CC_ROUTER_CONFIG_DIR` vers un **répertoire temporaire vide** : le routing benchmarké est celui par défaut, sans config projet ni config globale personnelle.
- Le hook est chargé **uniquement pour la variante routée** via `claude --settings .sandbox/claude-settings.json`. La baseline est un appel Claude nu, sans hook : la comparaison est « routeur complet vs Claude nu », pas un A/B de modèles isolés.
- `HOME` n'est **pas** modifié : l'auth Claude Code reste intacte.
- Interdit : modifier `~/.claude/settings.json`, `~/.claude/model-router.json`, ou le dépôt réel.

### 3.2 Variantes

| Variante | Commande | Modèle |
|---|---|---|
| `routed` | `cc-router run "<prompt>" -- <flags>` | choisi par le classifieur |
| `baseline` | `claude --model <m> --effort <e> <flags> "<prompt>"` | imposé par la tâche |

Les deux variantes reçoivent les mêmes flags de run, mais seule la variante routée ajoute `--settings` pour le hook :

```text
-p --output-format json --max-budget-usd <budget> --permission-mode acceptEdits
```

Pas de `--dangerously-skip-permissions`. Pas de réseau demandé par les tâches. Timeout : 300 s.

**Limite headless importante** : `--permission-mode acceptEdits` auto-approuve les edits de fichiers, **pas les commandes Bash**. Un modèle qui tente `mkdir`/`cat` en Bash peut être bloqué et croire avoir créé le fichier. Ce n'est pas un échec de raisonnement : c'est une limite du harness. Les fixtures doivent **pré-créer les répertoires cibles** (ex. `parcours/.gitkeep`) pour que le modèle puisse utiliser Write. Un run bloqué ainsi est documenté et rejoué après correction de la fixture, jamais compté comme une victoire du routeur.

### 3.3 Checks

Un check doit être :

- **déterministe** : même entrée → même résultat ;
- **local** : pas d'appel réseau, pas de modèle juge ;
- **rouge avant, vert après** : sur une copie neuve de la fixture, le check doit échouer ;
- **borné** : il ne modifie rien, il lit et exécute éventuellement des tests locaux ;
- **aligné sur le spec**, pas sur une implémentation particulière (ex. accepter `pistes` ou `pistes_actives`).

Pour les tâches d'édition, `allowedChanges` liste les seuls fichiers autorisés. Tout autre changement rend la tâche non acceptée.

### 3.4 Métriques

| Métrique | Calcul | Rôle |
|---|---|---|
| **Pass rate** | acceptés / runs | qualité binaire |
| **Coût / tâche acceptée** | coût total / acceptés | métrique principale |
| **Tokens bruts** | input + cache + output | secondaire, jamais l'argument de vente |
| **Changements inattendus** | fichiers hors `allowedChanges` | garde-fou qualité |
| **Rework / escalade** | runs échoués + reprises | à mesurer (Phase 3) |

### 3.5 Taille et répétitions

- Un pilote peut avoir 5 tâches × 1 run : il détecte les écarts grossiers, il ne conclut pas.
- Une publication « preuve » exige **≥ 12 tâches** et **≥ 2 répétitions** par tâche, avec des fixtures variées.
- Le run de référence est :
  ```bash
  npm run bench -- --repeats 2 --budget 0.50
  ```
  soit 12 tâches × 2 variantes × 2 répétitions = **48 runs**.
- Toute publication indique `n`, le nombre de runs et les limites.

### 3.6 Interprétation

- Le gain dépend du **baseline** : si l'utilisateur est déjà sur Sonnet, router l'implémentation vers Sonnet n'économise rien.
- Un baseline qui échoue n'est pas un baseline de qualité : pour le debugging, comparer Opus à Opus (pas de gain) ou documenter que le baseline moins cher échoue.
- Ne jamais généraliser au-delà de l'échantillon.
- Publier le JSON brut, y compris les échecs.

## 4. Tâches actuelles

| Id | Tier | Fixture | Baseline | Check |
|---|---|---|---|---|
| `mech-questions` | mechanical | devquiz | sonnet / medium | IDs Q-01..Q-11 présents |
| `mech-features` | mechanical | devquiz | sonnet / medium | IDs F-01..F-14 présents |
| `mech-lots` | mechanical | devquiz | sonnet / medium | JSON `{"A":9,"B":3,"C":2}` |
| `mech-questions-json` | mechanical | devquiz | sonnet / medium | JSON de 11 questions avec texte |
| `impl-roadmap` | implementation | devquiz | opus / high | fichier + IDs + lots A/B/C |
| `impl-profile` | implementation | devquiz | opus / high | YAML valide + AC1 (Python) |
| `impl-angular` | implementation | devquiz | opus / high | YAML + ≥ 8 notions + URLs Angular |
| `impl-questions` | implementation | devquiz | opus / high | 11 réponses avec rationale |
| `debug-calc` | debugging | buggy-python | sonnet / medium | tests verts + test intact |
| `debug-parse` | debugging | buggy-python-parse | sonnet / medium | tests verts + test intact |
| `debug-state` | debugging | buggy-python-state | sonnet / medium | tests verts + test intact |
| `debug-search` | debugging | buggy-python-search | sonnet / medium | tests verts + test intact |

La fixture `devquiz` est **locale et synthétique** (`bench/fixtures/devquiz/`). Pour tester ton vrai dépôt :

```bash
node bench/run.mjs --repo /chemin/vers/devquiz --budget 0.50
```

## 5. Ajouter une tâche

1. **Choisir le tier** et le baseline. Le baseline représente ce que l'utilisateur aurait utilisé sans router.
2. **Écrire le prompt** de façon à ce qu'il route vers le tier visé. Vérifier :
   ```bash
   node bin/cc-router.js classify "<prompt>"
   ```
3. **Déclarer la tâche** dans [`tasks.mjs`](tasks.mjs) : `id`, `tier`, `fixture`, `baseline`, `prompt`, `allowedChanges`, `check`.
4. **Écrire le check** dans [`checks.mjs`](checks.mjs) (voir §6).
5. **Ajouter une fixture** si nécessaire (voir §7).
6. **Vérifier le protocole** :
   ```bash
   npm run bench:verify
   ```
   Le check doit être rouge avant la tâche ; le prompt doit router vers le bon tier.
7. **Smoke test routé seul**, budget faible :
   ```bash
   node bench/run.mjs --tasks <id> --variants routed --budget 0.05
   ```
8. **Run complet**, puis publier (voir §9).

Conventions :

- une tâche = un comportement vérifiable ;
- prompt réaliste, sans indication de la réponse ni du modèle ;
- pas de secret, pas de donnée personnelle, pas de dépendance réseau ;
- fixture petite (quelques fichiers), lisible, versionnable ;
- `allowedChanges` minimal.

## 6. Écrire un check

Signature :

```js
// checks.mjs
const CHECKS = {
  "mon-check": ({ dir, result, beforeHashes, afterHashes }) => {
    // lire des fichiers, lancer des tests locaux
    return { pass: true, detail: "..." };
  }
};
```

Règles :

- `dir` : racine de la copie isolée ;
- `result` : JSON de Claude Code (`result.result` = texte final) ;
- `beforeHashes` / `afterHashes` : snapshots SHA-1 pour détecter une triche (ex. test modifié) ;
- ne jamais écrire dans `dir` ;
- ne jamais appeler un modèle ni le réseau ;
- si un prérequis manque (ex. PyYAML), échouer avec un message explicite.

Exemples de checks :

- IDs présents dans la réponse ;
- fichier créé + structure minimale ;
- YAML parsé + champs requis ;
- tests locaux verts + fichier de test inchangé (hash).

## 7. Ajouter une fixture

- Créer `bench/fixtures/<nom>/` avec le minimum de fichiers.
- **Pré-créer les répertoires cibles** (ex. `parcours/.gitkeep`) : en headless, Bash n'est pas auto-approuvé, donc un `mkdir` peut être bloqué. Write crée le fichier si le répertoire existe.
- **Synthétique** : pas de code propriétaire, pas de secrets, pas de données réelles.
- Pour un bug : les tests doivent **échouer avant** le fix et **passer après**.
- Documenter la fixture dans `tasks.mjs` (champ `fixture`).
- Vérifier : `npm run bench:verify` doit confirmer que le check est rouge avant.

## 8. Lancer

```bash
# Vérifier le protocole (obligatoire avant tout run)
npm run bench:verify

# Smoke test : une tâche, une variante, budget faible
npm run bench -- --tasks mech-questions --variants routed --budget 0.05

# Run complet (12 tâches, 2 variantes, 2 répétitions)
npm run bench -- --repeats 2 --budget 0.50

# Rapport Markdown lisible
npm run bench:report -- bench/results/<fichier>.json

# Contre ton vrai dépôt devquiz
npm run bench -- --repo /chemin/vers/devquiz --budget 0.50

# Re-scorer un résultat après correction d'un check (sans relancer les modèles)
npm run bench:recheck -- bench/results/<fichier>.json <taskId>

# Simuler une politique Sonnet-first (aucun appel modèle)
npm run bench:simulate-escalation

# Fusionner un re-run de tâche après correction de fixture
npm run bench:merge -- bench/results/<base>.json bench/results/<rerun>.json --out bench/results/<merged>.json
```

Options :

| Option | Défaut | Rôle |
|---|---|---|
| `--tasks` | toutes | liste d'ids séparés par des virgules |
| `--variants` | `routed,baseline` | variantes à exécuter |
| `--repeats` | `1` | nombre de répétitions par tâche et par variante |
| `--budget` | `0.20` | plafond API-équivalent par run |
| `--repo` | fixture locale | dépôt devquiz alternatif |
| `--out` | `bench/results/run-<date>.json` | fichier de sortie |

## 9. Résultats

- Les runs locaux vont dans `bench/results/` (ignoré par git).
- Les résultats **publiés** vont dans `docs/benchmarks/<date>-<nom>.json`, sans `dir`, `beforeHashes`, `afterHashes` ni `stderr` :
  ```bash
  npm run bench:publish -- bench/results/<fichier>.json 2026-10-26-expanded
  ```
- Champs principaux d'un résultat :

```json
{
  "generatedAt": "2026-10-25T22:06:00.000Z",
  "claudeVersion": "2.1.309",
  "routerVersion": "0.1.0",
  "nodeVersion": "v22.0.0",
  "budgetPerRunUsd": "0.50",
  "repeats": 2,
  "summary": {
    "routed": { "runs": 24, "passed": 23, "costPerPassedUsd": 0.090599, "totalTokens": 2147568 },
    "baseline": { "runs": 24, "passed": 21, "costPerPassedUsd": 0.137495, "totalTokens": 2266530 }
  },
  "results": [
    {
      "task": "debug-calc",
      "tier": "debugging",
      "variant": "routed",
      "repeat": 1,
      "model": ["claude-opus-5-5"],
      "cost_usd": 0.1581396,
      "tokens": 107999,
      "changedFiles": ["calc.py"],
      "unexpectedChanges": [],
      "check": { "pass": true, "detail": "tests pass" },
      "accepted": true
    }
  ]
}
```

- Si un check était faux et a été corrigé, **re-scorer** les sorties existantes avec `bench:recheck` et publier un fichier `-rescored.json` en documentant la correction. Ne pas relancer les modèles pour « améliorer » un résultat.
- Si une **fixture** était fautive (ex. répertoire manquant qui bloque Bash), corriger la fixture, **rejouer la tâche seule**, puis fusionner avec `bench:merge` :
  ```bash
  npm run bench -- --tasks impl-angular --repeats 2 --budget 0.50 \
    --out bench/results/impl-angular-rerun.json
  npm run bench:merge -- bench/results/<base>.json \
    bench/results/impl-angular-rerun.json \
    --out bench/results/<base>-merged.json
  ```
  Documenter la raison du re-run et les tâches remplacées ; le JSON publié porte `mergedAt` et `mergedTasks`. Ne jamais fusionner un re-run sans le dire.
- `bench:publish` retire `dir`, `beforeHashes`, `afterHashes`, `stderr` et `resultPreview` du JSON publié.

### Simulation Sonnet-first (sans appel modèle)

`npm run bench:simulate-escalation` lit `docs/benchmarks/2026-10-26-expanded.json`, apparie les
enregistrements debugging baseline (Sonnet) et routés (Opus), puis simule « Sonnet d'abord, Opus
sur échec de vérification ». Il imprime un tableau ; `--json` produit du JSON, `--out <fichier>`
l'écrit, `--data <fichier>` change de dataset.

- **Aucun appel modèle**, aucun quota consommé, aucun changement des résultats de référence.
- Le coût du retry Opus est **proxied** par le run Opus frais ; le vrai retry part de l'arbre Sonnet
  échoué et reçoit la sortie d'échec.
- On suppose que le retry Opus réussit quand le run Opus frais a réussi ; pas de deuxième échec,
  pas de latence, pas de cache froid.
- C'est une **analyse**, pas un benchmark. Le dire explicitement dans toute communication.

## 10. Checklist avant publication

- [ ] `npm run bench:verify` vert.
- [ ] Tous les runs ont un code de sortie 0, ou l'échec est documenté.
- [ ] Aucun changement inattendu, ou il est expliqué.
- [ ] Si des runs ont été rejoués/fusionnés, la raison et `mergedTasks` sont documentées.
- [ ] `n`, nombre de runs et répétitions indiqués.
- [ ] Version de Claude Code et lineup de modèles datés (`docs/RESEARCH.md`).
- [ ] JSON brut publié dans `docs/benchmarks/`.
- [ ] `docs/BENCHMARK.md` mis à jour (tableau + analyse + limites).
- [ ] Aucun secret, chemin privé ou token dans le JSON.
- [ ] Le texte parle **coût/quota**, pas « tokens économisés ».
- [ ] Le contrefactuel (baseline) est explicite.

## 11. Limites connues

- Checks binaires : la qualité rédactionnelle n'est pas notée.
- 12 tâches, 2 répétitions : pas d'intervalle de confiance ni de revue aveugle ; les runs d'une même tâche ne sont pas indépendants.
- Coût API-équivalent ≠ quota réel d'un abonnement.
- Les prompts du run de référence routent correctement ; les erreurs de classification ne sont pas mesurées.
- Les sessions interactives (TUI) ne sont pas couvertes par ce harness.

## 12. Références

- [`docs/BENCHMARK.md`](../docs/BENCHMARK.md) — résultats et analyse.
- [`docs/RESEARCH.md`](../docs/RESEARCH.md) — faits datés sur le lineup et le CLI.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — règles de contribution.
