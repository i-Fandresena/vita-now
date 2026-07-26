# DESIGN.md — VITA'NOW

> Source de vérité **esthétique**. Subordonné à [`AURA_cadrage.md`](AURA_cadrage.md)
> et [`SPEC.md`](SPEC.md) : en cas de conflit, le produit gagne sur le style.
>
> **Modèle de référence : le template Lovable de l'équipe**, publié sur
> https://soa-project-spark.lovable.app/ — tokens, typographie et structure
> ci-dessous en sont extraits, pas réinventés.
>
> L'ancien `DESIGN.md` (direction sombre « archive éditoriale », palette
> encre/os/braise) est archivé dans [`docs/archive/DESIGN.md`](docs/archive/DESIGN.md)
> et **ne fait plus autorité**.

---

## 1. Le registre — « atelier étudiant »

Le template pose une direction claire, et elle est l'inverse exact de l'ancienne :

| | Ancien (archivé) | Nouveau (template) |
|---|---|---|
| Fond | Navy profond | **Blanc** |
| Ton | Feutré, grave, silencieux | **Direct, énergique, encourageant** |
| Display | Serif à empattements fins | **Sans condensé très gras** (Anton) |
| Accent | Une seule braise, 3 emplacements | **Indigo + jaune**, largement employés |
| Rayons | 6 / 10 px | **20 px** (`1.25rem`) |
| Signal de progression | Factuel, jamais quantifié | **Séries, pourcentages, badges assumés** |

Le produit s'adresse à des étudiants qui abandonnent leurs projets. Le template
répond par l'élan, pas par la gravité : gros titres qui affirment, chiffres visibles,
tutoiement, cartes rondes et claires. **C'est cette direction qui fait foi.**

Voix du produit : **tutoiement**, phrases courtes, verbes à l'impératif.
« Termine ce que tu commences. » — pas « Terminez vos projets ».

---

## 2. Tokens — extraits du template

### 2.1 Couleur

Toutes les valeurs sont en OKLCH, copiées du template.

| Token | OKLCH | Usage |
|---|---|---|
| `--color-background` | `oklch(100% 0 0)` | Fond de page |
| `--color-surface` | `oklch(98% 0.005 240)` | Sections alternées, champs |
| `--color-card` | `oklch(100% 0 0)` | Cartes |
| `--color-ink` | `oklch(19% 0.04 260)` | Texte principal, navy très sombre |
| `--color-muted-foreground` | `oklch(55% 0.03 250)` | Texte secondaire |
| `--color-primary` | `oklch(55% 0.22 262)` | Indigo — actions, liens, focus |
| `--color-primary-soft` | `oklch(75% 0.15 258)` | Indigo clair — fonds, illustrations |
| `--color-accent` | `oklch(87% 0.17 95)` | Jaune — surlignage, moments de réussite |
| `--color-accent-soft` | `oklch(94% 0.09 96)` | Jaune pâle — fonds de zone |
| `--color-success` | `oklch(72% 0.18 145)` | Vert — état terminé |
| `--color-destructive` | `oklch(63% 0.24 27)` | Rouge — erreurs, abandon |
| `--color-border` | `oklch(92% 0.01 250)` | Bordures, séparateurs |

**Thème sombre** (le template le prévoit, 6 surcharges) :
`background` et `card` passent à `oklch(19% 0.04 260)` / `oklch(23% 0.04 260)`,
`foreground` à `oklch(98% 0.003 250)`, `border` à `oklch(100% 0 0 / 0.1)`.
Les accents ne changent pas.

**Règle d'emploi :** l'indigo porte l'action, le jaune porte la **réussite**. Un
bouton est indigo ; une célébration, un badge, un projet livré sont jaunes. Ne pas
inverser — c'est ce qui rend l'écran lisible sans lire.

### 2.2 Typographie

Quatre familles, **auto-hébergées** via `@fontsource` : la démo ne doit dépendre
d'aucune requête réseau (le template, lui, charge Google Fonts — on ne reprend pas
cette dépendance).

| Rôle | Famille | Emploi |
|---|---|---|
| Display | **Anton** | Les grandes affirmations. `letter-spacing: -0.02em`. Une seule par écran. |
| Heading | **Bebas Neue** | Titres de section, étiquettes hautes. `letter-spacing: 0.005em`. |
| Corps | **DM Sans** | Tout le reste : interface, prose, boutons, champs. |
| Main | **Caveat** | Annotation manuscrite. Rare — une par écran au maximum. |

Anton et Bebas Neue sont des condensées en capitales optiques : elles ne descendent
jamais sous 24 px et ne servent jamais à un paragraphe.

**Caveat est la signature du produit.** Elle apparaît là où le produit s'adresse à
l'étudiant comme un pair — une note en marge, pas une voix institutionnelle. Une
occurrence par écran, jamais deux.

### 2.3 Formes et élévation

```
--radius-card: 1.25rem   /* 20px — cartes, panneaux, champs        → rounded-card */
--radius-sm:   0.75rem   /* 12px — chips, petits contrôles         → rounded-sm   */
--radius-full: 999px     /* pastilles, avatars, boutons            → rounded-full */
```

Le template déclare ce token `--radius` ; il est renommé `--radius-card` ici
parce qu'un `--radius` nu n'entre pas dans l'espace de noms Tailwind v4 et ne
génère aucune classe `rounded-…`. La valeur est identique.

Fond clair : **l'ombre portée fonctionne** (contrairement à l'ancienne direction
sombre). Élévation par ombre douce + bordure `--color-border`.

### 2.4 Mouvement

Le template définit 9 keyframes ; quatre sont porteuses de sens :

| Nom | Rôle |
|---|---|
| `floaty` | Flottement lent des cartes de démonstration du héros |
| `marquee` | Défilement continu du bandeau d'écoles |
| `wiggle` | Micro-réaction ponctuelle (badge débloqué, réussite) |
| `pulse` | Indicateur « Live IA » |

`accordion-up/down`, `enter`, `exit`, `caret-blink` sont les primitives shadcn.

**Contraintes conservées de l'ancienne direction** (elles restent justes) :
`transform` et `opacity` uniquement ; `prefers-reduced-motion: reduce` neutralise
tout ; aucune animation en boucle infinie hors `marquee`, `pulse` et `floaty`, qui
sont ambiants et doivent s'arrêter en mouvement réduit.

---

## 3. Structure de la landing — relevé du template

Onze sections, dans cet ordre. C'est le plan à reproduire.

| # | Section | Contenu |
|---|---|---|
| 1 | En-tête | Logo SOA · Fonctionnalités · Comment ça marche · Communauté · FAQ · Se connecter · **Commencer** |
| 2 | Héros | Étiquette « Ton copilote de projets étudiants » → titre **« Termine ce que tu commences. »** → sous-titre → 2 actions → 3 chiffres → carte de démonstration IA flottante |
| 3 | Bandeau écoles | Marquee de logos d'établissements |
| 4 | Pourquoi SOA | 3 cartes : Mémoire de projet · Momentum quotidien · Communauté vivante |
| 5 | Comment ça marche | 3 étapes numérotées **01 / 02 / 03** — ici la numérotation est légitime, c'est une vraie séquence |
| 6 | Trois piliers | Assistant IA (24/7) · Suivi & Timeline (AUTO) · Communauté (+12K) |
| 7 | Témoignage | Citation en display + auteur + école |
| 8 | Dashboard | Maquette du produit : recherche ⌘K, navigation, résumé du jour, progression, kanban, notifications |
| 9 | Chiffres | 3× · 18 min · 92 % · 150+ |
| 10 | FAQ | 4 questions en accordéon |
| 11 | Appel final + pied de page | « Ce projet que tu repousses ? Finis-le. Cette semaine. » |

### Adaptation obligatoire au cadrage

Le template est une maquette marketing générique. Trois points doivent changer pour
correspondre à `AURA_cadrage.md` :

1. **Le contexte est l'ENI Fianarantsoa**, pas EPITECH / 42 / HEC / Sciences Po.
   Le bandeau d'écoles doit refléter le vrai périmètre, ou disparaître.
2. **Les chiffres du template sont inventés** (12k+ étudiants, 38k projets finis,
   4,9/5, 150+ écoles, témoignage « Léa Moreau »). Publier des statistiques et un
   avis client fabriqués sur un site en ligne les présente comme réels. Deux options
   honnêtes : les remplacer par la promesse produit (« ta première reprise en
   3 secondes ») ou les afficher explicitement comme une projection. **À trancher
   par l'équipe** — voir [`BACKLOG.md`](BACKLOG.md) P1.1.
3. **Les intégrations annoncées** (GitHub, Notion, Drive, Figma, Slack) n'existent
   pas. Le cadrage ne prévoit que GitHub/GitLab (M4), et en mock.

---

## 4. Checklist avant merge

**Produit**
1. L'écran correspond à un module numéroté de [`SPEC.md §4`](SPEC.md).
2. L'écran aide à *reprendre* ou *transmettre*, pas seulement à *organiser*.
3. Aucune mécanique de score dans un chemin de reprise ([`SPEC.md §2bis`](SPEC.md)).

**Identité**
4. Anton n'apparaît qu'une fois par écran, jamais sous 24 px.
5. Caveat apparaît 0 ou 1 fois.
6. L'indigo porte l'action, le jaune porte la réussite — jamais l'inverse.
7. Tous les rayons sont `--radius`, `--radius-sm` ou `--radius-full`.

**Fondations**
8. Navigation clavier complète, focus visible, cible tactile ≥ 44 px, contraste ≥ 4,5:1.
9. L'écran tient à 375 px sans défilement horizontal.
10. `prefers-reduced-motion` neutralise `floaty`, `marquee` et `pulse`.
11. Aucune police chargée depuis un CDN externe.
12. Aucune statistique ni témoignage inventé présenté comme réel.

---

*Document vivant, dérivé du template Lovable. Toute dérogation s'écrit ici avant d'être codée.*
