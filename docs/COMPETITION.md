# Concurrence, positionnement et lancement

> Veille datée du **2026-10-26**. Les chiffres d'adoption (étoiles, forks, versions,
> téléchargements) et les prix bougent vite : re-vérifier avant chaque annonce publique.
>
> Règle : sources primaires (docs Anthropic, dépôts GitHub, npm, benchmarks publiés).
> Les données auto-déclarées sont marquées comme telles. Les liens sont en fin de document.

## 1. Résumé exécutif

- **La demande est réelle et documentée.** Les issues Anthropic sur le routage automatique
  totalisent 30+ demandes liées ; une analyse d'usage d'un abonné Max (17 jours) montre
  **93,8 % des tokens envoyés à Opus** et **97,8 % du coût**. Un power user rapporte
  **5 489 $ en 44 jours**,
  dont 60–70 % de tâches qui auraient pu tourner sur Sonnet ou Haiku.
- **Le marché est encombré, mais pas là où nous sommes.** Les gateways multi-provider
  (Claude Code Router, Weave, LiteLLM, ClaudeRipple) occupent le terrain « router tout,
  plusieurs fournisseurs ». Les hooks Claude-only existent aussi (le plus proche :
  `tzachbon/claude-model-router-hook`, 105 ★), mais **aucun des hooks examinés ne publie
  de benchmark de qualité par tâche Claude Code avec vérification post-run**.
- **Notre créneau : natif + preuve + rattrapage.** Trois tiers, un benchmark de 48 runs avec
  checks déterministes, et `run --verify` / `--escalate` pour rattraper l'échec qualité.
  Pas de proxy, pas de clé API à changer, pas de télémétrie.
- **Verdict : Go en open source / portfolio, No-Go comme entreprise seule.** Le projet est
  crédible et différenciant pour un lancement OSS et une vitrine de compétences. Ce n'est
  pas un business défendable sans équipe, dashboard, support et couche commerciale.
- **Lancement : le benchmark est le produit d'appel.** Le message n'est pas « premier
  routeur » ni « zéro perte de qualité » ; c'est « voici 48 runs, 23/24 vs 21/24, -34,1 %
  de coût par tâche acceptée, et voici comment on rattrape l'échec ».

## 2. Preuves de demande

### 2.1 Données Anthropic (auto-déclarées, à présenter comme telles)

**Issue #27665** — ouverte le 2026-02-22, toujours ouverte, 30+ issues liées.
Un abonné Max (17 jours, plan à 200 $/mois, Claude Code v2.1.50) mesure avec `ccusage` :

| Modèle | Tokens | Part | Coût API-équivalent |
|---|---:|---:|---:|
| Opus 4.6 | 1 405 957 116 | 77,0 % | 1 011,59 $ |
| Opus 4.5 | 305 903 815 | 16,8 % | 234,43 $ |
| Haiku 4.5 | 94 216 971 | 5,2 % | 16,02 $ |
| Sonnet 4.5 / 4.6 | 18 331 138 | 1,0 % | 12,36 $ |
| **Total** | **1 825 500 411** | **100 %** | **1 274,40 $** |

- **93,8 % des tokens et 97,8 % du coût vont à Opus.**
- 96 % de ces tokens Opus sont des **cache reads** : le contexte complet est renvoyé à
  chaque tour, même pour un « oui, vas-y » ou un `grep`.
- L'auteur qualifie `opusplan` de cassé et trop grossier (plan vs exécution), et liste
  30+ issues liées (routage par compétence, par outil, par sous-agent, par complexité).

**Issue #44976** — ouverte le 2026-04-08, fermée comme doublon de #15721.
Un power user rapporte **5 489 $ en 44 jours** (février–avril 2026), dont **60–70 %**
de tokens sur des tâches où Sonnet ou Haiku auraient suffi (lectures de fichiers, edits
simples, exploration, chat). Estimation : **2 000–3 000 $/mois** d'économie pour un gros
utilisateur, sans perte de qualité.

**Ce qu'il faut retenir :** ce sont des données individuelles, auto-déclarées, pas une
étude contrôlée. Elles prouvent un **signal fort**, pas une population. Le benchmark du
projet est justement là pour produire une mesure reproductible, à notre échelle.

### 2.2 Ce que Claude Code fait nativement (et ce qui manque)

- `/model`, `--model`, `--effort`, `--fallback-model` : sélection **manuelle** ou au
  lancement, pas de routage automatique par type de tâche.
- `opusplan` : Opus en mode plan, Sonnet en exécution. Couvre **plan → code**, pas
  mechanical vs implementation vs debugging ; les utilisateurs le trouvent trop grossier
  (issue #15721, fermée comme « couverte » par un collaborateur, mais les demandes
  continuent).
- Sous-agents : un fichier d'agent peut déclarer `model:` ; c'est du routage **par
  sous-agent**, pas par tâche, et le sous-agent hérite du modèle parent par défaut.
- **Pas de changement de modèle en cours de session** via un hook public. C'est la limite
  qui structure tout le design : le hook observe/recommande, `ccmr run` applique au
  lancement.

### 2.3 La contrainte de cache qui rend le routage par tour dangereux

Le cache de prompt est **par modèle**. Changer de modèle en cours de conversation
invalide le cache : tout l'historique est relu au prix plein sur le nouveau modèle.
Dans l'issue #27665, plusieurs utilisateurs documentent ce piège :

- quelques switches dans une session de 50K–200K tokens peuvent coûter **plus cher** que
  rester sur Opus ;
- la granularité saine est donc **au lancement de session** (ou au spawn d'un sous-agent),
  pas à chaque tour ;
- l'escalade quand la tâche est **visiblement bloquée** peut être moins chère que cinq
  cycles ratés sur un modèle plus faible.

C'est exactement le compromis du projet : **un modèle par run**, puis `--verify` et
`--escalate` qui démarrent une nouvelle session seulement en cas d'échec. On paie un
cache froid au retry, mais uniquement quand la première tentative a échoué.

## 3. Paysage concurrentiel (au 2026-10-26)

| Acteur | Type | Licence | Adoption | Ce qu'il fait | Limite vs nous |
|---|---|---|---|---|---|
| **Claude Code natif** (`/model`, `opusplan`, sous-agents) | Intégré | Propriétaire | Gratuit, installé | Sélection manuelle ; Opus plan → Sonnet exécution ; `model:` par sous-agent | Pas de routage par type de tâche ; pas de benchmark tâche ; `opusplan` grossier |
| **tzachbon/claude-model-router-hook** | Hook Claude Code | MIT | **105 ★**, 14 forks, 40 commits | 5 classes + abstain, routage des sous-agents, warn/autoswitch, config globale/projet | Opus par défaut sur implementation/debugging (conservateur) ; **pas de benchmark de qualité publié** ; pas de vérification post-run |
| **edagher92-coder/claude-model-router** | Routeur Python/API | MIT | **0 ★**, 90 commits | Tiers haiku/sonnet/glm/opus/fable, fallback/escalade, log CSV, abonnement via `claude -p` | Routeur séparé, pas un hook natif ; bench de modèles, pas de benchmark de tâches Claude Code ; adoption quasi nulle |
| **musistudio/claude-code-router (CCR)** | Gateway local | MIT | **37,8k ★**, 3,2k forks, v3.1.3, ~9k téléchargements/semaine | Gateway/control plane multi-provider, dashboard, règles, fallback, nombreux agents | Lourd ; changement d'endpoint/proxy ; pas de benchmark qualité par tâche Claude Code |
| **weave-os/router** | Gateway | Apache-2.0 | **5,6k ★**, 160 forks | Go, < 50 ms, « 40–70 % de coût en moins » via changement d'endpoint | Routeur généraliste agentique ; pas de benchmark Claude Code par tâche |
| **LiteLLM Auto Router** | Gateway | OSS | Très utilisé | Classifieur heuristique, tiers SIMPLE/MEDIUM/COMPLEX/REASONING ; **40,4 % moins cher à 97,1 % de qualité** (220 prompts) ; **74,5 % moins cher à 87,3 %** (8 399 prompts) | Généraliste, proxy ; la qualité baisse sur RouterArena (68,6 % vs 78,5 %) ; pas natif Claude Code |
| **RouteLLM** | Routeur de recherche | Apache-2.0 | Projet de recherche | Classifieurs entraînés, serveur OpenAI-compatible | Généraliste ; pas d'intégration Claude Code |
| **ClaudeRipple** | Proxy multi-provider | GPL-3.0 | **72 ★**, 16 forks, 850 commits | Claude Desktop/Code avec GPT/DeepSeek/etc., effort par prompt, sous-agents | Pas un routeur Claude-only par tier ; proxy lourd ; GPL |

**Travaux voisins (pas des routeurs complets) :** `better-model` (agents + `CLAUDE.md`),
`attune-ai` (routage multi-tier), `claude-router` (28 ★, un mainteneur, cité dans
#27665). Ils valident la demande mais ne publient pas de benchmark de qualité par tâche.

### Ce que le tableau dit vraiment

- **Le concurrent direct le plus proche est `tzachbon`**, pas CCR/Weave/LiteLLM : même
  idée (hook, tiers, config globale/projet), même licence, déjà 105 ★. Il est plus mûr
  sur les sous-agents et les classes de tâches.
- **Les gateways sont un autre marché** : multi-provider, dashboard, entreprises. Ils
  résolvent « utiliser GPT/DeepSeek/Ollama dans Claude Code », pas « choisir entre
  Haiku/Sonnet/Opus pour cette tâche Claude Code ».
- **LiteLLM est la référence de preuve** : 8 619 prompts, des chiffres publics, mais un
  routeur généraliste et une perte de qualité visible sur les benchmarks difficiles.
  C'est un concurrent indirect et un modèle méthodologique.
- **Aucun des projets examinés ne combine** natif Claude Code + tiers par tâche +
  benchmark reproductible + vérification/escalade. C'est notre espace, pas une
  révolution technique.

## 4. Carte de positionnement

```
                    preuve qualité publiée
                            ▲
                            │
             LiteLLM        │        cc-model-router
          (gateway, gros    │        (natif, 48 runs,
           benchmark)       │         vérification)
                            │
   gateway ◄────────────────┼────────────────► natif
                            │
        CCR / Weave /       │        tzachbon (hook)
        ClaudeRipple        │        Claude Code natif
                            │        (opusplan, /model)
                            ▼
                    pas de preuve tâche
```

- **Axe horizontal** : intégration (proxy/gateway ↔ natif Claude Code).
- **Axe vertical** : preuve (aucun benchmark de qualité ↔ benchmark publié).
- **Notre case** : natif + preuve + rattrapage. C'est étroit, mais c'est cohérent avec
  la contrainte de cache et avec la promesse « coût/quota à qualité égale ».

## 5. Différenciation (honnête)

### Ce que nous faisons que les autres ne font pas (parmi les projets examinés, au 2026-10-26)

1. **Un benchmark de tâches Claude Code reproductible** : 12 tâches × 2 variantes ×
   2 répétitions = 48 runs, checks déterministes, coût par tâche **acceptée**, dataset
   publié et assaini, protocole dans `bench/README.md`.
2. **Une vérification post-run** : `ccmr run "<task>" --verify "<commande>"` exécute
   le check après Claude ; `--escalate` rejoue avec le tier suivant et injecte la sortie
   d'échec dans le prompt. C'est la réponse directe au seul échec qualité mesuré
   (YAML invalide de Sonnet sur `impl-angular`).
3. **Une intégration native, sans proxy** : alias `haiku`/`sonnet`/`opus`, `--model`,
   `--effort`, `--fallback-model`, `--settings` pour l'isolation. Pas de clé API, pas de
   `ANTHROPIC_BASE_URL`, pas de télémétrie.
4. **La simplicité** : 3 tiers, Node ≥ 18, MIT, zéro dépendance runtime. Le concurrent
   le plus proche est bash/Python avec 5 classes et des hooks sous-agents ; les gateways
   sont des plateformes.
5. **Une politique debugging Sonnet-first opt-in** : Sonnet d'abord, Opus sur échec de
   `--verify`, avec une simulation à **-15,5 % de coût par accepté** vs Opus direct à 8/8 (3/8 retries).
   Un pilot réel de 4 runs sur `debug-calc` + `debug-search` passe 4/4 avec Sonnet, sans
   escalade. Un second pilot, sans hook, a reproduit l'échec Sonnet connu sur `debug-calc` :
   Sonnet échoue au check, Opus reçoit l'erreur et réussit, pour **0,2132 $ vs 0,1559 $**
   Opus direct (+36,7 %). C'est un échec réel et un coût mesuré, pas un taux ; un premier
   essai raté peut coûter plus cher qu'Opus direct. Pas un claim de benchmark.

### Ce que les autres font mieux (à assumer)

- **tzachbon** : routage des sous-agents (`Agent`/`Task`), 5 classes + abstain, installateur,
  fallback classifieur via `claude -p`, 105 ★. Nous n'avons pas encore de routage de
  sous-agents.
- **CCR / ClaudeRipple / Weave** : multi-provider, dashboard, desktop app, observabilité,
  scale. Nous sommes Claude-only et CLI.
- **LiteLLM** : 8 619 prompts, gateway de production, observabilité. Notre échantillon
  est beaucoup plus petit (12 tâches, 2 répétitions).
- **Natif** : zéro installation, zéro risque, `opusplan` déjà là. Notre outil doit
  justifier une installation supplémentaire par la mesure et le rattrapage.

### Discipline de claim

- **Ne pas dire** : « premier routeur », « zéro perte de qualité », « tokens économisés »,
  « fonctionne pour tout le monde ».
- **Dire** : « 48 runs, 23/24 vs 21/24 acceptés, -34,1 % de coût par tâche acceptée vs un
  baseline mixte Sonnet/Opus ; échantillon petit ; le debugging est un garde-fou qualité,
  pas une économie ».
- **Baseline exacte** : Sonnet/medium pour mechanical et debugging, Opus/high pour
  implementation. Ce n'est **pas** un baseline tout-Opus. C'est le comportement que le
  routeur cible ; le comparer à tout-Opus gonflerait artificiellement l'économie.
- **Le chiffre à ne pas cacher** : Sonnet a échoué 1/8 en implementation (YAML invalide).
  `--verify`/`--escalate` est la réponse ; un échec réel de debugging a été récupéré dans un
  pilot (Sonnet → Opus, +36,7 % vs Opus direct), mais le taux et le coût moyen ne sont pas
  encore mesurés dans les 48 runs.

## 6. Viabilité

### Feu vert

- **Demande** : documentée par les issues, les concurrents et les coûts réels.
- **Niche** : les gateways sont gros mais généralistes ; le hook concurrent le plus proche
  est petit (105 ★) et sans benchmark. Un outil natif, mesuré, vérifié, MIT, a une place.
- **Coût de développement** : faible (Node, zéro dépendance, déjà 53 tests).
- **Valeur portfolio** : élevée (recherche, CLI, hooks, isolation, tests, benchmark,
  analyse coût/qualité, documentation honnête).

### Feu rouge / risques

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Anthropic livre le routage natif | Moyenne | Élevé | Se déplacer vers la **preuve** et la **vérification** ; le routage de base sera commoditisé |
| Un gateway ajoute le routage par tâche | Élevée | Moyen | Rester natif, simple, sans proxy ; cibler les utilisateurs qui refusent un gateway |
| `tzachbon` ajoute un benchmark | Moyenne | Moyen | Collaborer / créditer ; notre avantage est la vérification et les données |
| Échantillon trop petit | Certaine | Moyen | Élargir à 20–30 tâches, 3 répétitions, revue aveugle, IC avant les gros claims |
| Lineup/prix changent | Élevée | Faible | Alias, config, re-vérification datée |
| Cache invalidé au retry | Certaine | Faible | Retry seulement sur échec ; documenter le coût |
| `--verify` exécute une commande utilisateur | Certaine | Moyen | Documenter « read-only checks », pas de secrets, pas de télémétrie |
| Confusion marque Anthropic | Faible | Moyen | MIT, mention « non affilié », pas de logo Anthropic |

### Verdict

**Go pour l'open source et le portfolio. No-Go comme entreprise standalone en l'état.**

Le projet peut devenir un outil de référence pour « router Claude Code par tâche avec une
preuve ». Il ne peut pas, seul, battre CCR/Weave/LiteLLM sur le multi-provider, ni
Anthropic sur l'intégration native. Sa défense est **la preuve, la vérification, la
simplicité et la confiance** — pas la technologie.

Si monétisation un jour : dashboard d'équipe, politique de routage partagée, intégration
CI, support. Valider la demande par le lancement OSS avant d'écrire une ligne de code
commerciale.

## 7. Plan de lancement

### 7.1 Pré-lancement (2 semaines)

- [x] **Figer le scope** : 3 tiers, `run --verify`/`--escalate`, politique Sonnet-first opt-in, benchmark 48 runs.
- [x] **npm (métadonnées)** : `cc-model-router` est **disponible** (vérifié le 2026-10-26) ;
      `repository`, `homepage`, `bugs`, `files`, `author` ajoutés ; `npm pack --dry-run` OK.
- [ ] **npm (publication)** : publier le tarball après validation dans un répertoire propre.
- [x] **Nom du binaire** : décidé — package `cc-model-router`, binaires `cc-model-router`
      et alias `ccmr`. `cc-router` est déjà pris sur npm (`cc-router@4.0.0`) et n’est pas utilisé.
- [x] **GitHub** : dépôt public créé et poussé, description, homepage, 12 topics
      (`claude-code`, `model-router`, `cost-optimization`, `llm`, `mit-license`, etc.),
      issues/projects/discussions activés, CI verte.
- [ ] **GitHub (web-only)** : social preview et épinglage du dépôt sur le profil. Aucune API
      GitHub publique ne permet de les modifier (voir note ci-dessous). L’image de social
      preview est prête : [`docs/assets/social-preview.png`](assets/social-preview.png).
- [x] **CI** : `npm test` + `npm run bench:verify` (aucun appel Claude réel) — `.github/workflows/ci.yml`.
- [x] **README** : installation, référence CLI, tableau de comparaison, limitations visibles,
      liens vers `docs/BENCHMARK.md`, `docs/COMPETITION.md` et `docs/README.md`.
- [ ] **Démo visuelle** : GIF de démo et graphique du benchmark.
- [ ] **Reproduire le benchmark** depuis un clone propre ; vérifier le JSON publié.
- [ ] **Démo 60 s** : `classify`, `run --verify` (dry-run ou petit run), `status`.
- [ ] **Blog post** : « J'ai mesuré 48 runs Claude Code : -34 % de coût par tâche
      acceptée, et l'échec qui compte » — méthode, YAML invalide, vérification.
- [x] **Sécurité** : `SECURITY.md`, templates d'issues/PR, rappel « non affilié à Anthropic ».

> **Épinglage du profil** : GitHub ne fournit pas de mutation publique (`pinRepository`
> n'existe pas ; `/user/pinned_repositories` renvoie 404). L'épinglage se fait via
> l'interface web : profil → *Customize your pins* → sélectionner `cc-model-router` →
> *Save pins*. Le README du profil peut aussi le mettre en avant.

### 7.2 Jour J

- **Show HN** : « Show HN: A Claude Code model router with a 48-run quality benchmark ».
  Publier un mardi–jeudi matin (heure US), être présent dans les commentaires, lien direct
  vers le benchmark et les limitations.
- **Reddit** : r/ClaudeAI et r/ClaudeCode ; suivre les règles d'auto-promotion ; poster le
  benchmark, pas juste le lien.
- **X/Twitter** : thread court avec le chiffre, le graphique et l'échec YAML ; #ClaudeCode.
- **dev.to / Hashnode** : article méthode + résultats.
- **LinkedIn** : angle portfolio/career, pas hype.
- **À éviter** : spammer l'issue tracker Anthropic ; si commentaire, apporter la donnée
  et divulguer le projet.

### 7.3 Message

**Une phrase :**
> Claude Code routé par tâche — Haiku pour le mécanique, Sonnet pour l'implémentation,
> Opus pour le debugging — avec un benchmark de 48 runs et une boucle vérifier/escalader.

**Preuve :**
> 23/24 vs 21/24 acceptés ; 0,0906 $ vs 0,1375 $ par tâche acceptée (-34,1 %) ;
> 12 tâches, 2 répétitions ; debugging = garde-fou qualité (+29,7 %), pas économie ;
> baseline sans hook (comparaison produit, pas A/B de modèles isolés).

**Honnêteté :**
> Échantillon petit, pas une preuve statistique ; Sonnet a échoué 1/8 en implémentation ;
> `--verify`/`--escalate` est la réponse, pas encore dans les 48 runs ; la politique
> Sonnet-first est une simulation + deux petits pilots, pas un benchmark. Un échec réel a été
> récupéré (Sonnet → Opus, 0,2132 $ vs 0,1559 $ Opus direct, +36,7 %), mais le taux d'escalade
> reste inconnu ; pas de proxy, pas de clé API, MIT.

### 7.4 Métriques post-lancement

| Horizon | À suivre | Cible réaliste |
|---|---|---|
| 30 jours | étoiles, téléchargements npm, issues, reproductions du benchmark | 100 ★, 500 dl, 5 retours utiles |
| 60 jours | contributeurs, PR, benchmarks externes, savings rapportés | 250 ★, 1k dl, 1 contributeur |
| 90 jours | décision OpenCode / dashboard / commercial | Go/No-Go documenté |

Ne pas optimiser les étoiles. Optimiser : **reproductions du benchmark**, **retours
d'usage réels**, **issues actionnables**.

## 8. Valeur carrière

Ce que le projet démontre, concrètement :

- **Sélection de problème** : partir d'une douleur réelle (coût/quota Claude Code), pas
  d'une techno.
- **Recherche datée** : lineup, CLI, issues, concurrents, sources primaires.
- **Ingénierie** : CLI Node, hooks, config globale/projet, isolation, `spawnSync`,
  parsing d'arguments, exit codes, dry-run.
- **Qualité** : 53 tests, faux binaire Claude, tests d'intégration, `bench:verify`,
  checks déterministes, dataset assaini, smoke TUI automatisé (`test:tui`, tmux).
- **Analyse coût/qualité** : coût par tâche acceptée, baseline, tokens vs coût, limites.
- **Communication** : README, benchmark reproductible, documentation honnête, ce document.

Artefacts réutilisables : dépôt MIT, dataset JSON, article de blog, talk « mesurer un
routeur de modèles sans se mentir », éventuel conseil en coût/qualité Claude Code.

## 9. Sources

### Anthropic / Claude Code

- Issue #27665 — *Intelligent Model Routing — 93.8 % of Max subscriber tokens to Opus* :
  <https://github.com/anthropics/claude-code/issues/27665> (ouverte 2026-02-22).
- Issue #44976 — *Auto model routing by task type* :
  <https://github.com/anthropics/claude-code/issues/44976> (2026-04-08, fermée doublon).
- Issue #15721 — *Automatic Model Switching for Plan Mode* :
  <https://github.com/anthropics/claude-code/issues/15721> (fermée 2026-08-17).
- Docs modèle Claude Code (alias, `opusplan`, effort) :
  <https://code.claude.com/docs/en/model-config>.
- Docs prompt caching :
  <https://platform.claude.com/docs/en/build-with-claude/prompt-caching>.

### Concurrence

- `tzachbon/claude-model-router-hook` :
  <https://github.com/tzachbon/claude-model-router-hook> (MIT, 105 ★ au 2026-10-26).
- `edagher92-coder/claude-model-router` :
  <https://github.com/edagher92-coder/claude-model-router> (MIT, 0 ★ au 2026-10-26).
- `musistudio/claude-code-router` :
  <https://github.com/musistudio/claude-code-router> (MIT, 37,8k ★ au 2026-10-26).
- `@musistudio/claude-code-router` npm :
  <https://www.npmjs.com/package/@musistudio/claude-code-router> (v3.1.3).
- `weave-os/router` :
  <https://github.com/weave-os/router> (Apache-2.0, 5,6k ★ au 2026-10-26).
- Show HN Weave :
  <https://news.ycombinator.com/item?id=48688700> (216 points, 113 commentaires).
- LiteLLM Auto Router — benchmark coût/qualité :
  <https://docs.litellm.ai/blog/auto-router-cost-quality-benchmark>.
- LiteLLM — benchmarks publics :
  <https://docs.litellm.ai/docs/auto_router/benchmarks>.
- `lm-sys/RouteLLM` :
  <https://github.com/lm-sys/RouteLLM> (Apache-2.0).
- `PBJ-2/clauderipple` :
  <https://github.com/PBJ-2/clauderipple> (GPL-3.0, 72 ★ au 2026-10-26).

### Projet

- `docs/BENCHMARK.md` — résultats 48 runs, analyse, incident, limites.
- `docs/benchmarks/2026-10-26-expanded.json` — dataset publié, assaini.
- `bench/README.md` — protocole canonique, merge, publication.
- `docs/RESEARCH.md` — veille lineup/CLI (2026-10-24).

## 10. Incertitudes à re-vérifier avant publication

- **Chiffres d'adoption** (étoiles, forks, téléchargements) : snapshot 2026-10-26, à
  actualiser le jour du lancement.
- **Routage natif Anthropic** : `opusplan` est là, #15721 est fermée, mais #27665 reste
  ouverte et les utilisateurs demandent plus. Surveiller une éventuelle version native.
- **Lineup et prix** : Fable 5.1 / Opus 5.5 / Sonnet 5.5 / Haiku 5.5 au 2026-10-24 ;
  revérifier avant tout chiffre public.
- **Nom npm/bin** : `cc-model-router` est disponible (vérifié le 2026-10-26) ; le binaire
  `cc-router` est déjà pris par le package npm `cc-router@4.0.0`. Décision : package
  `cc-model-router`, binaires `cc-model-router` + alias `ccmr`, pas de collision.
- **Benchmark** : 12 tâches, 2 répétitions ; pas d'IC, pas de revue aveugle. Ne pas
  présenter comme une preuve statistique.
- **Marque** : ne pas suggérer une affiliation Anthropic ; MIT, mention explicite.
- **Concurrent direct** : `tzachbon` peut ajouter un benchmark ou changer de stratégie ;
  relire son README avant le lancement.
