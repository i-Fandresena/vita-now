# DESIGN.md — Aura++

> Source de vérité **esthétique**. Subordonné à [PRODUCT.md](PRODUCT.md) et [Product_2.0.md](Product_2.0.md) :
> en cas de conflit, le produit gagne sur le style.
> Tout écran, composant ou animation doit passer la checklist §8 avant merge.

---

## 1. Le concept — « La braise »

**Aura++** : la trace que laisse un passage. Ce qui reste quand l'effort est parti.

Le produit ne parle pas de productivité. Il parle de **ce qui n'est pas encore éteint**.
Un mémoire oublié n'est pas mort — c'est une braise. Il suffit qu'on souffle dessus.

Cette métaphore n'est pas décorative : **elle est encodée dans le système de couleur.**

L'interface est monochrome à 99 %. Encre profonde, texte os. Aucune couleur.
Il existe **une seule couleur chaude** dans tout le produit — la braise — et elle
n'apparaît que lorsqu'un effort **reprend vie**. Trois endroits, pas un de plus (§3.3).

> Conséquence directe : le jury ne voit pas « une app avec une couleur d'accent ».
> Il voit une interface éteinte qui **s'allume** au moment exact où le produit tient sa promesse.

**Registre visuel** : archive éditoriale, pas dashboard SaaS.
La référence mentale est une revue scientifique bien composée — marge de citation,
justification stricte, hiérarchie par le rythme plutôt que par la boîte —
exécutée avec la densité et la discipline d'un outil pro (Linear, Raycast).

---

## 2. Anti-références — ce que Aura++ ne doit jamais ressembler

Reprises de [PRODUCT.md §4](PRODUCT.md#L60), non négociables :

| ❌ Interdit | Pourquoi |
|---|---|
| Dégradé violet / glassmorphism | Look IA générique n°0 |
| Fond crème + serif haute-contraste + accent terracotta | Look IA n°1 |
| Fond noir pur (#000) + accent acide | Look IA n°2 |
| Cartes flottantes centrées à ombre douce | Template Bootstrap/ChatGPT |
| Icônes décoratives, emoji-badges | Bruit — [PRODUCT.md:70](PRODUCT.md#L70) |
| Numérotation 01/02/03 non séquentielle | [PRODUCT.md:71](PRODUCT.md#L71) |
| Barres de progression, jauges, scores | Gamification — interdit produit |
| Reveal-au-scroll, parallax, stagger décoratif | Tic de landing page |
| `border-radius` ≥ 16px partout | Signature SaaS générique |
| Blobs, mesh gradients, grain animé | Décoration sans propos |

---

## 3. Tokens

### 3.1 Couleur — encre (surfaces)

Navy désaturé, jamais noir. L'élévation se lit à la **luminance de bordure**, pas à l'ombre (§3.5).

| Token | OKLCH | Usage |
|---|---|---|
| `--ink-canvas` | `oklch(0.165 0.018 258)` | Fond de page, unique |
| `--ink-surface` | `oklch(0.198 0.018 258)` | Panneaux, cartes |
| `--ink-raised` | `oklch(0.232 0.017 258)` | Champs, éléments interactifs |
| `--ink-hover` | `oklch(0.268 0.016 258)` | État survol |
| `--ink-sunken` | `oklch(0.142 0.019 258)` | Zones en creux (code, citation) |

### 3.2 Couleur — os (texte)

Blanc cassé chaud. **Jamais `#fff`** : le blanc pur sur navy vibre et fait « thème sombre par défaut ».

| Token | OKLCH | Usage |
|---|---|---|
| `--bone-primary` | `oklch(0.955 0.006 85)` | Titres, corps principal |
| `--bone-secondary` | `oklch(0.790 0.006 85)` | Corps secondaire |
| `--bone-tertiary` | `oklch(0.615 0.008 258)` | Métadonnées, labels |
| `--bone-quaternary` | `oklch(0.455 0.010 258)` | Texte désactivé, placeholders |

### 3.3 Couleur — braise (l'unique accent)

| Token | OKLCH | Usage |
|---|---|---|
| `--ember` | `oklch(0.765 0.128 62)` | Le signal |
| `--ember-dim` | `oklch(0.620 0.098 62)` | Bordure, soulignement |
| `--ember-wash` | `oklch(0.765 0.128 62 / 0.08)` | Fond de zone signalée |

**Loi de la braise — les 3 seuls emplacements autorisés :**

1. Le **fragment retrouvé** — au moment où il s'ouvre, et uniquement sur le filet qui le borde.
2. Le **retour à l'auteur** — l'écran entier respire cette couleur, une fois, quelques secondes.
3. Le **focus clavier** — parce que l'accessibilité n'est pas décorative.

Toute autre apparition est un bug de design. Ni bouton primaire coloré, ni lien, ni icône.
Le bouton primaire est **os sur encre**, pas braise.

### 3.4 Bordures & filets

Bordures en blanc alpha, jamais en encre solide — elles se composent sur n'importe quelle surface.

```
--line-faint:  oklch(1 0 0 / 0.055)   /* séparateurs, grilles */
--line-soft:   oklch(1 0 0 / 0.095)   /* contour de surface */
--line-strong: oklch(1 0 0 / 0.160)   /* contour interactif, survol */
--line-rule:   oklch(1 0 0 / 0.220)   /* filet éditorial, 1px, horizontal */
```

### 3.5 Élévation

**Sur fond sombre, une ombre portée ne se voit pas — elle salit.** On n'en utilise pas pour élever.

L'élévation se construit par empilement de trois signaux :
1. Surface plus claire (`--ink-surface` → `--ink-raised`)
2. Bordure `--line-soft`
3. **Filet de lumière interne en haut** : `inset 0 1px 0 oklch(1 0 0 / 0.06)`

Les ombres réelles sont réservées aux éléments **flottants** (dialog, popover), et restent
larges, très diffuses, quasi noires — pour l'occlusion, pas pour la profondeur décorative :

```
--shadow-float: 0 24px 60px -12px oklch(0.09 0.02 258 / 0.72);
```

### 3.6 Rayons

Petits et cohérents. Le rayon large est une signature SaaS.

```
--radius-control: 6px    /* boutons, champs, chips */
--radius-surface: 10px   /* cartes, panneaux, dialogs */
--radius-full:    999px  /* uniquement avatar et point d'état */
```

Les filets éditoriaux et séparateurs : **rayon 0**.

### 3.7 Espacement

Base **4px**. Échelle : `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`.
Rien entre — pas de `18px`, pas de `20px`. Une valeur hors échelle est un bug.

**Mesure de lecture** : `68ch` maximum pour tout bloc de prose. Le raisonnement d'un
fragment est du texte long : il se lit, il ne se scanne pas.

**Rail éditorial** : les métadonnées (auteur, année, filière, origine) vivent dans une
colonne gauche étroite, alignées en haut du bloc qu'elles qualifient — comme un appareil
de note en marge. C'est la signature de layout du produit ; ce n'est pas un dashboard à cartes.

---

## 4. Typographie

Trois familles, **auto-hébergées** (`@fontsource-variable/*`) — [Product_2.0.md:70](Product_2.0.md#L70)
interdit toute dépendance Internet critique. Aucun `<link>` vers Google Fonts.

| Rôle | Famille | Pourquoi |
|---|---|---|
| Display | **Newsreader** (serif variable) | Gravité archivistique, opsz réel. Ni Inter partout (SaaS), ni serif haute-contraste (look IA n°1) |
| Interface | **Inter** (variable) | Invisible, correct, natif shadcn |
| Mono | **JetBrains Mono** (variable) | Métadonnées, références, extraits — jamais du code copiable |

### La règle des deux voix

**Le serif est la voix du produit. Le sans est la voix de l'utilisateur.**

Tout ce que Aura++ énonce — la thèse d'accueil, un titre de fragment, la phrase
du retour à l'auteur — est en Newsreader. Tout ce que l'utilisateur produit ou
manipule — le texte qu'il tape, les libellés de champs, les boutons — est en
Inter. C'est ce qui empêche une requête de ressembler à une citation.

### Échelle

| Niveau | Taille / interligne | Famille | Détail |
|---|---|---|---|
| `display-1` | 56 / 1.05 | Newsreader 300 | `-0.022em` — l'accueil, le retour à l'auteur |
| `display-2` | 38 / 1.12 | Newsreader 350 | Titre de fragment |
| `title` | 22 / 1.30 | Inter 500 | Titres de section |
| `body-lg` | 17 / 1.62 | Inter 400 | Le raisonnement d'un fragment |
| `body` | 15 / 1.60 | Inter 400 | Corps par défaut |
| `caption` | 13 / 1.45 | Inter 400 | Métadonnées |
| `micro` | 11 / 1.30 | Inter 500 | `+0.09em`, capitales — le label d'archive |

**Règles :**
- Chiffres tabulaires (`font-variant-numeric: tabular-nums`) partout où un nombre peut changer.
- Une seule graisse serif par écran. Le serif ne descend jamais sous 22px.
- Le `micro` capitales est le **seul** usage de capitales du produit.
- Pas de texte centré au-delà d'une ligne. L'accueil fait exception (§7.1).

---

## 5. Mouvement — système à deux niveaux

Arbitrage validé : [PRODUCT.md:78](PRODUCT.md#L78) plafonne à deux animations narratives ;
tout le reste existe mais doit être **invisible**. Framer Motion partout, spectacle nulle part.

### 5.1 Niveau NARRATIF — 2 moments, budget illimité

| Moment | Durée | Rôle |
|---|---|---|
| **Ouverture du fragment** | ~900 ms | Un dossier scellé qui s'entrouvre. Seule scène R3F du produit. |
| **Retour à l'auteur** | ~1400 ms | Le pic émotionnel. Plein écran. La braise s'allume. |

Ces deux moments seuls ont droit à : orchestration multi-étapes, `AnimatePresence` custom,
easing sur mesure, 3D, variation de couleur.

### 5.2 Niveau FONCTIONNEL — partout ailleurs, invisible

| Geste | Durée | Propriétés | Easing |
|---|---|---|---|
| Entrée | 140 ms | `opacity`, `translateY(4px)` | `--ease-out-expo` |
| Sortie | 100 ms | `opacity` seul | `linear` |
| Survol | 90 ms | `background`, `border-color` | `ease-out` |
| Layout | 180 ms | `layout` Framer | spring `{ stiffness: 380, damping: 34 }` |
| Focus | 0 ms | instantané — jamais animé | — |

**Interdits absolus au niveau fonctionnel :** reveal-au-scroll, stagger décoratif, parallax,
rebond, rotation, `scale` > 1.02, durée > 200 ms.

### 5.3 Easings

```
--ease-out-expo:  cubic-bezier(0.16, 1, 0.30, 1)     /* défaut sortant */
--ease-in-out:    cubic-bezier(0.65, 0, 0.35, 1)     /* transitions symétriques */
--ease-narrative: cubic-bezier(0.22, 0.61, 0.20, 1)  /* niveau 1 uniquement */
```

### 5.4 Contraintes dures

- **`transform` et `opacity` uniquement.** Toute animation de `width`, `height`, `top`, `left`,
  `box-shadow` ou `filter` en boucle est refusée. `layout` Framer est autorisé (FLIP).
- `prefers-reduced-motion: reduce` → niveau 2 réduit à 0 ms ; niveau 1 dégradé en fondu 200 ms.
  Le récit reste lisible sans mouvement.
- Aucune animation en boucle infinie hors indicateur de chargement.
- Le budget d'animation d'un écran est **0** par défaut. Chaque geste doit être justifié à l'audit.

---

## 6. 3D — périmètre verrouillé

[PRODUCT.md §5](PRODUCT.md#L82) : **une scène, un écran, jamais en fond.**

- Emplacement unique : l'ouverture du fragment retrouvé.
- React Three Fiber. Géométrie primitive, zéro texture, zéro post-processing.
- Cible 60 FPS. `dpr={[1, 1.75]}`, `frameloop="demand"` — la scène ne tourne pas en continu.
- **Fallback SVG obligatoire**, déclenché automatiquement si : WebGL absent,
  `prefers-reduced-motion`, ou budget de stabilisation dépassé.
- La 3D est un bonus. Aucun chemin de démo ne doit en dépendre.

---

## 7. Écrans — intention

### 7.1 Recherche
Vide intentionnel ([PRODUCT.md:74](PRODUCT.md#L74)). Une barre, une phrase, rien.
Pas de suggestions en grille, pas de « récents », pas de statistiques.
Le vide est la promesse : ici on ne gère pas, on demande.

### 7.2 Fragment retrouvé
Rail éditorial à gauche (origine, auteur, année), raisonnement à droite sur 68ch.
Le raisonnement, les choix, les impasses. **Jamais le code brut en avant**
([PRODUCT.md:25](PRODUCT.md#L25)) — un extrait mono est possible, cité, secondaire, non copiable d'un clic.

### 7.3 Capsule de reprise
Trois blocs factuels : où j'en étais / ce qui bloque / le micro-pas.
Ton neutre. Aucune formule d'encouragement, aucune mention de durée d'absence culpabilisante.

### 7.4 Dépôt
Boucle le cycle. Formulaire dense, sans illustration, sans étapes numérotées décoratives.

### 7.5 Retour à l'auteur
Le pic. Plein écran, pas un toast. Une phrase factuelle. La braise. Puis le silence revient.
80 % du budget de finition du produit vit ici.

---

## 7bis. Dérogations décidées en production

Toute décision qui s'écarte de ce document doit être écrite ici avant d'être codée.

| # | Décision | Justification |
|---|---|---|
| D1 | §7.5 disait « l'écran entier respire cette couleur ». Retenu à la place : **un seul filet de braise à pleine largeur**, aucun lavis de fond. | Un lavis radial, même à 5 % d'opacité, reste un dégradé — donc une anti-référence du §2. Le filet seul est plus tenu et plus sûr. |
| D2 | La braise sert aussi de **soulignement du champ de recherche actif**. | C'est le cas 3 de §3.3 (focus clavier), pas un quatrième emplacement. Le champ est le seul élément focalisable de l'accueil. |
| D3 | Les **erreurs ne sont jamais en braise** : contraste maximal du texte + filet vertical `--line-rule`. | Colorer une erreur dépenserait le signal réservé au moment narratif. Un rouge d'alerte serait une seconde couleur, donc une seconde identité. |
| D4 | `--color-bone-4` remonté de `0.455` à `0.52`. | En dessous, les textes de substitution tombaient sous 4.5:1 (checklist §8.11). |
| D5 | Les boutons `ghost` alignés sur une colonne de texte portent `-ml-4`. | Leur rembourrage horizontal décalait le libellé de 16px par rapport à la prose au-dessus. |
| D6 | `text-balance` sur tous les titres display. | Sans lui, la thèse d'accueil se brisait sur un « là. » orphelin. À 56px en serif, une veuve est une faute de composition. |

---

## 8. Checklist anti-slop — avant chaque merge

Un écran ne passe que si **les 12 réponses sont oui**.

**Produit**
1. Zéro score, badge, streak, classement, barre de progression, message d'encouragement.
2. L'écran aide à *reprendre ou transmettre*, pas à *organiser*.
3. Aucun élément assimilable à GitHub / Notion / Trello.

**Identité**
4. Aucune anti-référence du §2 présente.
5. La braise apparaît 0 ou 1 fois, et uniquement dans un des 3 cas de §3.3.
6. Toutes les valeurs d'espacement sont sur l'échelle de 4. Tous les rayons sont dans §3.6.

**Typographie**
7. Hiérarchie lisible sans couleur : un écran en niveaux de gris reste compréhensible.
8. Aucun bloc de prose ne dépasse 68ch. Aucune capitale hors `micro`.

**Mouvement**
9. Chaque animation est justifiable en une phrase. Sinon elle est supprimée.
10. Aucune animation hors `transform`/`opacity`/`layout`. Aucune durée > 200 ms au niveau 2.

**Fondations**
11. Navigation clavier complète, focus visible, cible tactile ≥ 44px, contraste ≥ 4.5:1.
12. L'écran tient à 375px de large sans casse ni scroll horizontal.

---

*Document vivant. Toute dérogation doit être écrite ici avant d'être codée.*
