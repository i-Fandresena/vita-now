# SPEC.md — Aura++ / SOA

> **Source de vérité produit : [`AURA_cadrage.md`](AURA_cadrage.md).**
> Ce fichier n'ajoute rien au cadrage : il le **traduit** en écrans, en modèle de données
> et en états d'implémentation. En cas de contradiction, `AURA_cadrage.md` gagne.
>
> Décision du 26 juillet 2026 : `PRODUCT.md`, `Product_2.0.md` et `DESIGN.md` sont
> **archivés** dans [`docs/archive/`](docs/archive/) et ne font plus autorité. Ils
> décrivaient un périmètre volontairement réduit (3 mécaniques) qui ne correspondait
> pas au besoin de l'équipe.

---

## 1. Ce qui s'est passé — l'écart à corriger

Le code en ligne sur https://aura.icpp-conformite.cloud/ a été construit contre
`PRODUCT.md`, qui avait filtré le brainstorm de l'équipe jusqu'à **3 mécaniques**
(matching de blocage, capsule de reprise, boucle de retour) et interdit explicitement
la majorité des modules du cadrage.

Mesure de l'écart, calculée sur le graphe de connaissances (`graphify-out/`) :

| | Cadrage | Couvert par du code |
|---|---|---|
| Modules étudiants (M1–M21) | 21 | **5** (M3 partiel, M6, M7 partiel, M15 partiel, + la Mémoire IA) |
| Modules entreprise (E1–E10) | 10 | **0** |
| **Total** | **31** | **5, dont 3 partiels** |

Les 5 écrans en ligne ne sont pas faux — ils sont **une fraction** du produit voulu,
et ils s'articulent autour d'un vocabulaire (« fragment », « braise », « sceau »)
qui n'existe nulle part dans le cadrage.

**Ce document remet le cadrage au centre.**

---

## 2. Le sujet — invariants non négociables

Ils viennent de la lettre de Soa, pas d'une préférence d'équipe.

1. **L'abandon** — l'effort s'arrête vers le 3e-4e jour, faute de signal de progression.
2. **La disparition** — l'effort terminé (le mémoire) ne sert jamais à personne.
3. **Exclusion explicite** — « un nouveau GitHub ou un Notion revisité : j'en ai déjà
   testé des centaines ». Tout écran qui se réduit à *organiser* est un contre-sens ;
   un écran doit aider à **reprendre** ou à **transmettre**.

### 2bis. La tension assumée sur la gamification

Le cadrage lui-même (§ « Points de tension ») note que les modules M7 (messages type
Duolingo), M11 (leaderboard) et M12 (points/badges) réintroduisent exactement les
mécaniques que la lettre décrit comme déjà testées et inefficaces (« pas de streak à
casser, pas de score, pas de niveau suivant »).

**Décision : ces modules sont conservés** (arbitrage du 26 juillet 2026), avec une
règle de mise en œuvre qui limite le risque de contre-sens devant le jury :

- Le **signal par défaut** d'un projet est **factuel** (« ton mémoire a servi à X sur Y »,
  « tu en étais à la règle d'arbitrage »), pas quantifié.
- Les mécaniques de score/classement (M11, M12, E4) sont **secondaires et désactivables** :
  elles vivent sur leurs propres écrans, jamais dans le chemin critique de la reprise
  d'un projet.
- Aucun écran de reprise (M6, M7) n'affiche de streak, de pourcentage de complétion ni
  de message culpabilisant. Le rappel est orienté action (« corrige cette erreur Java
  pendant 20 minutes »), ce que le cadrage demande explicitement.

Si le jury attaque sur ce point, la réponse est celle du cadrage : le score n'est pas
le moteur, c'est un sous-produit ; le moteur est la reprise.

---

## 3. Architecture produit (schéma du cadrage)

```
                          Étudiants
                              ↓
              Projets + Progression + Communauté
                              ↓
                       Mémoire IA SOA
                     ↙                ↘
              Entreprises          Universités
              Stages               Suivi pédagogique
              Emplois              Projets académiques
              Challenges           Classements
```

La **Mémoire IA SOA** est le pivot : tout ce qui est produit en haut (journal,
commits, discussions, mémoires) y est indexé, et tout ce qui est consommé en bas
(reprise, matching, preuve de compétence) en découle. C'est la seule brique dont
l'absence rend le reste décoratif.

---

## 4. Modules → écrans → état

Légende d'état : **✅ en ligne** · **🟡 partiel** · **⬜ à faire**

### 4.1 Socle étudiant

| # | Module | Écran(s) | État |
|---|---|---|---|
| M1 | Comptes et profils étudiants | `/inscription`, `/connexion`, `/profil/:id`, `/profil/edition` | ⬜ |
| M2 | Gestion de projets | `/projets`, `/projets/nouveau`, `/projets/:id` | ⬜ |
| M3 | Journal de progression (Timeline) | `/projets/:id/journal` | 🟡 — `DepositScreen` capte une entrée, sans horodatage ni historique |
| M19 | Analytics personnel | `/tableau-de-bord` | ⬜ |
| M20 | Notifications | `/notifications` + centre déroulant | ⬜ |

**M2 — statuts de projet (repris du cadrage, ne pas inventer d'autres valeurs) :**
`Idée` · `En cours` · `En pause` · `Abandonné` · `Terminé`

**M2 — champs :** nom, description, type (`académique` | `personnel` | `startup` |
`open source` | `recherche`), technos, objectif, durée, dates, difficulté.

**M1 — champs de profil :** nom, université, niveau (`L1`…`M2`), filière, technos
maîtrisées, centres d'intérêt, disponibilités, objectifs personnels.

### 4.2 Mémoire IA — le cœur

| # | Module | Écran(s) | État |
|---|---|---|---|
| M4 | Intégration GitHub / GitLab | `/projets/:id/depots` | ⬜ — mock accepté pour la démo |
| M5 | Résumé intelligent par IA | bloc sur `/projets/:id` | ⬜ |
| M6 | Assistant IA de reprise | `/reprise` (existe : `#/reprise`) | ✅ |
| M15 | Projet abandonné / Renaissance | `/renaissance`, `/renaissance/:id` | 🟡 — le corpus de fragments en tient lieu, sans notion de reprise de projet |
| — | Recherche dans la mémoire | `/` (existe : recherche + `#/fragment/:id`) | ✅ |

**M5 — sortie attendue de l'IA** (contrat, à respecter côté serveur) :
`objectif` · `ce qui est fait` · `ce qui reste à faire` · `dernière activité` ·
`risque d'abandon`. Jamais du code brut prêt à copier — le raisonnement, les choix,
les impasses.

### 4.3 Collectif

| # | Module | Écran(s) | État |
|---|---|---|---|
| M8 | Communauté étudiante (forum) | `/communaute`, `/communaute/:categorie`, `/communaute/sujet/:id` | ⬜ |
| M9 | Groupes de progression / compagnons | `/compagnons` | ⬜ |
| M10 | Challenges de projets | `/challenges`, `/challenges/:id` | ⬜ |
| M14 | Validation d'idée avant projet | `/idees`, `/idees/:id` | ⬜ |
| M18 | Système de mentorat | `/mentorat` | ⬜ |

Catégories de forum du cadrage : `Java` · `PHP` · `React` · `IA` · `BDD` · `Réseau`.

### 4.4 Reconnaissance (secondaire — cf. §2bis)

| # | Module | Écran(s) | État |
|---|---|---|---|
| M7 | Système anti-abandon | intégré à `/reprise` + `/notifications` | 🟡 — détection d'inactivité simulée |
| M11 | Leaderboard | `/classements` | ⬜ |
| M12 | Mérite, badges, points SOA | `/profil/:id` (onglet) | ⬜ |
| M16 | Portfolio automatique | `/portfolio/:id` (public) | ⬜ |
| M17 | Présentation des projets | `/projets/:id/presentation` | ⬜ |
| — | Retour à l'auteur | `#/signal/:id` (existe) | ✅ |

### 4.5 Module Entreprise

| # | Module | Écran(s) | État |
|---|---|---|---|
| E1 | Profil entreprise | `/entreprise/profil` | ⬜ |
| E2 | Publication d'opportunités | `/entreprise/opportunites` | ⬜ |
| E3 | Recrutement basé sur les preuves | `/entreprise/talents/:id` | ⬜ |
| E4 | Project Reliability Score | bloc sur `/entreprise/talents/:id` | ⬜ |
| E5 | Talent Discovery | `/entreprise/recherche` | ⬜ |
| E6 | Programme Entreprise Mentor | `/entreprise/mentorat` | ⬜ |
| E7 | Challenges sponsorisés | `/entreprise/challenges` | ⬜ |
| E8 | Stage et recrutement direct | flux depuis E3 | ⬜ |
| E9 | Validation des compétences | badge sur `/portfolio/:id` | ⬜ |
| E10 | Marketplace de projets étudiants | `/entreprise/marketplace` | ⬜ |
| M13 | Appels à projets (côté étudiant) | `/opportunites` | ⬜ |

**Garde-fou du cadrage lui-même :** « SOA ne doit pas devenir uniquement un LinkedIn
étudiant — l'entreprise arrive **après** l'apprentissage, pas avant. » Conséquence
d'implémentation : aucun écran étudiant n'affiche d'entreprise tant qu'un projet n'est
pas terminé ou repris. L'espace entreprise est un **espace séparé**, avec sa propre
navigation, pas un bandeau dans le produit étudiant.

### 4.6 Hors périmètre web

| # | Module | Décision |
|---|---|---|
| M21 | Application mobile | Hors périmètre code. Le web est responsive ; l'app native est une slide de roadmap. |

---

## 5. Ce qui existe réellement aujourd'hui

Front React/Vite déployé, **aucun backend**.

| Écran en ligne | URL | Rôle dans le cadrage |
|---|---|---|
| Recherche | `#/` | Mémoire IA SOA — consultation |
| Résultat détaillé | `#/fragment/:id` | Mémoire IA SOA — lecture d'un travail passé |
| Reprise | `#/reprise` | M6 + amorce M7 |
| Dépôt | `#/deposer` | amorce M3 |
| Retour à l'auteur | `#/signal/:id` | signal de progression factuel |

- Données : corpus déterministe en mémoire (`web/src/data/corpus.ts`), 5 entrées.
- Utilisateur courant codé en dur (`CURRENT_USER`) — pas d'authentification.
- Aucune persistance : un rechargement perd les dépôts.
- Aucun test, aucune CI.
- Le port `FragmentRepository` (`web/src/domain/repository.ts`) expose **6 méthodes** :
  `search`, `getById`, `capsuleForCurrentProject`, `declareUse`, `latestSignal`, `deposit`.

**Le vocabulaire actuel du code (« fragment ») devra être élargi** : dans le cadrage,
l'unité n'est pas un fragment de mémoire mais un **projet**, dont les mémoires et les
entrées de journal sont des sources. Voir [`BACKLOG.md`](BACKLOG.md) § Refonte du domaine.

---

## 6. Direction visuelle

**Modèle de référence : le template Lovable fourni par l'équipe** (à publier — voir
`BACKLOG.md`). Tant qu'il n'est pas accessible, aucune décision de refonte visuelle
n'est figée ici.

Ce qui est déjà tranché :

- Cible unique : **web responsive**. Pas de natif, pas de packaging d'extension.
- Stack : React + Vite + Tailwind 4 + shadcn/ui.
- Les tokens actuels (encre/os/braise) sont documentés dans
  [`docs/archive/DESIGN.md`](docs/archive/DESIGN.md). **Ils restent ceux du code en
  ligne** jusqu'à la refonte ; ils ne font plus autorité mais restent la seule
  description exacte de ce qui tourne.
- Skills de design installés et utilisés dans cet ordre : `ui-ux-pro-max` (intelligence
  UI/UX, palettes, typographie) → `impeccable` (direction créative + détection de slop)
  → `shadcn` (exécution des composants) → `frontend-design` (garde-fou conceptuel) →
  `review-animations` / `improve-animations` (audit du mouvement, en fin de course).

---

## 7. Contrat de génération

Avant toute génération d'écran ou de composant :

1. Relire `AURA_cadrage.md`, puis ce fichier.
2. Vérifier que l'écran correspond à un module numéroté du §4. Un écran qui n'entre
   dans aucun module ne doit pas exister.
3. Vérifier §2 : l'écran aide-t-il à **reprendre** ou à **transmettre** ? S'il aide
   seulement à *organiser*, il tombe sous l'exclusion « GitHub / Notion revisité ».
4. Vérifier §2bis : aucune mécanique de score dans un chemin de reprise.
5. En cas de conflit entre une demande et ce document, **le signaler explicitement**
   au lieu de trancher en silence.

---

*Traduction opérationnelle de `AURA_cadrage.md`. Toute évolution du périmètre se fait
d'abord dans le cadrage, puis ici.*
