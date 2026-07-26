# VITA'NOW — application web

Interface du produit décrit par [AURA_cadrage.md](../AURA_cadrage.md), traduit en
écrans par [SPEC.md](../SPEC.md).

> **⚠️ Périmètre.** Ces 5 écrans ont été construits contre un cadrage antérieur
> (archivé dans [docs/archive/](../docs/archive/)) et ne couvrent que 5 des 31
> modules du cadrage — dont 3 partiellement. Voir [SPEC.md §4](../SPEC.md) pour la
> couverture réelle et [BACKLOG.md](../BACKLOG.md) pour la suite.
>
> Les décisions visuelles actuelles sont documentées dans
> [docs/archive/DESIGN.md](../docs/archive/DESIGN.md) : ce document ne fait plus
> autorité, mais il reste la seule description exacte de ce qui tourne en ligne.
> Les mêmes références apparaissent encore dans les commentaires des composants ;
> elles seront réécrites lors de la refonte visuelle.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc + vite build
```

## Le chemin de démonstration

Cinq écrans, dans cet ordre. Chacun est atteignable directement par son URL —
utile si quelque chose part de travers pendant une soutenance.

| # | Écran | URL |
|---|---|---|
| 1 | Recherche | `#/` |
| 2 | Fragment retrouvé | `#/fragment/f-sync-conflits` |
| 3 | Capsule de reprise | `#/reprise` |
| 4 | Dépôt | `#/deposer` |
| 5 | Retour à l'auteur | `#/signal/f-sync-conflits` |

**Le scénario qui se tient debout** — c'est celui à répéter :

1. `#/reprise` — un projet est en sommeil depuis quatre jours. Ce qui bloque :
   deux terminaux modifient la même parcelle, la règle d'arbitrage n'est pas
   écrite.
2. « Chercher ce blocage dans le corpus » — la requête part telle quelle.
3. Le premier résultat est un mémoire de 2022 qui a résolu **exactement** ce
   problème. C'est le propos du produit, pas une coïncidence de démonstration :
   le corpus est écrit pour que ce soit vrai.
4. Ouvrir le fragment — le sceau s'entrouvre, le raisonnement se lit, les
   impasses évitent trois semaines.
5. « Ce fragment m'a débloqué » → l'écran bascule du côté de l'auteur.

## Architecture

```
src/
  domain/      types + port FragmentRepository — ne connaît ni React ni HTTP
  data/        corpus de démo + implémentation en mémoire du port
  app/         providers, routeur, chrome
  ui/          primitives du design system
  features/    composants liés à un usage (recherche, fragment)
  screens/     les cinq écrans
  styles/      tokens (theme.css) et socle (base.css)
```

Aucun écran n'importe le corpus : ils demandent `useRepository()`. Brancher
PostgreSQL + pgvector et l'API Claude revient à fournir une autre
implémentation de `FragmentRepository` à `<RepositoryProvider>` — sans toucher
une ligne de composant.

## Mode démonstration

- Corpus préchargé, classement déterministe : la même question donne toujours
  le même résultat.
- Aucune dépendance réseau — polices auto-hébergées incluses.
- `#/signal/:id` reste affichable même sans déclaration préalable : un
  rechargement de page ne vide pas l'écran le plus important.

## La 3D

Une seule scène, sur le seul écran « fragment retrouvé »
([docs/archive/PRODUCT.md §5](../docs/archive/PRODUCT.md)). Chargée en
`React.lazy`, préchargée dès qu'un
résultat existe, et arrêtée (`frameloop="demand"`) sitôt le geste terminé.

Repli SVG automatique dans quatre cas : WebGL absent,
`prefers-reduced-motion`, échec de chargement du module, erreur d'exécution.
Le repli raconte la même chose, à la même durée, avec la même courbe.
