# devquiz — spécification (fixture de benchmark)

> Fixture synthétique et autonome. Elle reproduit la structure de la spec réelle
> (identifiants de fonctionnalités, questions ouvertes, AC1 de F-01) sans dépendre
> d'un dépôt privé. Le vrai devquiz peut être utilisé avec `--repo <chemin>`.

## Contexte

devquiz génère chaque jour un quiz de développement (Python, Angular, entretien
backend), le fait pratiquer, puis suit la progression. Le pipeline lit des fichiers
YAML versionnés et publie un quiz quotidien.

## Fonctionnalités

| Id | Fonctionnalité | Dépend de | Lot | Statut |
|---|---|---|---|---|
| F-01 | Profil et parcours en YAML validés | — | A | proposed |
| F-02 | Collecte des extraits de doc officielle | F-01 | A | proposed |
| F-03 | Génération quotidienne du quiz | F-01, F-02 | A | proposed |
| F-04 | Vérification des questions | F-03 | A | proposed |
| F-05 | Leçon du jour | F-03 | A | proposed |
| F-06 | Suivi de progression | F-03 | A | proposed |
| F-07 | Publication du quiz | F-03 | A | proposed |
| F-08 | Interface de quiz | F-03 | A | proposed |
| F-09 | Signalement d'une question | F-03 | A | proposed |
| F-10 | Exercice pratique externe du jour | F-01, F-05 | B | proposed |
| F-11 | Suivi du coût et plafond quotidien | F-03 | B | proposed |
| F-12 | Export et import de la progression | F-06 | B | proposed |
| F-13 | Veille : questions tirées de l'actualité | F-04 | C | proposed |
| F-14 | Tendances des offres d'emploi | F-01 | C | proposed |

Lot A : l'outil tourne et sert un quiz juste chaque jour.
Lot B : il apprend vraiment et reste maîtrisé (coût, sauvegarde).
Lot C : il suit le marché.

Statuts : proposed, approved, in-progress, done, partial, blocked.

## Questions ouvertes

| Id | Question | Concerne | Réponse |
|---|---|---|---|
| Q-01 | Nom du dépôt ? | tout | |
| Q-02 | Fournisseur LLM et budget quotidien ? | F-03, F-11 | |
| Q-03 | Langue des questions ? | F-03, F-08 | |
| Q-04 | Volume quotidien (minutes, questions) ? | F-03, F-05 | |
| Q-05 | Hébergement du front ? | F-07 | |
| Q-06 | Un ou plusieurs appareils ? | F-06, F-12 | |
| Q-07 | Pistes de départ et niveaux ? | F-01 | |
| Q-08 | Sources d'offres d'emploi ? | F-14 | |
| Q-09 | Heure de publication ? | F-07 | |
| Q-10 | Plateformes d'exercices externes ? | F-10 | |
| Q-11 | Profil Forge ? | tout | |

## Détail des fonctionnalités

### F-01 Profil et parcours en YAML validés

Acteur : l'apprenant (édite les fichiers), le pipeline (les lit).

Acceptation :

- AC1 `profil.yaml` déclare les pistes actives, la langue et le volume quotidien ;
  `parcours/<piste>.yaml` liste les notions dans l'ordre, chacune avec un identifiant
  unique, un titre, au moins une URL de documentation officielle et, en option, un
  exercice externe.
- AC2 la commande `devquiz check` valide tous les fichiers et sort avec le code 0.
- AC3 (négatif) un champ manquant, une URL invalide, un identifiant de notion en double
  ou une piste inconnue : code non nul et message nommant le fichier, le champ et la ligne.
- AC4 au moins trois parcours livrés : Python (débutant), Angular (débutant) et un
  parcours d'entretien (fondamentaux backend).

Scénarios : PS-11 (accents, chaînes longues), PS-12 (champ vide contre absent).
Données : fichiers YAML versionnés ; `state/progression.json` (dernière notion vue).
Hors périmètre : éditeur graphique des parcours.
Statut : proposed.
