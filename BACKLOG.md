# BACKLOG.md — travaux restants

> Dérivé de [`AURA_cadrage.md`](AURA_cadrage.md) via [`SPEC.md`](SPEC.md).
> État au **26 juillet 2026**. Estimations en heures-agent, pas en heures-humain.

**Point de départ réel :** 5 écrans en ligne couvrant 5 des 31 modules du cadrage
(dont 3 partiellement), aucun backend, aucune authentification, aucune persistance.

---

## P0 — Bloquants immédiats

Sans ces points, rien d'autre ne peut être décidé correctement.

| # | Travail | Dépend de | Est. |
|---|---|---|---|
| 0.1 | **Publier le template Lovable** et fournir l'URL publique (`*.lovable.app`, sans `id-preview--`). L'URL actuelle redirige vers `lovable.dev/auth-bridge` : le modèle UI/UX est inaccessible, donc la refonte visuelle est bloquée. | équipe | — |
| 0.2 | **Arbitrer le périmètre démo.** 31 modules ne sont pas réalisables. Choisir les 6 à 8 modules qui seront réellement cliquables devant le jury ; les autres passent en slide. | équipe | — |
| 0.3 | **Refonte du domaine : `Fragment` → `Projet`.** Le cadrage travaille au niveau du projet ; le code au niveau du fragment de mémoire. Introduire `Project`, `JournalEntry`, `StudentProfile` et rattacher `Fragment` comme source. Élargir le port `FragmentRepository` en `SoaRepository`. | 0.2 | 3–4 h |

**Pourquoi 0.3 est P0 :** tout écran de M1, M2, M3, M19 construit avant cette refonte
sera à réécrire. C'est la seule dette qui grossit avec chaque écran ajouté.

---

## P1 — Le produit du cadrage devient visible

### Landing page publique

| # | Travail | Dépend de | Est. |
|---|---|---|---|
| 1.1 | Landing `/` publique — modelée sur le template Lovable : proposition de valeur, les deux échecs (abandon / disparition), la boucle SOA, appel à l'action inscription. Aujourd'hui le domaine ouvre directement sur un champ de recherche, sans aucune explication du produit. | 0.1 | 4–6 h |
| 1.2 | Séparer le chrome public du chrome applicatif (`Shell` actuel unique) : en-tête public avec navigation marketing vs. en-tête applicatif avec profil et notifications. | 1.1 | 1–2 h |

### Socle étudiant (M1, M2, M3, M19)

| # | Travail | Dépend de | Est. |
|---|---|---|---|
| 1.3 | **M1 — Auth + profil.** Inscription / connexion (mock suffisant pour la démo), `/profil/:id`, édition. Champs du cadrage : université, niveau L1–M2, filière, technos, centres d'intérêt, disponibilités, objectifs. | 0.3 | 4–5 h |
| 1.4 | **M2 — Projets.** Liste, création, détail. 5 statuts imposés (`Idée`, `En cours`, `En pause`, `Abandonné`, `Terminé`), types, technos, dates, difficulté. | 0.3 | 5–6 h |
| 1.5 | **M3 — Journal de progression.** Timeline horodatée par projet : décisions, erreurs, solutions, changements d'architecture, apprentissages. Reprend et remplace l'écran `#/deposer` actuel. | 1.4 | 3–4 h |
| 1.6 | **M19 — Tableau de bord.** Projets commencés / terminés, progression moyenne, techno la plus utilisée. | 1.4 | 2–3 h |

### Mémoire IA (M5, M6, M15)

| # | Travail | Dépend de | Est. |
|---|---|---|---|
| 1.7 | **M6 — Reprise, élargie au projet.** L'écran `#/reprise` existe mais est câblé sur une capsule unique en dur. Le brancher sur un projet réel et son journal. | 1.5 | 2 h |
| 1.8 | **M15 — Renaissance.** Galerie des projets abandonnés avec état et raison d'abandon, et parcours « je reprends ce projet ». C'est le module qui répond le plus directement au 2ᵉ échec de la lettre. | 1.4 | 3–4 h |
| 1.9 | **M5 — Résumé IA.** Bloc sur le détail de projet : objectif / fait / reste à faire / dernière activité / risque d'abandon. Nécessite le backend (P2). | 2.3 | 2 h front |

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

## P3 — Collectif (M8, M9, M10, M14, M18)

Aucun de ces modules n'a de code. Ils supposent tous l'authentification (1.3 / 2.7).

| # | Travail | Est. |
|---|---|---|
| 3.1 | **M8 — Forum** par catégorie (Java, PHP, React, IA, BDD, Réseau) : liste, sujet, réponses. | 5–6 h |
| 3.2 | **M9 — Compagnons** : recherche de coéquipiers par niveau / techno / objectif / disponibilité + matching. | 4–5 h |
| 3.3 | **M10 — Challenges** : liste, détail, participants, suivi hebdomadaire. | 4–5 h |
| 3.4 | **M14 — Validation d'idée** : soumission, vote, commentaires avant démarrage. | 3–4 h |
| 3.5 | **M18 — Mentorat** : rôle mentor (L3/M1/M2/alumni), mise en relation, fil de conseils. | 4–5 h |

---

## P4 — Reconnaissance (M11, M12, M16, M17)

⚠️ **Modules sous tension.** Le cadrage note lui-même que M11 et M12 réintroduisent les
mécaniques (score, niveau, classement) que la lettre de Soa décrit comme déjà testées et
inefficaces. Décision prise : les conserver, mais **secondaires et hors du chemin de
reprise** — voir [SPEC.md §2bis](SPEC.md). À implémenter **après** P1 à P3, jamais avant.

| # | Travail | Est. |
|---|---|---|
| 4.1 | **M12 — Badges et points SOA** : onglet de profil, jamais un bandeau global. | 3 h |
| 4.2 | **M11 — Classements** : écran dédié `/classements`, désactivable par un réglage. | 2–3 h |
| 4.3 | **M16 — Portfolio automatique** : page publique générée à partir des projets terminés, technos, contributions. | 4–5 h |
| 4.4 | **M17 — Présentation de projet** : screenshots, vidéo, documentation, architecture, lien Git. | 3–4 h |
| 4.5 | **M20 — Notifications** : centre de notifications web + types (rappel projet, réponse forum, challenge, opportunité). Le canal e-mail/push est hors périmètre hackathon. | 3–4 h |

---

## P5 — Module Entreprise (E1–E10, M13)

Espace séparé, avec sa propre navigation. Garde-fou du cadrage : *« l'entreprise arrive
après l'apprentissage, pas avant »* — aucun écran étudiant n'expose d'entreprise tant
qu'un projet n'est pas terminé ou repris.

| # | Travail | Est. |
|---|---|---|
| 5.1 | **E1 + E2** — profil entreprise, publication d'opportunités. | 4–5 h |
| 5.2 | **M13** — appels à projets côté étudiant. | 2–3 h |
| 5.3 | **E3 + E4** — fiche talent basée sur les preuves + Project Reliability Score (régularité, projets terminés, documentation, collaboration). | 4–5 h |
| 5.4 | **E5** — Talent Discovery : recherche multicritère avec matching en %. | 4–5 h |
| 5.5 | **E6 + E7** — Entreprise Mentor et challenges sponsorisés. | 4–5 h |
| 5.6 | **E8 + E9** — mise en relation stage/recrutement, validation formelle d'un rôle tenu sur un projet. | 3–4 h |
| 5.7 | **E10** — marketplace de prototypes étudiants. | 4–5 h |

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
| P0 | Déblocage + refonte du domaine | 3–4 h + arbitrages équipe |
| P1 | Landing + socle étudiant + mémoire IA côté front | 26–35 h |
| P2 | Backend, pgvector, API Claude, auth | 18–23 h |
| P3 | Collectif | 20–25 h |
| P4 | Reconnaissance | 15–19 h |
| P5 | Entreprise | 25–32 h |
| P6 | Solidité | 9–13 h |
| **Total** | **le cadrage complet** | **≈ 116–151 h** |

**À dire clairement à l'équipe :** le cadrage complet ne tient pas dans un hackathon de
24 h. La décision 0.2 (choisir 6 à 8 modules réellement cliquables) n'est pas une
préférence — c'est la seule façon d'avoir une démo qui se tient debout.
