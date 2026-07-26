# BACKLOG.md — travaux restants

> Dérivé de [`AURA_cadrage.md`](AURA_cadrage.md) via [`SPEC.md`](SPEC.md).
> État au **26 juillet 2026**. Estimations en heures-agent, pas en heures-humain.

**Point de départ réel :** 37 routes couvrant les 31 modules du cadrage **et**
la branche Universités du schéma d'architecture — 29 complets, 4 partiels.
Aucun backend, aucune persistance.

---

## Fait le 26 juillet 2026

### Première passe — l'interface des 31 modules

- Couche domaine complète (`domain/soa.ts`), calquée module par module sur le cadrage
- Corpus de démonstration cohérent
- État applicatif avec **mutations réelles** (`app/soa-store.tsx`)
- Navigation **mobile d'abord** : barre d'onglets basse (5 entrées) sous 1024px,
  rail latéral au-delà, zones de sécurité respectées, cibles ≥ 44px
- Scène 3D refaite : feuillets à coins arrondis, ombre de contact réelle,
  irrégularité déterministe, dérive de caméra

### Seconde passe — l'audit contre le texte du cadrage

Un audit ligne à ligne a révélé que la table de couverture était **trop
généreuse** : sept points du document étaient comptés comme faits sans l'être,
et une branche entière du schéma d'architecture avait été omise.

- **Branche Universités** — absente jusque-là. Elle n'apparaît dans aucun des
  21 modules numérotés, seulement dans le schéma, ce qui explique l'oubli.
  Espace séparé : suivi pédagogique, projets académiques, classements.
  Règle assumée : aucune note saisissable.
- **M1** — connexion, inscription, édition de profil, déconnexion. Les quatre
  fournisseurs du cadrage. Aucun mot de passe vérifié, et l'écran le dit.
- **M11** le classement « académique (meilleur projet par catégorie) » manquait
- **M12** les « Points SOA » n'existaient pas, seuls les badges
- **M14** les commentaires d'idée s'affichaient sans pouvoir en ajouter
- **M18** l'annuaire de mentors n'avait aucun flux de mise en relation
- **M13** « entreprises **ou étudiants** publient » — un étudiant peut publier
- **M15** l'état des projets arrêtés n'affichait pas le pourcentage
- **M19** la « progression moyenne » manquait
- Également : M17 présentation éditable avec vidéo, M20 les trois canaux,
  E8/E9 actions entreprise câblées

**Le périmètre restant est entièrement du backend.**

---

## P0 — Bloquants immédiats

| # | Travail | Dépend de | Est. |
|---|---|---|---|
| 0.1 | **Arbitrer le scénario de soutenance.** 31 modules sont parcourables ; une démonstration de 5 minutes en montre 6 à 8. Choisir lesquels, dans quel ordre, et l'écrire. | équipe | — |
| 0.2 | **Trancher les écarts au template** consignés dans [DESIGN.md §3](DESIGN.md) : statistiques et témoignage inventés (non publiés), bandeau d'écoles, intégrations annoncées. | équipe | — |
| 0.3 | **Contrôle visuel réel** sur téléphone et sur le projecteur de soutenance. Le développement s'est fait sans navigateur : la vérification est protocolaire (typecheck, build, CSS généré, aller-retour de routes), pas visuelle. | équipe | 1 h |

---

## P1 — Ce qui manque encore à l'interface

| # | Travail | Dépend de | Est. |
|---|---|---|---|
| 1.1 | **M20 — Notifications déclenchées par toutes les mutations.** Demander un mentor et proposer un entretien en créent une ; reprendre le projet de quelqu'un devrait aussi notifier son auteur. | — | 2 h |
| 1.2 | **E6 — Encadrement par des développeurs seniors** sur les challenges sponsorisés. Le sponsoring existe, l'encadrement n'est pas modélisé. | — | 2–3 h |
| 1.3 | **Envoi de fichiers** — captures (M17) et vidéos. Seuls des liens sont saisissables aujourd'hui, faute de stockage. | 2.3 | 3 h |

---

## P2 — Backend et Mémoire IA réelle

Sans cela, le produit reste une maquette : c'est le cœur technique risqué et il n'est
**pas validé**.

| # | Travail | Dépend de | Est. |
|---|---|---|---|
| 2.1 | PostgreSQL + pgvector provisionnés, schéma (`students`, `projects`, `journal_entries`, `fragments`, `embeddings`, `signals`). | — | 2–3 h |
| 2.2 | Ingestion et embedding du corpus (mémoires, projets, entrées de journal). | 2.1 | 3–4 h |
| 2.3 | **API REST** exposant le port élargi. Réponse < 2 s, `AbortSignal` honoré côté `search`. | 2.2 | 4–5 h |
| 2.4 | **Extraction par l'API Claude** : à partir d'un mémoire brut, produire raisonnement / choix / impasses / pistes. Jamais de code brut en sortie. | 2.3 | 3–4 h |
| 2.5 | `HttpSoaRepository` écrit et passé au provider. Vérifier qu'**aucun composant** n'est modifié. | 2.3, 0.3 | 1 h |
| 2.6 | Persistance des dépôts (aujourd'hui perdus au rechargement). | 2.3 | 1 h |
| 2.7 | Auth réelle minimale — nécessaire pour que « l'auteur » et « le chercheur » soient deux personnes distinctes à l'écran. | 2.3, 1.3 | 2–3 h |
| 2.8 | **M7 — Détection d'inactivité réelle** déclenchant la capsule (aujourd'hui simulée). Rappel orienté action, jamais culpabilisant (cf. [SPEC.md §2bis](SPEC.md)). | 2.3 | 2 h |

---

## P3 à P5 — Collectif, Reconnaissance, Entreprise

**Faits côté interface.** Ces trois blocs étaient l'essentiel du backlog
précédent ; ils sont désormais construits et parcourables. Ce qui reste pour
chacun est **le même travail** : brancher les écrans sur l'API de P2, et
persister. Détail des 10 modules encore partiels dans [SPEC.md §4](SPEC.md).

Le seul reliquat d'interface est listé en P1 (inscription, édition de profil,
envoi de captures, actions entreprise, notifications déclenchées).

---

## P6 — Solidité

| # | Travail | Est. |
|---|---|---|
| 6.1 | Tests : classement de recherche et repli 3D en premier. | 3–4 h |
| 6.2 | CI (typecheck + build) et déploiement automatisé vers `/var/www/aura-plus-plus`. | 2–3 h |
| 6.3 | Passe Lighthouse + audit clavier complet sur tous les écrans. | 2–3 h |
| 6.4 | Passe `review-animations` / `improve-animations` sur les moments narratifs. | 1–2 h |
| 6.5 | Passe `/impeccable audit` de fin de production. | 1 h |

---

## Hors périmètre code

| Module | Décision |
|---|---|
| M21 — Application mobile native | Slide de roadmap. Le web reste responsive. |
| M4 — Intégration GitHub/GitLab réelle | Mock accepté pour la démo ; l'OAuth réel est hors budget 24 h. |
| Extension VS Code | Slide de roadmap. |
| Business plan / rentabilisation | Slide de pitch. |

---

## Chiffrage de synthèse

| Priorité | Portée | Estimation |
|---|---|---|
| P0 | Arbitrages équipe + contrôle visuel réel | 1 h + décisions |
| P1 | Reliquat d'interface (notifications, encadrement, envoi de fichiers) | 7–8 h |
| P2 | Backend, pgvector, API Claude, persistance, auth réelle | 18–23 h |
| P3–P5 | Branchement des écrans existants sur l'API | 10–14 h |
| P6 | Solidité (tests, CI, Lighthouse, audits) | 9–13 h |
| **Total** | **du prototype au produit** | **≈ 45–59 h** |

**Ce qu'il faut dire à l'équipe :** le produit est parcourable de bout en bout,
il n'est pas opérationnel. La différence tient en une phrase — un rechargement
de page efface tout. C'est le seul point sur lequel une démonstration peut se
faire prendre en défaut, et il vaut mieux l'annoncer que le subir.
