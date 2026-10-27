# Fixtures

[English](README.md) · [Français](README.fr.md)

Chaque fixture est synthétique et autonome. Les checks doivent être **rouges avant** la
tâche et **verts après** ; `npm run bench:verify` l’impose pour les checks basés sur des
fichiers.

| Fixture | Utilisée par | Défauts plantés |
|---|---|---|
| `daily-quiz/` | `mech-*`, `impl-*` | Aucun. Spec synthétique avec F-01..F-14, Q-01..Q-11 et F-01 AC1. |
| `buggy-python/` | `debug-calc` | `add` soustrait, `average([])` divise par zéro, `clamp` a un off-by-one. |
| `buggy-python-parse/` | `debug-parse` | Le parser de durée rejette les espaces, accepte `90m` et `1h90m`. |
| `buggy-python-state/` | `debug-state` | Le panier partage la liste d’entrée, supprime toutes les occurrences, ignore les mises à jour manquantes, accepte les valeurs négatives. |
| `buggy-python-search/` | `debug-search` | La recherche binaire renvoie n’importe quelle occurrence au lieu de la première ; `find_all` est inversé. |

Pour une fixture de debug, le fichier de test fait partie du contrat : le check vérifie
son SHA-1 et refuse un run qui modifie les tests au lieu de l’implémentation.
