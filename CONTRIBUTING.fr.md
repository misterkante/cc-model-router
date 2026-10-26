# Contribuer

[English](CONTRIBUTING.md) · [Français](CONTRIBUTING.fr.md)

Merci d’aider. Ce projet route les tâches Claude Code vers le modèle le moins cher capable de faire le travail, sans dégrader la qualité.

## Règles de base

- **Ne jamais toucher au vrai `~/.claude` d’un contributeur.** Les tests et benchmarks tournent dans le sandbox (`CC_ROUTER_CONFIG_DIR`, `claude --settings`).
- **Aucun secret, token, chemin privé ou donnée utilisateur réelle** dans le code, les fixtures ou les résultats de benchmark.
- Une pull request = un sujet.
- Garder le CLI cœur sans dépendance sauf raison forte.

## Développement

Prérequis : Node.js >= 18. Pour le benchmark : Python 3 + PyYAML.

```bash
npm test
npm run bench:verify
npm run docs:check
npm run plugin:validate
npm run plugin:test
```

Les checks du plugin tournent sans appel modèle, sans login et sans réseau.

Pour l’intégration TUI (statusline + hook dans une vraie session Claude Code, nécessite `claude`, `tmux` et un login ; opt-in car cela consomme un peu de quota) :

```bash
npm run test:tui
npm run test:tui -- --sonnet-first
```

## Contributions au benchmark

Le benchmark est la couche de preuve du projet. Son protocole canonique est [`bench/README.md`](bench/README.md) (les commandes, noms de fichiers et schémas sont neutres ; la version française est dans [`bench/README.fr.md`](bench/README.fr.md)).

Pour ajouter une tâche :

1. Choisir un tier et un baseline (le modèle qu’un utilisateur aurait utilisé sans le routeur).
2. Écrire un prompt qui route vers ce tier :
   ```bash
   node bin/cc-model-router.js classify "<prompt>"
   ```
3. Déclarer la tâche dans `bench/tasks.mjs` et son check dans `bench/checks.mjs`.
4. Ajouter une fixture synthétique sous `bench/fixtures/` si nécessaire.
5. Lancer `npm run bench:verify` — le check doit être **rouge avant** la tâche.
6. Faire un smoke test pas cher :
   ```bash
   npm run bench -- --tasks <id> --variants routed --budget 0.05
   ```
7. Lancer la comparaison complète et publier le JSON dans `docs/benchmarks/` :
   ```bash
   npm run bench -- --repeats 2 --budget 0.50
   npm run bench:report -- bench/results/<fichier>.json
   npm run bench:publish -- bench/results/<fichier>.json <date>-<nom>
   ```
8. Mettre à jour `docs/BENCHMARK.fr.md` avec les résultats, `n` et les limites.

Un résultat n’est publiable que si :

- le check est déterministe et rouge avant / vert après ;
- le dépôt source n’est pas modifié ;
- aucun changement de fichier inattendu n’est présent ;
- le JSON brut est commité (sans `dir`, hashes, stderr ni `resultPreview`) ;
- tout re-run ou merge est documenté (`mergedTasks`, raison) ;
- le texte parle **coût/quota**, pas « tokens économisés » ;
- le baseline (contrefactuel) est explicite ;
- `n`, répétitions et limites sont indiqués.

## Signaler un résultat de benchmark

Inclure : date, version de Claude Code, lineup de modèles, commande exacte, budget, `n`, JSON brut et limites. Ne pas sélectionner les runs ; publier aussi les échecs. Si un check était faux et a été corrigé, re-scorer les sorties existantes avec `npm run bench:recheck` et documenter la correction au lieu de relancer les modèles. Si une fixture était fautive (par exemple un répertoire manquant qui bloque Bash), corriger la fixture, rejouer uniquement cette tâche, la fusionner avec `npm run bench:merge` et documenter pourquoi. Ne jamais fusionner en silence.

## Style de commit

Commits conventionnels : `feat:`, `fix:`, `docs:`, `test:`, `chore:`. Sujet à l’impératif, sous ~72 caractères.

## Style de code

- ESM, pas d’étape de build.
- Préférer de petites fonctions pures ; garder le classifieur testable.
- Ajouter un test pour chaque changement de comportement (`npm test`).
- Ne pas ajouter de dépendance pour le CLI cœur.

## Sécurité

- Le routeur observe les prompts ; ne pas logger le contenu des prompts par défaut.
- Les fixtures de benchmark doivent être synthétiques.
- Ne pas ouvrir d’issue publique avec des détails d’exploit ; contacter le mainteneur d’abord.
