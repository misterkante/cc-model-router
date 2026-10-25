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
| **Tâche acceptée** | Check vert **et** aucun fichier hors `allowedChanges`. |
| **Check** | Fonction déterministe, locale, sans réseau, qui rend `{ pass, detail }`. |
| **Fixture** | Dépôt minimal et synthétique dans lequel le run travaille. |
| **Baseline** | Modèle/effort qu'un utilisateur aurait utilisés sans le router. |
| **Coût API-équivalent** | `total_cost_usd` renvoyé par Claude Code ; proxy du quota, pas une facture. |
| **Contrefactuel** | Le baseline choisi ; le gain dépend de lui (voir §3.6). |

## 3. Protocole

### 3.1 Isolation

- Chaque run part d'une **copie neuve** de la fixture (`mkdtemp` + `cpSync`). Le dépôt source n'est jamais modifié.
- La config du router est déplacée via `CC_ROUTER_CONFIG_DIR` vers un **répertoire temporaire vide** : le routing benchmarké est celui par défaut, sans config projet ni config globale personnelle.
- Le hook est chargé via `claude --settings .sandbox/claude-settings.json`.
- `HOME` n'est **pas** modifié : l'auth Claude Code reste intacte.
- Interdit : modifier `~/.claude/settings.json`, `~/.claude/model-router.json`, ou le dépôt réel.

### 3.2 Variantes

| Variante | Commande | Modèle |
|---|---|---|
| `routed` | `cc-router run "<prompt>" -- <flags>` | choisi par le classifieur |
| `baseline` | `claude --model <m> --effort <e> <flags> "<prompt>"` | imposé par la tâche |

Les deux variantes reçoivent **exactement les mêmes flags** :

```text
-p --output-format json --max-budget-usd <budget> --permission-mode acceptEdits
```

Pas de `--dangerously-skip-permissions`. Pas de réseau demandé par les tâches. Timeout : 300 s.

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
| `impl-roadmap` | implementation | devquiz | opus / high | fichier + IDs + lots A/B/C |
| `impl-profile` | implementation | devquiz | opus / high | YAML valide + AC1 |
| `debug-calc` | debugging | buggy-python | sonnet / medium | tests verts + test intact |

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

# Run complet (5 tâches, 2 variantes)
npm run bench -- --budget 0.50

# Contre ton vrai dépôt devquiz
npm run bench -- --repo /chemin/vers/devquiz --budget 0.50

# Re-scorer un résultat après correction d'un check (sans relancer les modèles)
npm run bench:recheck -- bench/results/<fichier>.json <taskId>
```

Options :

| Option | Défaut | Rôle |
|---|---|---|
| `--tasks` | toutes | liste d'ids séparés par des virgules |
| `--variants` | `routed,baseline` | variantes à exécuter |
| `--budget` | `0.20` | plafond API-équivalent par run |
| `--repo` | fixture locale | dépôt devquiz alternatif |
| `--out` | `bench/results/run-<date>.json` | fichier de sortie |

## 9. Résultats

- Les runs locaux vont dans `bench/results/` (ignoré par git).
- Les résultats **publiés** vont dans `docs/benchmarks/<date>-<nom>.json`, sans `dir`, `beforeHashes`, `afterHashes` ni `stderr`.
- Champs principaux d'un résultat :

```json
{
  "generatedAt": "2026-10-25T22:06:00.000Z",
  "claudeVersion": "2.1.309",
  "routerVersion": "0.1.0",
  "nodeVersion": "v22.0.0",
  "budgetPerRunUsd": "0.50",
  "summary": {
    "routed": { "runs": 5, "passed": 5, "costPerPassedUsd": 0.087723, "totalTokens": 556931 },
    "baseline": { "runs": 5, "passed": 4, "costPerPassedUsd": 0.189254, "totalTokens": 404795 }
  },
  "results": [
    {
      "task": "debug-calc",
      "tier": "debugging",
      "variant": "routed",
      "model": ["claude-opus-5-5"],
      "cost_usd": 0.1581396,
      "tokens": 107999,
      "changedFiles": ["calc.py"],
      "unexpectedChanges": [],
      "check": { "pass": true, "detail": "tests pass" }
    }
  ]
}
```

- Si un check était faux et a été corrigé, **re-scorer** les sorties existantes avec `bench:recheck` et publier un fichier `-rescored.json` en documentant la correction. Ne pas relancer les modèles pour « améliorer » un résultat.

## 10. Checklist avant publication

- [ ] `npm run bench:verify` vert.
- [ ] Tous les runs ont un code de sortie 0, ou l'échec est documenté.
- [ ] Aucun changement inattendu, ou il est expliqué.
- [ ] `n`, nombre de runs et répétitions indiqués.
- [ ] Version de Claude Code et lineup de modèles datés (`docs/RESEARCH.md`).
- [ ] JSON brut publié dans `docs/benchmarks/`.
- [ ] `docs/BENCHMARK.md` mis à jour (tableau + analyse + limites).
- [ ] Aucun secret, chemin privé ou token dans le JSON.
- [ ] Le texte parle **coût/quota**, pas « tokens économisés ».
- [ ] Le contrefactuel (baseline) est explicite.

## 11. Limites connues

- Checks binaires : la qualité rédactionnelle n'est pas notée.
- Petits échantillons : pas d'intervalle de confiance tant que `n < 12` et les répétitions < 2.
- Coût API-équivalent ≠ quota réel d'un abonnement.
- Les prompts du pilote routent correctement ; les erreurs de classification ne sont pas mesurées.
- Les sessions interactives (TUI) ne sont pas couvertes par ce harness.

## 12. Références

- [`docs/BENCHMARK.md`](../docs/BENCHMARK.md) — résultats et analyse.
- [`docs/RESEARCH.md`](../docs/RESEARCH.md) — faits datés sur le lineup et le CLI.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — règles de contribution.
