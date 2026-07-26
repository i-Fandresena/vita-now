# HANDOFF.md — VITA'NOW

> Document de passation. Destiné à qui reprend le projet sans avoir assisté à ce
> qui précède. **Dernière mise à jour : 26 juillet 2026.**

---

## 0. À lire avant de toucher au code

| Fichier | Autorité | Ce qu'il fixe |
|---|---|---|
| [AURA_cadrage.md](AURA_cadrage.md) | **Souverain** | Le besoin de l'équipe : 21 modules étudiants + 10 modules entreprise |
| [SPEC.md](SPEC.md) | **Opérationnel** | Traduction du cadrage en écrans, modèle de données, états |
| [BACKLOG.md](BACKLOG.md) | **Exécution** | Ce qui reste à faire, par priorité |
| [DESIGN.md](DESIGN.md) | **Esthétique** | Tokens, typographie, structure de la landing |
| [docs/archive/](docs/archive/) | **Périmé** | Ancien périmètre restreint — historique uniquement |

En cas de conflit : `AURA_cadrage.md` > `SPEC.md` > confort d'implémentation.

**Avertissement pour qui reprend :** `PRODUCT.md` et `Product_2.0.md` ont été
**archivés le 26 juillet 2026** dans [`docs/archive/`](docs/archive/). Ils
décrivaient un périmètre réduit à 3 mécaniques et interdisaient explicitement une
grande partie des modules du cadrage. Ils ne font plus autorité.

`DESIGN.md` **à la racine fait autorité** sur l'esthétique : c'est la reprise du
template Lovable de l'équipe. Le fichier de même nom dans `docs/archive/` est
l'ancienne direction (palette encre/os/braise) — il ne vaut plus que comme
description de ce qui tourne encore en ligne.

---

## 1. Où en est le projet

### Fait et vérifié

- Front React/Vite : **37 routes**, 13 fichiers d'écrans, ~15 200 lignes.
  Les 31 modules du cadrage et la branche Universités ont tous un écran —
  29 complets, 4 partiels, 0 absent. Détail dans [SPEC.md §4](SPEC.md).
- Landing publique VITA'NOW + trois espaces séparés (étudiant, entreprise,
  université), chacun avec sa propre navigation.
- Design system : tokens, primitives, états (vide / chargement / erreur / squelette)
- Navigation **mobile d'abord** : onglets bas < 1024px, rail latéral au-delà,
  zones de sécurité, cibles ≥ 44px
- Scène 3D + repli SVG automatique sur 4 chemins de défaillance
- **Persistance locale** : l'état survit au rechargement
  ([`lib/persistence.ts`](web/src/lib/persistence.ts)), et le profil offre une
  sortie « Repartir de zéro » pour revenir au corpus livré.
- Build de production vert, `tsc` strict (`noUncheckedIndexedAccess`),
  three.js isolé en chunk paresseux
- **Déployé et servi en HTTPS** : https://aura.icpp-conformite.cloud/

### Pas fait

- **Aucun backend.** Pas d'Express/Fastify, pas de PostgreSQL, pas de pgvector,
  pas d'appel à l'API Claude. Tout vit dans le navigateur.
- **Aucune authentification réelle** : aucun mot de passe n'est demandé ni
  vérifié, et les écrans de connexion et d'inscription le disent.
- **La persistance est locale, pas partagée.** `localStorage` est propre à un
  navigateur : « l'auteur » et « le chercheur » ne peuvent pas être deux
  personnes distinctes tant que le serveur n'existe pas. C'est la limite qu'il
  faut annoncer plutôt que subir.
- Aucune intégration GitHub/GitLab réelle (M4) — l'écran de dépôt le dit.
- Aucun envoi de fichier : seuls des liens sont saisissables.
- Aucun test automatisé, aucune CI/CD.

### Écart d'architecture à connaître

Le front a été construit **avant** le backend. Le risque technique du matching
sémantique reste **entier et non validé**.

⚠️ **Correction au plan initial :** le backlog prévoyait « pgvector + embeddings
+ API Claude ». **L'API Claude n'expose pas d'endpoint d'embeddings** — il
faudrait un fournisseur tiers. Et pour un corpus de quelques dizaines de
documents, la recherche plein texte française de PostgreSQL (`tsvector`,
`unaccent`, dictionnaire `french`) donne un résultat comparable sans dépendance
externe, sans coût par requête et sans risque de panne le jour d'une
démonstration. C'est le chemin recommandé ; les embeddings restent une option.

---

## 2. Stack

| Élément | Version | Note |
|---|---|---|
| Node | 22.21 | |
| React | 19.2 | |
| Vite | 8.1 | moteur Rolldown — `manualChunks` objet n'existe plus |
| TypeScript | 6.0 | `baseUrl` est déprécié, ne pas le réintroduire |
| Tailwind | 4.3 | configuration en CSS (`@theme`), pas de `tailwind.config.js` |
| Framer Motion | 12.42 | |
| three / R3F | 0.185 / 9.6 | |
| Radix Dialog | dernière | seule dépendance Radix |

---

## 3. Arborescence

```
AuraPlusPlus/
├── AURA_cadrage.md        source de vérité produit
├── SPEC.md                traduction opérationnelle
├── BACKLOG.md             travaux restants
├── DESIGN.md              direction esthétique (fait autorité)
├── HANDOFF.md             ce fichier
├── docs/archive/          PRODUCT.md, Product_2.0.md, DESIGN.md (périmés)
└── web/
    ├── README.md          scénario de démo + URLs directes
    └── src/
        ├── domain/        le modèle — ne connaît ni React ni HTTP
        ├── data/          corpus de démo + implémentations en mémoire
        ├── app/           providers, routeur, chrome, état applicatif
        ├── ui/            primitives du design system
        ├── features/      composants liés à un usage
        ├── screens/       13 fichiers, 37 routes
        ├── lib/           cn, motion, persistance
        └── styles/        theme.css (tokens) + base.css (socle)
```

**Règle d'architecture :** aucun écran n'importe le corpus directement. Ils
passent par `useSoa()` ou `useRepository()`. C'est cette règle qui rend le §4
possible — mais lire le §4 avant de s'y fier.

---

## 4. Brancher le vrai backend — la carte exacte

> ⚠️ **Une version antérieure de ce document affirmait qu'il suffisait
> d'implémenter les 6 méthodes de `FragmentRepository` et qu'« aucun composant ne
> change ». C'est faux, et l'écart est d'un facteur cinq.** Ce qui suit décrit le
> code réel.

L'accès aux données passe par **deux chemins indépendants**, hérités de deux
périmètres successifs. Les confondre est l'erreur qui coûte le plus cher ici.

| Chemin | Sert | Abstraction | Où |
|---|---|---|---|
| `FragmentRepository` | **3 écrans** — Fiche, Signal, Dépôt | port propre, 6 méthodes | [`domain/repository.ts`](web/src/domain/repository.ts) |
| `useSoa()` | **9 écrans** — tout le reste | **aucune** : ~25 mutations dans un `useState` | [`app/soa-store.tsx`](web/src/app/soa-store.tsx) |

### Chemin 1 — le port (facile)

Implémenter `FragmentRepository` contre l'API, puis :

```tsx
<RepositoryProvider repository={new HttpFragmentRepository(baseUrl)}>
```

Aucun des 3 écrans concernés ne change. C'est ce que promettait l'ancien §4, et
c'est vrai — pour un quart de l'application.

### Chemin 2 — le store (le vrai travail)

`soa-store.tsx` fait 886 lignes et n'a **pas de port**. Les écrans appellent
directement `createProject`, `addJournalEntry`, `replyToThread`… Il faut donc :

1. **Extraire un port** `SoaRepository` depuis la surface actuelle de `SoaApi` —
   les lectures dérivées (`analytics`, `capsule`, `summaryFor`) restent calculées
   côté client tant que le serveur ne les produit pas.
2. Rendre les mutations **asynchrones**. C'est le point de bascule : aujourd'hui
   elles renvoient une valeur immédiatement (`createProject` renvoie un `Project`),
   et plusieurs écrans en dépendent pour naviguer juste après. Chacun de ces
   appels devient un `await`, avec un état d'attente et un chemin d'échec.
3. Seulement ensuite, écrire `HttpSoaRepository`.

**Les deux corpus sont disjoints.** [`data/corpus.ts`](web/src/data/corpus.ts)
(les fiches) et [`data/soa-corpus.ts`](web/src/data/soa-corpus.ts) (projets,
étudiants, forum…) ne partagent aucune clé : une fiche de la recherche et un
projet de l'espace étudiant sont deux univers sans lien. **Le schéma SQL doit
trancher cette fusion** — c'est la vraie décision de conception qui reste, et
elle précède tout code serveur.

### Contraintes côté serveur

- Temps de réponse **< 2 s**.
- `search` doit honorer l'`AbortSignal` — le front annule les requêtes obsolètes.
- `latestSignal` doit rester résolvable sans déclaration préalable : un rechargement
  en pleine soutenance ne doit pas vider l'écran le plus important.
- `search` renvoie un `why` par résultat (pourquoi *ce* résultat répond à *cette*
  question). Sans cette phrase, le résultat demande un acte de foi.

---

## 5. Déploiement — état réel

Le front est une **SPA statique**. Le routage est en `#hash`.

| | |
|---|---|
| URL | https://aura.icpp-conformite.cloud/ |
| Serveur | nginx 1.24 (Ubuntu) |
| Racine | `/var/www/aura-plus-plus` |
| Vhost | `/etc/nginx/sites-enabled/aura.icpp-conformite.cloud` |
| TLS | Let's Encrypt / Certbot, redirection 80 → 443 active |
| Cache | `/assets/` immuable 1 an, `index.html` en `no-cache` |

### Build et mise en ligne

```bash
cd /opt/Aura++/web
npm ci
npm run build                                   # produit web/dist/
sudo rsync -a --delete dist/ /var/www/aura-plus-plus/
sudo nginx -t && sudo systemctl reload nginx
```

### Vérification post-déploiement

```bash
curl -sI https://aura.icpp-conformite.cloud/ | head -1     # 200
curl -s  https://aura.icpp-conformite.cloud/ | grep -o '<title>.*</title>'
```

Puis, dans un navigateur, dérouler le scénario du [README](web/README.md).

### Quand le backend existera

Ajouter un `location /api/ { proxy_pass ... }` dans le vhost, et injecter l'URL via
`VITE_API_URL` **au moment du build** (Vite inline les variables ; les changer après
le build n'a aucun effet).

---

## 6. Ce qui reste à faire

Voir [BACKLOG.md](BACKLOG.md) — priorisé, chiffré, avec les dépendances.

---

## 7. Pièges connus

- **`tailwind-merge` doit connaître les tokens.** `text-body` (taille) et
  `text-canvas` (couleur) partagent le préfixe `text-`. Sans déclaration dans
  [`cn.ts`](web/src/lib/cn.ts), la fusion en supprime un — le bouton primaire
  devenait un rectangle blanc sans libellé, invisible au type-check.
  **Toute nouvelle valeur ajoutée à `theme.css` doit y être déclarée aussi.**
- Vite 8 utilise Rolldown : `build.rollupOptions.output.manualChunks` en objet
  n'existe plus. Le découpage passe par `React.lazy`.
- Newsreader est distribué par axe (`opsz.css`), pas par sous-ensemble — il n'y
  a pas de `latin.css` pour cette famille.
- Le vocabulaire du **code** (« fragment », « sceau », « braise ») vient de
  l'ancien périmètre et n'apparaît nulle part dans `AURA_cadrage.md`. Il a été
  retiré des **textes visibles** le 26 juillet 2026 — à l'écran on dit « fiche »,
  « chercher », « les fiches ». Les identifiants internes ont été laissés tels
  quels volontairement (renommer = du bruit dans l'historique sans gain
  utilisateur). **Ne pas réintroduire ce vocabulaire dans un texte affiché.**
- **La persistance est locale.** Un navigateur qui a déjà servi garde son état :
  une correction du corpus dans le code n'apparaît pas sur un poste déjà utilisé.
  La sortie est le bouton « Repartir de zéro » en bas du profil.

---

## 8. Checklist de reprise

- [ ] Lire `AURA_cadrage.md`, puis `SPEC.md`, puis `BACKLOG.md`
- [ ] `cd web && npm ci && npm run dev` — l'app démarre
- [ ] Dérouler le scénario de démo du README de bout en bout
- [ ] `npm run build` — build vert
- [ ] **Avant de toucher au backend, lire le §4 en entier** — deux chemins de
      données coexistent, et le plus gros n'a pas de port
