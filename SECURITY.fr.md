# Politique de sécurité

[English](SECURITY.md) · [Français](SECURITY.fr.md)

## Versions supportées

La dernière version `0.x` reçoit les correctifs de sécurité.

## Signaler une vulnérabilité

Merci de **ne pas ouvrir d’issue publique**. Utilise le signalement privé de
vulnérabilités GitHub sur le dépôt (**Security** → **Report a vulnerability**).
Indique :

- la version ou le commit concerné ;
- les étapes de reproduction ;
- l’impact observé.

Tu recevras un accusé de réception sous 7 jours. Merci de laisser au projet le
temps de corriger avant toute divulgation publique.

## Périmètre et notes de sécurité

- `cc-model-router` tourne en local. Il ne proxifie pas le trafic modèle, ne
  collecte pas de télémétrie et n’écrit jamais dans `~/.claude/settings.json`.
- `ccmr run --verify "<commande>"` exécute une **commande shell fournie par
  l’utilisateur** avec ses permissions. N’utilise que des commandes de confiance
  et privilégie les checks en lecture seule (tests, typecheck, lint).
- Le routeur lit `~/.claude/model-router.json` et le
  `.claude/model-router.json` du projet. Ne mets pas de secrets dans ces fichiers.
- Le plugin Claude Code est un mod. Les mods tournent dans Claude Code avec les
  permissions de l’utilisateur et ne sont pas sandboxés. Ce plugin lit les mêmes
  fichiers de configuration et le dossier de la session, change le modèle et
  l’effort d’une requête, et ne fait aucune requête réseau. Il ne lance pas de
  commande shell. Lis `claude plugin validate plugin` avant d’installer une
  copie que tu n’as pas construite.
- Les fixtures du benchmark tournent dans des copies temporaires isolées. Le
  vrai projet et `~/.claude` ne sont pas modifiés.
