# Fixture buggy-python

[English](README.md) · [Français](README.fr.md)

Fixture Python minimale pour la tâche `debug-calc`.

Trois bugs sont plantés dans `calc.py` :

1. `add` soustrait au lieu d’additionner ;
2. `average([])` divise par zéro ;
3. `clamp` renvoie `value + 1` au lieu de `value`.

`test_calc.py` doit rester inchangé : le check vérifie son SHA-1 et lance
`python3 -m unittest -q test_calc`. Les tests doivent échouer avant le fix et passer
après.

Ne « corrige » pas les tests ; la tâche consiste à corriger l’implémentation.
