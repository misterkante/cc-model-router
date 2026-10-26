# Plugin Claude Code

[English](PLUGIN.md) · [Français](PLUGIN.fr.md)

`cc-model-router` est aussi livré comme plugin Claude Code. Le plugin est un
mod : il lit chaque prompt, le classifie avec le même classifieur et la même
configuration que le CLI, puis réécrit le modèle et l'effort pour ce tour. Vous
lancez `claude` normalement ; vous ne tapez pas `ccmr run` et vous ne démarrez
pas un second processus Claude.

## Prérequis

- Claude Code 2.1.287 ou plus récent. Testé sur 2.1.309.
- Un espace de travail de confiance. Claude Code ne charge pas les mods dans un
  dossier non approuvé ou quand les hooks sont désactivés.

## Installation

### Depuis le marketplace

Dans une session Claude Code :

```text
/plugin marketplace add misterkante/cc-model-router
/plugin install cc-model-router@cc-model-router
```

La commande d’installation ouvre les détails du plugin pour choisir le scope
utilisateur, projet ou local. Si Claude Code demande un rechargement, lancez
`/reload-plugins`. Lancez ensuite `/ccmr` pour voir le modèle courant et la
dernière décision de routage.

Depuis un shell, sans session interactive :

```bash
claude plugin marketplace add misterkante/cc-model-router
claude plugin install cc-model-router@cc-model-router
```

### Depuis un clone local

```bash
claude --plugin-dir /chemin/vers/cc-model-router/plugin
```

Cette commande charge le plugin pour une session et sert au développement.

### Depuis le paquet npm

Une fois npm `0.2.0` publié, son tarball contient le même dossier `plugin/`.
Pointez Claude Code dessus :

```bash
claude --plugin-dir "$(npm root -g)/cc-model-router/plugin"
```

## Fonctionnement

| Hook | Rôle |
|---|---|
| `prompt.submit` | Classifie le prompt avec la sémantique de `src/classifier.js` et la configuration globale/projet fusionnée. |
| `turn.start` | Associe la décision à l'identifiant du tour. |
| `turn.step` | Réécrit `model` et `effort` sur chaque requête du tour. Les continuations après un outil gardent le même modèle. Les requêtes des sous-agents ne sont pas touchées. |
| `turn.complete` | Supprime l'état du tour. |
| `/ccmr` | Affiche le modèle courant, la dernière décision et le mode de routage. |

Le plugin et le CLI partagent le même format de configuration et la même table
de correspondance des niveaux. La configuration projet gagne toujours sur la
configuration globale.

## Configuration

Le plugin lit les mêmes fichiers que le CLI :

- Global : `~/.claude/model-router.json`
- Projet : `.claude/model-router.json` (gagne sur le global)
- `CC_ROUTER_CONFIG_DIR` déplace l'emplacement de la configuration globale.

Ajoutez un objet `routing` pour contrôler les changements :

```json
{
  "routing": {
    "mode": "per-turn",
    "cacheAware": true,
    "minTurnsBetweenSwitches": 2,
    "minConfidence": 0.5
  }
}
```

| Mode | Comportement |
|---|---|
| `per-turn` | Classifie chaque prompt. C'est le défaut. |
| `session` | Choisit une fois au premier prompt et garde ce modèle pour la session. |
| `off` | Observe et classifie, mais ne change jamais le modèle. |

### Changement compatible avec le cache

Changer de modèle invalide le cache de prompt de la conversation. Le plugin
traite donc l'escalade et la descente différemment :

- Même modèle : l'effort peut changer sans changer de modèle.
- Escalade (par exemple Sonnet vers Opus) : appliquée immédiatement, car la
  raison de qualité est plus forte que le coût du cache.
- Descente (par exemple Opus vers Sonnet ou Haiku) : appliquée seulement après
  `minTurnsBetweenSwitches` tours et si la confiance du classifieur atteint
  `minConfidence`.
- `cacheAware: false` suit toujours le classifieur. Cela peut coûter plus que
  cela ne rapporte sur une longue conversation, car chaque changement rate le
  cache.

La règle de cache est un garde-fou, pas un résultat mesuré. Le benchmark de 48
runs mesure une tâche par processus, pas ce plugin par tour. Ne présentez pas
les chiffres du benchmark comme un benchmark du plugin.

## Qualité et escalade

Le plugin fait seulement le routage. Il ne lance pas `--verify` et ne réessaie
pas une tâche échouée avec un modèle plus gros. Utilisez
`ccmr run --verify "<commande>" --escalate` quand la tâche a besoin d'une porte
de qualité déterministe.

Le débogage va toujours sur Opus par défaut. La stratégie Sonnet-first
optionnelle exige `--verify` et `--escalate`, donc le plugin ne l'applique pas.
Le fallback automatique de Claude Code continue de fonctionner ; le plugin ne
définit pas de modèle de secours par tour.

Les sous-agents ne sont pas routés dans cette version. Ils gardent le modèle de
la session.

## Vérification

Depuis le dépôt :

```bash
npm run plugin:validate
npm run plugin:test
```

La suite du plugin couvre la classification, les mots-clés du projet, le routage
vers Haiku, l'escalade vers Opus, le délai compatible avec le cache, les modes
`off` et `session`, et la seconde requête d'un tour avec outil.

Test réel avec un plafond de budget :

```bash
claude --plugin-dir ./plugin --max-budget-usd 0.02 --output-format json \
  -p "fix typo: teh"
```

Observé le 2026-10-26 : le run n'a utilisé que `claude-haiku-5-5`, a coûté
`$0.00069732` et a réussi. C'est un test de fumée, pas un benchmark.

Le flux marketplace a aussi été testé avec un `CLAUDE_CONFIG_DIR` isolé : ajout
du marketplace et installation réussis, plugin `0.2.0` activé, et `/ccmr` a
renvoyé le modèle courant et `mode=per-turn` sans appel modèle.

## Sécurité

- Les mods ne sont pas sandboxés par Claude Code : ils tournent avec vos
  permissions. Ce plugin lit seulement les fichiers de configuration du routeur
  et le dossier de la session, et ne fait aucune requête réseau.
- Il n'a pas de télémétrie.
- Il peut changer le modèle et l'effort d'une requête. Lisez
  `plugin/hooks/register.js` et lancez `claude plugin validate plugin` avant
  d'installer une copie que vous n'avez pas construite.
