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

## 1. Ce qui s'est passé — l'écart, et sa résorption

Le premier front en ligne avait été construit contre `PRODUCT.md`, qui avait
filtré le brainstorm de l'équipe jusqu'à **3 mécaniques** et interdit
explicitement la majorité des modules du cadrage. Mesure de l'écart à ce
moment-là, calculée sur le graphe de connaissances (`graphify-out/`) :
5 des 31 modules touchés par du code, dont 3 partiels, et 0 des 10 modules
entreprise.

**Cet écart est résorbé côté interface** (26 juillet 2026). Les 31 modules ont
désormais un écran, une route et des données de démonstration — voir §4 pour
l'état exact de chacun. Ce qui reste absent est le **backend** : tout passe par
un état en mémoire (`web/src/app/soa-store.tsx`), et rien n'est persisté.

Distinction à tenir devant le jury, parce qu'elle sera posée : le produit est
**parcourable de bout en bout**, il n'est pas **opérationnel**. Un rechargement
de page remet le corpus dans son état initial.

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

Légende : **✅ écran complet** · **🟡 partiel** · **⬜ absent**
« Complet » signifie : route réelle, écran câblé, données de démonstration,
et les mutations qui s'y rattachent fonctionnent. Pas : persisté côté serveur.

### 4.1 Socle étudiant

| # | Module | Route | État |
|---|---|---|---|
| M1 | Comptes et profils étudiants | `#/connexion`, `#/inscription`, `#/profil`, `#/profil/:id`, `#/profil/edition` | ✅ — les 4 fournisseurs du cadrage, édition complète, déconnexion. Aucun mot de passe n'est vérifié, et l'écran le dit. |
| M2 | Gestion de projets | `#/projets`, `#/projets/nouveau`, `#/projets/:id` | ✅ |
| M3 | Journal de progression | `#/projets/:id/journal` | ✅ — 5 natures d'entrée, horodatage, jalons |
| M19 | Analytics personnel | `#/tableau` | ✅ — dont la « progression moyenne », calculée sur les projets non terminés |
| M20 | Notifications | `#/notifications` | 🟡 — les 3 canaux du cadrage sont des réglages ; seul le web fonctionne, les deux autres exigent un serveur |

**Statuts de projet** (du cadrage, ne pas en inventer d'autres) :
`Idée` · `En cours` · `En pause` · `Abandonné` · `Terminé`

**Natures d'entrée de journal** : `Décision` · `Erreur` · `Solution` ·
`Architecture` · `Apprentissage`

### 4.2 Mémoire IA — le pivot

| # | Module | Route | État |
|---|---|---|---|
| M4 | Intégration GitHub / GitLab | `#/projets/:id/depot` | 🟡 — écran réel, **aucune requête réseau**, données de démonstration |
| M5 | Résumé intelligent | bloc sur `#/projets/:id` | 🟡 — déduit du journal par règles explicites, pas par l'API Claude |
| M6 | Assistant de reprise | `#/reprise` | ✅ — capsule dérivée du journal, pas saisie |
| M15 | Projet abandonné / Renaissance | `#/renaissance` | ✅ — état (%, raison) comme l'exige le cadrage ; la reprise garde le journal |
| — | Recherche dans le corpus | `#/memoire`, `#/fragment/:id` | ✅ — classement déterministe en mémoire |

**M5 — contrat de sortie**, à respecter le jour où l'API Claude le produit :
`objectif` · `ce qui est fait` · `ce qui reste à faire` · `dernière activité` ·
`risque d'abandon` + **le pourquoi du risque**. Jamais de code brut.

### 4.3 Collectif

| # | Module | Route | État |
|---|---|---|---|
| M8 | Forum | `#/communaute`, `#/communaute/sujet/:id` | ✅ — 6 catégories du cadrage, réponses fonctionnelles |
| M9 | Compagnons | `#/compagnons` | ✅ — matching par techno / intérêt / disponibilité / niveau, **avec ses raisons** |
| M10 | Challenges | `#/challenges`, `#/challenges/:id` | ✅ — inscription et suivi hebdomadaire réels |
| M14 | Validation d'idée | `#/idees` | ✅ — vote pour / réserve **et** commentaires |
| M18 | Mentorat | `#/mentorat` | ✅ — annuaire **et** demande d'aide avec fil de réponses |

### 4.4 Reconnaissance — secondaire par construction (§2bis)

| # | Module | Route | État |
|---|---|---|---|
| M7 | Anti-abandon | `#/tableau` + `#/reprise` | 🟡 — seuil de 7 jours appliqué, mais sur horodatage simulé |
| M11 | Classements | `#/classements` | ✅ — les 3 du cadrage, dont « académique (meilleur projet par catégorie) » qui compare des projets, jamais des personnes |
| M12 | Badges **et points SOA** | `#/profil` onglet Reconnaissance | ✅ — journal de points (4 gestes du cadrage), pas un compteur nu |
| M16 | Portfolio automatique | `#/portfolio/:id` | ✅ — inclut les projets **arrêtés** et leur raison |
| M17 | Présentation de projet | `#/projets/:id/presentation` | ✅ — éditable, avec vidéo de démo (lien). L'envoi d'images attend le serveur. |
| — | Retour à l'auteur | `#/signal/:id` | ✅ |

**Règle d'implantation tenue :** M11 et M12 ne sont accessibles que depuis
l'onglet Profil. Aucun écran de reprise, aucun projet, aucun tableau de bord ne
les affiche.

### 4.5 Module Entreprise — espace séparé

| # | Module | Route | État |
|---|---|---|---|
| E1 | Profil entreprise | `#/entreprise` | ✅ |
| E2 | Publication d'opportunités | `#/entreprise/opportunites`, `#/opportunites` | ✅ — entreprises **et étudiants** publient (M13) |
| E3 | Recrutement sur preuves | `#/entreprise/talents/:id` | ✅ |
| E4 | Project Reliability Score | bloc sur la fiche talent | ✅ — 5 composantes du cadrage, **jamais affiché sans son détail** |
| E5 | Talent Discovery | `#/entreprise/talents` | ✅ — filtres techno / niveau / projets terminés, correspondance motivée |
| E6 | Entreprise Mentor | `#/entreprise/challenges` | 🟡 — challenges sponsorisés ✅, encadrement par des seniors non modélisé |
| E7 | Challenges sponsorisés | `#/entreprise/challenges` | ✅ |
| E8 | Stage et recrutement direct | fiche talent | ✅ — la proposition d'entretien crée une notification réelle |
| E9 | Validation de compétence | badge sur profil et portfolio | ✅ |
| E10 | Marketplace de prototypes | `#/entreprise/marketplace` | ✅ |
| M13 | Appels à projets (étudiant) | `#/opportunites` | ✅ |

**Garde-fou du cadrage, rendu littéral :** `#/opportunites` affiche un
avertissement explicite tant que l'étudiant n'a aucun projet terminé, et
l'espace entreprise a sa propre navigation — il n'existe aucun bandeau
entreprise dans l'application étudiante.

### 4.6 Universités — la branche du schéma d'architecture

Elle n'apparaît dans **aucun** des 21 modules numérotés, seulement dans le
schéma d'architecture (§3). C'est ce qui explique qu'elle ait été omise du
premier découpage, ici comme dans le brainstorm.

| Usage du schéma | Route | État |
|---|---|---|
| Suivi pédagogique | `#/universite` onglet 1 | ✅ — santé par promotion, et surtout la liste des étudiants sans activité |
| Projets académiques | `#/universite` onglet 2 | ✅ — encadrement, échéances, observation de l'enseignant |
| Classements | `#/universite` onglet 3 | ✅ — par promotion, sur des projets |

**Règle structurante : aucune note n'est saisissable.** Le cadrage parle de
*suivi pédagogique*, pas d'évaluation. Un journal relu comme une copie cesse
d'être honnête, et un journal malhonnête ne sert plus à reprendre un projet —
l'outil perdrait en une semaine ce qui le rend utile. L'enseignant voit qui
décroche et depuis quand ; il n'évalue pas.

### 4.7 Hors périmètre code

| # | Module | Décision |
|---|---|---|
| M21 | Application mobile native | Le web est **mobile d'abord** (barre d'onglets, zones de sécurité, cibles de 44 px). L'app native reste une slide de roadmap. |

### 4.8 Récapitulatif

| | Complets | Partiels | Absents |
|---|---|---|---|
| Modules étudiants (M1–M20) | 17 | 3 | 0 |
| Modules entreprise (E1–E10) | 9 | 1 | 0 |
| Branche Universités (3 usages) | 3 | 0 | 0 |
| **Total (31 modules + 3 usages)** | **29** | **4** | **0** (+ M21 hors périmètre) |

Les 4 partiels restants — M4 (dépôt Git), M5 (résumé), M7 (inactivité), M20
(canaux e-mail et push), E6 (encadrement senior) — le sont tous pour la même
raison, et une seule : **l'absence de backend**. Aucun n'est bloqué par un
problème d'interface.

**Correction d'un point de méthode :** la version précédente de ce tableau
annonçait 20 modules complets. C'était trop généreux — sept points du texte du
cadrage étaient comptés comme faits sans l'être (points SOA, classement
académique, commentaires d'idée, mise en relation de mentorat, publication
étudiante, pourcentage d'état, progression moyenne). Ils le sont désormais.

## 5. Ce qui existe réellement aujourd'hui

Front React/Vite déployé sur https://aura.icpp-conformite.cloud/, **sans backend**.

**37 routes**, toutes atteignables par URL directe (vérifié par un aller-retour
`hrefFor` → `parseRoute` sur chacune). Quatre espaces, chacun avec sa propre
navigation :

| Espace | Navigation | Routes |
|---|---|---|
| Public | En-tête marketing, connexion, inscription | 3 |
| Étudiant | 5 onglets — Tableau · Projets · Mémoire · Communauté · Profil | 27 |
| Entreprise | 5 onglets propres | 6 |
| Université | Espace enseignant, 3 onglets internes | 1 |

### Architecture

```
src/
  domain/soa.ts          le modèle, module par module du cadrage
  data/soa-corpus.ts     corpus de démonstration (8 étudiants, 10 projets,
                         12 entrées de journal, 6 sujets, 3 challenges,
                         3 idées, 3 entreprises, 4 comptes, 17 points,
                         1 enseignant, 2 promotions, 3 encadrements)
  data/corpus.ts         le corpus de fragments de la Mémoire IA
  app/soa-store.tsx      l'état applicatif + les mutations
  app/router.ts          37 routes, aller-retour vérifié
  app/Shell.tsx          quatre chromes ; onglets < 1024px, rail ≥ 1024px
  ui/                    primitives (Button, Surface, Field, data, layout)
  screens/               les écrans, groupés par parcours
```

### Ce qui fonctionne réellement

Les mutations ne sont pas décoratives. Se connecter, s'inscrire, modifier son
profil, créer un projet, écrire au journal, arrêter un projet avec sa raison,
reprendre celui d'un autre, répondre au forum, commenter une idée, demander de
l'aide à un mentor et y répondre, publier un appel, rejoindre un challenge,
cocher une semaine, valider une compétence, proposer un entretien — tout
modifie l'état et se répercute partout (le tableau de bord, le résumé, les
points et l'avancement se recalculent).

### Ce qui n'existe pas

- **Aucun backend.** Pas de PostgreSQL, pas de pgvector, pas d'appel à l'API Claude.
- **Aucune authentification réelle** : aucun mot de passe n'est demandé ni
  vérifié. Les écrans de connexion et d'inscription l'affichent explicitement.
- **Aucune persistance** : un rechargement remet le corpus à son état initial.
- **Aucune intégration GitHub/GitLab réelle** : l'écran de dépôt le dit lui-même.
- Aucun envoi de fichier (captures, vidéos) : seuls des liens sont saisissables.
- Aucun test automatisé, aucune CI.

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
