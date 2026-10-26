# Kit de lancement

[English](LAUNCH.md) · [Français](LAUNCH.fr.md)

> Statut : brouillon, non publié. Utilise les affirmations et les limites
> ci-dessous telles quelles. N'ajoute pas de promesse d'économie de tokens, de
> benchmark du plugin ou de garantie de qualité.

## Une ligne

`cc-model-router` route chaque tour Claude Code vers Haiku, Sonnet ou Opus, et
garde un chemin CLI vérifié pour le travail qui a besoin d'une porte de qualité
déterministe.

## Ce qui est nouveau en 0.2.0

- Un plugin natif Claude Code construit sur l'API Mods. Il classifie chaque
  prompt et change le modèle et l'effort par tour, sans `ccmr run`.
- Changements compatibles avec le cache : l'escalade est immédiate, les descentes
  attendent un délai et un seuil de confiance.
- `/ccmr` affiche le modèle courant, la dernière décision et la configuration de
  routage.
- Le CLI existant garde `--verify` et `--escalate` pour le travail avec porte de
  qualité.
- MIT, pas de proxy, pas de télémétrie.

## Preuves à citer

Utilise ces chiffres exactement. Ils viennent du benchmark de 48 runs, pas du
plugin.

| Affirmation | Chiffre |
|---|---:|
| Tâches acceptées | **23/24 (95,8 %)** routé vs 21/24 (87,5 %) baseline |
| Coût par tâche acceptée | **0,0906 $** vs 0,1375 $ |
| Écart de coût par tâche acceptée | **-34,1 %** |
| Coût total | 2,0838 $ vs 2,8874 $ (-27,8 %) |
| Tokens bruts | -5,2 % au total |
| Tier mechanical | -94,2 % par tâche acceptée |
| Tier implementation | -53,2 % par tâche acceptée, 7/8 vs 8/8 |
| Tier debugging | +29,7 % par tâche acceptée, mais 8/8 vs 5/8 |

Checks du plugin :

- 54/54 tests du dépôt passent.
- 7/7 tests du plugin passent.
- `claude plugin validate` passe pour le plugin et le marketplace.
- Smoke test réel : seulement `claude-haiku-5-5`, coût `0,00069732 $`.
- Installation marketplace testée dans un `CLAUDE_CONFIG_DIR` isolé.

## Limites à répéter

- La baseline des 48 runs est mixte : Sonnet/medium pour mechanical et debugging,
  Opus/high pour implementation. La variante routée charge le hook ; la baseline
  ne le charge pas. C'est une comparaison produit, pas un A/B de modèles pur.
- L'échantillon est de 12 tâches x 2 répétitions. Pas d'intervalle de confiance,
  pas de revue aveugle.
- Le debugging est un garde-fou qualité, pas une économie. Opus passe plus, et
  coûte plus.
- Le plugin n'est pas benchmarké. Sa règle de cache est un garde-fou, pas un
  résultat mesuré.
- `total_cost_usd` est un proxy API-équivalent du quota, pas une facture
  d'abonnement.
- Le plugin ne lance pas `--verify` et n'escalade pas. Le CLI le fait.
- npm sert encore 0.1.1. Le plugin s'installe depuis le marketplace GitHub
  maintenant ; npm 0.2.0 est en attente.

## Show HN

Titre :

```text
Show HN: Native Claude Code plugin that routes each turn to Haiku/Sonnet/Opus
```

Corps :

```text
I built cc-model-router because I kept paying for Opus on work that did not need
it: git commits, renames, lint fixes, then a real debugging task.

The project has two paths.

1. A native Claude Code plugin. It classifies each prompt and changes the model
   and effort for that turn. It is cache-aware: escalation is immediate, but a
   downgrade waits for a cooldown and a confidence threshold. /ccmr shows the
   current model and the last decision.

2. A CLI. ccmr run picks one model at launch. With --verify it runs a command
   you provide, and with --escalate it retries on the next tier and includes the
   failure output.

The evidence I trust most is a 48-run benchmark (12 synthetic tasks x 2 variants
x 2 repeats) with deterministic checks. Routed: 23/24 accepted at $0.0906 per
accepted task. Baseline: 21/24 at $0.1375. That is -34.1% cost per accepted task.
Mechanical work is -94.2%; implementation is -53.2%. Debugging is a guard:
Opus passes 8/8 vs 5/8 for Sonnet, but costs +29.7% per accepted task.

Caveats: the baseline is mixed, the routed variant loads the hook, the sample is
small, and the plugin is not benchmarked. The CLI benchmark is not a per-turn
plugin result.

MIT, no proxy, no telemetry. Feedback on the routing rules and the benchmark
would be useful.

https://github.com/misterkante/cc-model-router
```

## Reddit

Subreddits suggérés : r/ClaudeAI, r/ClaudeCode. Lis les règles de chaque
communauté avant de poster ; ne poste pas le même texte sur plusieurs subreddits
le même jour.

Titre :

```text
I built a native Claude Code plugin that routes each turn to Haiku/Sonnet/Opus
```

Corps :

```text
I wanted automatic model routing without launching every task through a wrapper,
so I built a Claude Code plugin on the Mods API.

How it works: the plugin classifies each prompt, then sets the model and effort
for every step of that turn. Tool-call continuations keep the routed model.
Subagents are not routed in this version.

The cache problem is real. Switching models invalidates the prompt cache, so the
plugin escalates immediately but delays downgrades with a cooldown and a
confidence threshold. That rule is a guardrail, not a measured benchmark.

There is also a CLI for quality-gated work: ccmr run --verify "npm test"
--escalate. The check decides whether the run is accepted; a failure retries on
the next tier with the error in the prompt.

Benchmark: 48 runs, 12 synthetic tasks x 2 variants x 2 repeats. Routed 23/24
accepted at $0.0906 per accepted task; baseline 21/24 at $0.1375. -34.1% cost
per accepted task. Mechanical -94.2%, implementation -53.2%. Debugging is +29.7%
per accepted but 8/8 vs 5/8, so it is a quality guard.

The baseline is mixed, the sample is small, and the plugin itself is not
benchmarked. I am sharing the numbers with those limits.

Repo: https://github.com/misterkante/cc-model-router
```

## Thread X / Twitter

1.

```text
Claude Code users: you probably pay for Opus on work that does not need it.

I built cc-model-router: a native plugin that routes each turn to Haiku, Sonnet
or Opus, plus a CLI with --verify and --escalate.

MIT. No proxy. No telemetry.

https://github.com/misterkante/cc-model-router
```

2.

```text
The plugin uses the Claude Code Mods API.

It classifies the prompt, then sets the model and effort for every step of the
turn. Tool-call continuations keep the routed model.

/ccmr shows the current model and the last decision.
```

3.

```text
The hard part is the prompt cache.

Switching models invalidates it. So the plugin escalates immediately, but delays
downgrades with a cooldown and a confidence threshold.

That is a guardrail, not a benchmark result.
```

4.

```text
The CLI is for quality-gated work:

ccmr run "task" --verify "npm test" --escalate

A deterministic check decides whether the run is accepted. On failure, the next
tier retries with the error output.
```

5.

```text
48-run benchmark, 12 tasks x 2 variants x 2 repeats:

- 23/24 accepted vs 21/24
- $0.0906 vs $0.1375 per accepted task
- -34.1% cost per accepted
- mechanical -94.2%
- implementation -53.2%
- debugging +29.7%, but 8/8 vs 5/8
```

6.

```text
Caveats: mixed baseline, small sample, the routed variant loads the hook, and
the plugin is not benchmarked. Debugging is a quality guard, not a saving.

Feedback on the routing rules and the benchmark is welcome.
```

## Article dev.to / Hashnode

Titre :

```text
I built a native Claude Code model router, and measured it on 48 runs
```

Plan :

1. **Le problème** : un seul modèle pour toutes les tâches, y compris le travail
   mécanique.
2. **Le design** : trois tiers, config globale et projet, CLI et plugin.
3. **Pourquoi un plugin** : les hooks des settings peuvent observer mais pas
   changer le modèle. L'API Mods peut réécrire une requête. Montrer la séparation
   `prompt.submit` et `turn.step`.
4. **Le piège du cache** : cache de prompt par modèle, pourquoi le routage par
   tour peut coûter plus, et la règle escalade/descente.
5. **Le benchmark** : 12 tâches, 2 variantes, 2 répétitions, checks déterministes.
   Inclure le tableau et la limite de baseline mixte.
6. **Ce qui a échoué** : Sonnet a produit un YAML invalide sur `impl-angular` ;
   Opus était surdimensionné sur des bugs simples. C'est ce qui a mené à
   `--verify` / `--escalate` et à l'option Sonnet-first.
7. **Le plugin** : installation, `/ccmr`, modes de routage, limites.
8. **La suite** : benchmark plus large, OpenCode, dashboard de stats.

Liens canoniques : [`BENCHMARK.fr.md`](BENCHMARK.fr.md),
[`PLUGIN.fr.md`](PLUGIN.fr.md), [`COMPETITION.fr.md`](COMPETITION.fr.md).

## LinkedIn

```text
I open-sourced cc-model-router, a native Claude Code plugin and CLI that routes
each task to Haiku, Sonnet or Opus.

The plugin classifies each prompt and changes the model per turn. The CLI adds a
quality gate: ccmr run --verify "npm test" --escalate.

On a 48-run benchmark with deterministic checks, routed tasks were accepted
23/24 vs 21/24, at $0.0906 vs $0.1375 per accepted task (-34.1%). Mechanical work
was -94.2%; implementation -53.2%. Debugging costs +29.7% but passes 8/8 vs 5/8,
so it is a quality guard, not a saving.

The caveats matter: mixed baseline, small sample, and the plugin itself is not
benchmarked. The benchmark is the CLI path.

MIT, no proxy, no telemetry.
https://github.com/misterkante/cc-model-router
```

## Script de démo

Enregistre dans un terminal de 100x30 ou plus. Ne montre pas un vrai projet ni
une vraie clé API.

```bash
ccmr classify "lint the changed files"
ccmr classify "implement the auth endpoint"
ccmr classify "debug why the login test is flaky"
ccmr status
```

Puis, dans Claude Code :

```text
/plugin marketplace add misterkante/cc-model-router
/plugin install cc-model-router@cc-model-router
/ccmr
```

Optionnel, si le quota le permet : un petit prompt routé, puis `/ccmr` à nouveau.

## Checklist de lancement

- [ ] Publier npm `0.2.0` avec un identifiant valide.
- [ ] Lancer une vraie tâche sur un projet réel avec le plugin.
- [ ] Enregistrer le GIF de démo depuis le script ci-dessus.
- [ ] Épingler le dépôt et uploader `docs/assets/social-preview.png` (web UI).
- [ ] Révoquer le token npm exposé (web UI).
- [ ] Publier l'article dev.to ou Hashnode.
- [ ] Poster Show HN un matin de semaine, heure US Eastern.
- [ ] Poster Reddit après lecture des règles du subreddit.
- [ ] Poster le thread X et LinkedIn.
- [ ] Répondre à chaque commentaire technique avec les limites, pas seulement le
  titre.
- [ ] Suivre 100 étoiles, 500 téléchargements et 5 retours utiles en 30 jours.

## Ne pas dire

- « Économise des tokens » comme promesse principale. Les tokens bruts baissent
  de 5,2 %, mais les tokens mechanical par tâche acceptée montent de 5,5 %.
- « Qualité identique » sans la limite debugging.
- « Plugin benchmarké ». Les 48 runs mesurent le CLI.
- « Économies garanties ». Le cache et le mix de tâches peuvent changer le
  résultat.
