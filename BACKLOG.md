# BACKLOG.md — travaux restants

> Dérivé de [`AURA_cadrage.md`](AURA_cadrage.md) via [`SPEC.md`](SPEC.md).
> État au **26 juillet 2026**. Estimations en heures-agent, pas en heures-humain.

**Point de départ réel :** 33 routes en ligne couvrant les 31 modules du cadrage
(20 complets, 10 partiels), aucun backend, aucune authentification, aucune
persistance.

---

## Fait le 26 juillet 2026

L'écart de périmètre est résorbé **côté interface**. Les 31 modules du cadrage
ont une route, un écran et des données de démonstration ; 20 sont complets,
10 partiels, 0 absent. Détail par module dans [SPEC.md §4](SPEC.md).

Réalisé dans cette passe :

- Couche domaine complète (`domain/soa.ts`), calquée module par module sur le cadrage
- Corpus de démonstration cohérent : 8 étudiants, 10 projets, 12 entrées de journal,
  6 sujets de forum, 3 challenges, 3 idées, 3 entreprises, 3 opportunités
- État applicatif avec **mutations réelles** (`app/soa-store.tsx`)
- Navigation **mobile d'abord** : barre d'onglets basse (5 entrées) sous 1024px,
  rail latéral au-delà, zones de sécurité respectées, cibles ≥ 44px
- 33 routes, aller-retour URL vérifié sur chacune
- Scène 3D refaite : feuillets à coins arrondis, ombre de contact réelle,
  irrégularité déterministe, dérive de caméra

**Le périmètre restant est presque entièrement du backend.**

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
| 1.1 | **M1 — Écrans d'inscription et de connexion.** Le profil existe, l'entrée dans le produit non. Mock suffisant pour la démo. | — | 2–3 h |
| 1.2 | **M1 — Édition de profil.** Aujourd'hui en lecture seule. | 1.1 | 2 h |
| 1.3 | **M17 — Envoi de captures** sur la présentation de projet (emplacements réservés aujourd'hui). | — | 2 h |
| 1.4 | **E2 / E8 — Câbler les actions entreprise** : publier une offre, proposer un entretien, valider une compétence. Les boutons existent, ils ne font rien. | 2.3 | 3 h |
| 1.5 | **M20 — Notifications déclenchées par les mutations** : reprendre un projet doit réellement notifier son auteur. Aujourd'hui la liste est statique. | — | 2 h |

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
| P1 | Reliquat d'interface (auth, édition, captures, actions) | 11–12 h |
| P2 | Backend, pgvector, API Claude, persistance, auth | 18–23 h |
| P3–P5 | Branchement des écrans existants sur l'API | 10–14 h |
| P6 | Solidité (tests, CI, Lighthouse, audits) | 9–13 h |
| **Total** | **du prototype au produit** | **≈ 49–63 h** |

À comparer aux ≈116–151 h estimées le matin même : l'écart est ce que la passe
d'interface a absorbé.

**Ce qu'il faut dire à l'équipe :** le produit est parcourable de bout en bout,
il n'est pas opérationnel. La différence tient en une phrase — un rechargement
de page efface tout. C'est le seul point sur lequel une démonstration peut se
faire prendre en défaut, et il vaut mieux l'annoncer que le subir.
