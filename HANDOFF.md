# HANDOFF.md — VITA'NOW

> Document de passation. Destiné à qui reprend le projet sans avoir assisté à ce
> qui précède. **Dernière mise à jour : 26 juillet 2026 (session icônes Lottie +
> checklist projet + résumé Gemini — voir §11, c'est la lecture prioritaire si
> vous reprenez juste après cette session).**

**Le plus important avant tout le reste : ce dépôt fonctionne actuellement en
mode « pas de commit ».** Depuis plusieurs sessions, toutes les modifications
sont écrites directement dans `/opt/Aura++` (qui **est** la prod — voir §11.2),
puis buildées et déployées sans `git commit` ni `git push`. `git status`
montrera donc un nombre important de fichiers modifiés/non trackés qui ne sont
**pas** un accident : c'est le mode de travail courant. Si vous reprenez avec
un accès normal (commits attendus), **demandez confirmation à l'utilisateur**
avant de committer quoi que ce soit — l'historique local ne reflète plus l'état
réel du code en prod depuis un moment, et un commit massif sans revue serait
risqué. Voir §11.1 pour le détail.

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

- **Backend Fastify + PostgreSQL 16**, dans [`server/`](server/) : schéma
  vérifié à l'exécution, recherche plein texte française (`unaccent`),
  authentification argon2id, session en cookie signé, résumé de projet (M5)
  avec repli par règles quand l'API Claude n'est pas configurée.
- **Bascule du front** décidée au build (`VITE_MODE_API=1`) : sans elle, le
  produit reste en mode démonstration et fonctionne serveur éteint.
- **CI GitHub Actions** : typecheck, build, et le schéma joué pour de vrai sur
  PostgreSQL 16.
- **Artefacts de déploiement** dans [`deploy/`](deploy/) — systemd, nginx,
  script idempotent, procédure de première installation. ⚠️ Ces fichiers sont
  **désynchronisés de la prod réelle** sur au moins un point — voir §11.2
  avant de vous y fier pour un chemin de fichier.
- **Icônes animées (Lottie)** : les icônes en forme d'étoile/logo IA et les
  emoji ont été retirées de l'interface ; la majorité des icônes du produit
  passent par un composant `Icon` (`web/src/ui/Icon.tsx`, `react-useanimations`
  + `lottie-web`, aucun appel réseau). Une quinzaine d'icônes très spécifiques
  sans équivalent Lottie correct restent en `lucide-react` — c'est voulu, pas
  un oubli. Voir §11.3 pour le piège d'interop rencontré et corrigé.
- **Checklist de projet ("post-it") + résumé IA** : à la création d'un projet,
  l'étudiant peut définir des étapes prévues, affichées et cochables dans
  l'espace projet (`checklist_items`, jamais couplée à `avancement()` — voir
  §11.4 et la règle M15 déjà citée en §7). Le résumé IA (M5) est désormais
  **réellement appelé par le front** (il ne l'était pas jusqu'ici), avec
  Gemini en premier, repli sur Claude puis sur les règles. Voir §11.4.

### Pas fait

- **Aucune intégration GitHub/GitLab réelle** (M4) — l'écran de dépôt le dit.
- **Le dépôt de fiche n'a pas d'endpoint** : la table existe, la route
  d'écriture non. `HttpFragmentRepository.deposit` lève explicitement plutôt
  que d'accepter en silence un texte qui n'irait nulle part.
- **Les écritures sont optimistes** : appliquées localement, poussées derrière.
  Si le réseau tombe, l'écran montre un état que le serveur n'a pas —
  `BandeauSync` le signale, mais rien ne rejoue l'écriture perdue.
- Aucun envoi de fichier : seuls des liens sont saisissables.
- Aucun test unitaire (la CI couvre le typage, le build et le schéma).
- Les espaces Entreprise et Université lisent l'état mais n'écrivent pas
  encore côté serveur (validation de compétence, proposition d'entretien,
  observation d'enseignant restent locales).

### Écart d'architecture — résorbé

Le front avait été construit **avant** le backend. Le risque technique de la
recherche a été levé : la FTS française de PostgreSQL (`unaccent` +
`french_stem`) répond au besoin sans dépendance externe. Vérifié — la requête
« deux appareils modifient la meme donnee », **sans accents**, retrouve la
fiche accentuée.

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
├── deploy/                systemd, nginx, script de déploiement, procédure
├── .github/workflows/     CI — typecheck, build, schéma sur PostgreSQL réel
├── server/                l'API
│   ├── migrations/        001_schema.sql · 002_seed.sql
│   └── src/
│       ├── routes/        auth, etat, fiches, projets, ecriture, collectif
│       ├── db.ts          pool + aide transactionnelle
│       ├── env.ts         configuration validée au démarrage
│       ├── session.ts     cookie signé
│       └── resume.ts      M5 — Claude, avec repli par règles
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

## 4. Comment le front est branché — FAIT

> ✅ **C'est fait** (26 juillet 2026). Ce §4 décrit désormais ce qui existe.
> Une version antérieure affirmait qu'il suffisait d'implémenter les 6 méthodes
> de `FragmentRepository` et qu'« aucun composant ne change » : c'était faux
> d'un facteur cinq, et voici ce qu'il a réellement fallu.

**Le mode est décidé au build.** `VITE_MODE_API=1` branche le front sur l'API ;
sans lui, le produit reste en démonstration (corpus local + `localStorage`) et
fonctionne serveur éteint. Les variables Vite sont **inlinées au moment du
build** — les changer après n'a aucun effet.

**Les mutations sont restées synchrones.** Les passer en `async` aurait imposé
de modifier les neuf écrans appelants. À la place, l'écriture locale est
immédiate et l'appel serveur part derrière ([`app/sync.ts`](web/src/app/sync.ts)).
Les identifiants sont **générés par le client** et transmis au serveur : sans
cela, l'écran navigue vers un identifiant que le serveur n'a jamais vu, et un
rechargement donne un écran vide.

**Le compromis est assumé.** Si le réseau tombe, l'écran montre un état que le
serveur n'a pas. [`BandeauSync`](web/src/features/sync/BandeauSync.tsx) le dit,
et invite à copier son texte avant de recharger. Rien ne rejoue l'écriture
perdue — c'est la limite connue.

<details>
<summary>L'état des lieux d'avant la bascule (conservé pour comprendre le code)</summary>

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

</details>

### Contraintes côté serveur — tenues

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
- **CJS/ESM cassé : `import X from "un-paquet"` peut renvoyer l'objet d'exports
  entier au lieu de `X`.** Rencontré deux fois de suite avec `react-useanimations`
  (le composant par défaut, puis chaque import `react-useanimations/lib/xxx`) —
  le bundler (Vite/esbuild/Rolldown) ne fait pas toujours l'interop par défaut
  attendue sur un module CJS généré par Babel/tsc. Symptôme : React error #130
  (« expected a string or class/function but got: object ») **ou**, pire, un
  échec **silencieux** (le composant se rend en `<div>` vide, sans erreur) si
  seule une valeur de données (pas un composant) est mal déballée. Solution
  appliquée dans `web/src/ui/Icon.tsx` : `const X = (importBrut as any)?.default
  ?? importBrut;` sur **chaque** import du paquet concerné, pas seulement celui
  qui plante visiblement. Si un autre paquet tiers se comporte bizarrement après
  un `npm install` (page blanche, ou composant présent mais vide), soupçonner ce
  pattern en premier — diagnostic rapide : `tail -5
  node_modules/.vite/deps/<paquet>.js`, si la dernière ligne est `export default
  require_xxx();`, c'est ce bug.
- **Pour diagnostiquer une page blanche en prod, ne devinez pas — ouvrez un
  vrai navigateur headless.** `curl` ne montre jamais une erreur JS runtime. La
  méthode qui a fonctionné dans cette session : installer Puppeteer dans le
  scratchpad (`npm install puppeteer`, puis `apt-get install -y libatk1.0-0
  libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1
  libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libnss3` si le
  lancement échoue avec des `.so` manquants), puis un script qui écoute
  `page.on("pageerror", ...)` et `page.on("console", ...)` en visitant l'URL —
  React affiche en clair le composant fautif en mode dev (`vite` non buildé),
  contrairement au message minifié qu'on obtient en pointant directement sur la
  prod. Un `vite build --minify false` local + `vite preview` donne un entre-deux
  utile quand on ne peut/veut pas relancer un serveur `vite` dev complet.

---

## 8. Checklist de reprise

- [ ] Lire `AURA_cadrage.md`, puis `SPEC.md`, puis `BACKLOG.md`
- [ ] `cd web && npm ci && npm run dev` — l'app démarre
- [ ] Dérouler le scénario de démo du README de bout en bout
- [ ] `npm run build` — build vert
- [ ] **Avant de toucher au backend, lire le §4 en entier** — deux chemins de
      données coexistent, et le plus gros n'a pas de port

---

## 9. Installation réalisée sur le VPS — 26 juillet 2026

Trois écarts par rapport à `deploy/PREMIERE-INSTALLATION.md`, imposés par ce
serveur, qui héberge déjà une autre application en production (`icpp_app`).

| Point | La procédure prévoit | Ce qui a été fait | Pourquoi |
|---|---|---|---|
| Dépôt | `/opt/vitanow` | `/opt/Aura++` | Le dépôt y était déjà cloné |
| Racine web | `/var/www/vitanow` | `/var/www/aura-plus-plus` | Racine servie par le vhost existant |
| Port API | 3000 | **3100** | Le 3000 est publié par le conteneur `icpp_app` |
| PostgreSQL | port 5432 | **cluster natif sur 5433** | Le 5432 est tenu par `icpp_postgres` |

### Le choix de base de données, et pourquoi il compte

Un PostgreSQL tournait déjà sur cette machine, en conteneur, au service de
`icpp_app`. Y créer la base de VITA'NOW aurait été plus rapide — et aurait
placé le `TRUNCATE` de `002_seed.sql` à une faute de frappe des données de
production d'une autre application.

Un cluster natif a donc été installé, sur le port 5433 attribué
automatiquement puisque 5432 était pris. Les deux instances ne se voient pas.
Vérifié après installation : la base `icpp_platform` n'existe pas dans le
cluster de VITA'NOW.

### nginx — ce qui a été modifié, exactement

**Seul le bloc `location /api/` a été ajouté.** Le reste du vhost est
intact : 7 directives « managed by Certbot » avant, 7 après, certificat
valide jusqu'au 23 octobre 2026. Sauvegarde datée dans
`/root/vhost-avant-api.*.bak`.

### Comptes de démonstration

Le seed peuple les étudiants mais **pas** la table `accounts` : sans
intervention, personne ne peut se connecter. Quatre comptes ont été créés,
liés aux étudiants du corpus, avec des empreintes argon2id produites par la
bibliothèque du serveur lui-même.

`provider` doit valoir `email` : la route de connexion filtre dessus, et un
compte créé en `universite` échoue silencieusement à l'authentification.

### Le piège à connaître

`deploy/deployer.sh` construit désormais avec `VITE_MODE_API=1`. **Ne pas
retirer cette variable.** Sans elle, le front se reconstruit en mode
démonstration : corpus local, aucune requête réseau, aucune erreur affichée.
La base cesse simplement d'être lue, et rien ne le signale.

---

## 10. Audit de stabilité — 26 juillet 2026

Trois défauts trouvés en testant, et corrigés. Aucun n'était visible à la
lecture du code.

### 10.1 L'API mourait quand PostgreSQL tombait

`systemctl stop postgresql` faisait entrer le service en boucle de
redémarrage, et `/api/sante` répondait 502 — alors que le fichier de service
documente l'inverse (`Wants` et non `Requires`, pour que le contrôle de santé
réponde encore quand la base est absente).

Cause : `pg.Pool` est un `EventEmitter`. À la fermeture d'une connexion
inactive, le client émet `error` ; un `error` sans écouteur relance
l'exception et **arrête Node**. Le processus mourait sans qu'aucune requête
n'ait échoué.

Corrigé par `pool.on("error", …)` dans `db.ts`. Vérifié : base arrêtée, le
service reste `active`, `/api/sante` répond `503 {"statut":"degrade"}`, le
front continue d'être servi, et au retour de la base tout repart — **zéro
redémarrage**.

### 10.2 Les projets privés fuyaient

`GET /api/projets?etudiant=<id>` servait **tous** les projets de la personne,
privés compris, à n'importe qui — y compris à un visiteur non connecté. Il
suffisait de deviner un identifiant.

La visibilité se décide maintenant à partir de la session : on ne voit un
projet non public que s'il est le sien. Vérifié dans les cinq cas (anonyme,
propriétaire, tiers, avec et sans filtre).

### 10.3 Le produit ne tenait pas sa promesse de confidentialité

`projects.public` valait `true` par défaut, alors que la FAQ de la landing
affirme « par défaut, oui [privés] ». Tout projet créé était public à la
seconde où il existait.

Défaut passé à `false` dans `001_schema.sql` et dans la base en cours. Le
corpus de démonstration n'est pas affecté : le seed pose la valeur
explicitement.

### Ce qui a été ajouté pour la production

| | |
|---|---|
| Sauvegarde | `pg_dump` quotidien à 3h, gzip, rétention 14 jours, intégrité vérifiée à chaque exécution (`/usr/local/bin/vitanow-sauvegarde`) |
| Minuterie | `vitanow-sauvegarde.timer`, `Persistent=true` — rattrape une sauvegarde manquée si la machine était éteinte |
| Journaux | `vitanow.access.log` / `vitanow.error.log` dédiés, rotation 14 jours dans `/etc/logrotate.d/vitanow` |

### Restauration d'une sauvegarde

```bash
zcat /var/backups/vitanow/vitanow-AAAAMMJJ-HHMM.sql.gz \
  | sudo -u postgres psql -p 5433 -d vitanow
```

---

## 11. Session du 26 juillet 2026 — icônes, fusion mirindra, incident prod, checklist + IA Gemini

Session dense, quatre chantiers distincts. Dans l'ordre chronologique, parce que
chacun explique une décision du suivant.

### 11.1 Changement de mode de travail : plus de commit/push

L'utilisateur a explicitement demandé, en cours de session, d'arrêter de
committer/pousser : chaque modification est désormais appliquée directement
aux fichiers réels, buildée, puis redéployée (front : rsync vers
`/var/www/aura-plus-plus` ; backend : `npm run build` + `systemctl restart
vitanow-api`). **Aucun commit n'a été fait depuis.** `git log` s'arrête donc à
`8edc8f8` (« docs(readme)… ») alors que le code réel a beaucoup avancé depuis.

Ce que ça veut dire pour vous qui reprenez :
- Ne vous fiez **pas** à `git log`/`git diff HEAD` pour savoir ce qui a changé
  récemment — comparez plutôt le contenu réel des fichiers à ce que ce HANDOFF
  décrit.
- `git status` va lister énormément de fichiers modifiés/nouveaux. C'est normal,
  ce n'est pas un travail non sauvegardé à risque de perte : le code **est**
  déployé et vérifié en prod, juste jamais commité.
- Si votre mandat implique de committer normalement, **demandez d'abord** à
  l'utilisateur comment il veut traiter ce retard (un commit unique
  récapitulatif ? plusieurs commits reconstitués par thème ? on continue sans
  committer ?). Ne décidez pas seul, l'ampleur du diff non commité est
  inhabituelle.

### 11.2 Correction importante : la topologie réelle de la prod

Découvert en cours de session via `systemctl cat vitanow-api` (jamais confié à
un fichier avant) : **le service tourne directement depuis `/opt/Aura++/server`**
(`WorkingDirectory=/opt/Aura++/server`, `EnvironmentFile=/opt/Aura++/server/.env`),
et non depuis `/opt/vitanow` comme le documentent `deploy/vitanow-api.service`
et `deploy/PREMIERE-INSTALLATION.md` — ces deux fichiers versionnés sont
**restés à l'ancien chemin** alors que l'unit réellement installée dans
`/etc/systemd/system/vitanow-api.service` a été adaptée à la main (cohérent
avec le §9 ci-dessus, qui documente déjà l'écart `/opt/vitanow` → `/opt/Aura++`
pour le dépôt, mais ne précisait pas que le fichier unit versionné lui-même
n'a jamais été mis à jour pour le refléter).

**Conséquence pratique** : `/opt/Aura++` n'est pas un checkout de dev à côté de
la prod — **c'est** la prod, pour le front (buildé puis rsyncé vers
`/var/www/aura-plus-plus`) et pour le backend (`server/dist/index.js` tourne
depuis ce dossier exact). Éditer un fichier ici, puis builder et redémarrer,
modifie directement ce que voient les utilisateurs. Il n'y a pas de copie
intermédiaire à synchroniser.

Cycle de déploiement backend, tel qu'utilisé toute la session :
```bash
cd /opt/Aura++/server
npx tsc --noEmit          # vérifier avant de construire
npm run build             # tsc → dist/
systemctl restart vitanow-api
curl -s http://127.0.0.1:3100/api/sante   # {"statut":"ok",...}
```
Et côté front (rappel identique au §5, avec la variable `VITE_MODE_API=1` à
ne jamais oublier) :
```bash
cd /opt/Aura++/web
VITE_MODE_API=1 npm run build
sudo rsync -a --delete dist/ /var/www/aura-plus-plus/
sudo nginx -t && sudo systemctl reload nginx
```

### 11.3 Icônes Lottie, et l'incident de page blanche qu'elles ont causé deux fois

À la demande de l'utilisateur (« remplacer les icônes en étoile façon logo
Gemini/IA, et plus largement toutes les icônes, par des animations Lottie »),
`react-useanimations` (bundle `lottie-web`, JSON embarqué, aucun appel réseau)
a été installé et un composant unique `Icon` créé
([`web/src/ui/Icon.tsx`](web/src/ui/Icon.tsx)). Table de correspondance des
noms utilisés : `sparkle, trophy, bell, clock, plus, search, arrowRight, back,
eye, eyeOff, alertTriangle, calendar, menu, user, building, logout, lock,
check, folder, send, settings, book`. Une quinzaine d'icônes sans bon
équivalent (`X, RotateCcw, Filter, ListOrdered, GitBranch, Lightbulb,
Presentation, Handshake, MessageCircle, Brain, Flame, Zap, LayoutDashboard,
LibraryBig, Briefcase, Link2, TrendingUp, SlidersHorizontal`) sont restées en
`lucide-react` — **c'est un choix assumé**, pas un oubli : les forcer vers des
animations sans rapport visuel aurait été pire que de les garder statiques.

**Deux incidents de page blanche coup sur coup**, tous deux causés par le même
type de bug (interop CJS/ESM cassée, détaillé au §7) :
1. D'abord sur le composant `UseAnimations` lui-même (React error #130) —
   corrigé en déballant `.default` à l'import.
2. Puis, une fois ce premier bug corrigé et un autre chantier terminé (fusion
   du design de la branche `mirindra`), un second signalement : « les icônes
   Lottie ne sont pas visibles ». Cette fois pas de crash — chaque import
   individuel `react-useanimations/lib/xxx` (les données d'animation, pas un
   composant) souffrait du **même** défaut d'interop, silencieusement :
   `animationData` valait `undefined`, `lottie-web` ne dessinait rien, aucune
   erreur console. Diagnostiqué en inspectant le DOM en headless (les `<div>`
   wrapper des icônes étaient présents, correctement dimensionnés, mais vides).
   Corrigé en généralisant le déballage `.default` à **tous** les imports
   d'animation, pas seulement au composant.

**Si une future icône ajoutée au mapping ne s'affiche pas** : vérifier d'abord
qu'elle passe bien par la fonction `unwrap()` de `Icon.tsx` — c'est presque
certainement la même cause.

Effet de bord découvert au passage : le bundle JS principal est passé
d'environ 640 Ko à ~1,1 Mo (gzip ~295 Ko) à cause du moteur `lottie-web`
embarqué. Accepté par l'utilisateur, mais à garder en tête si la taille du
bundle redevient un sujet.

### 11.4 Checklist de projet ("post-it") et résumé IA Gemini

**Ne pas confondre deux jauges distinctes**, décision actée explicitement avec
l'utilisateur après qu'une lecture du code a révélé la règle M15 (« le
pourcentage vient du journal, jamais d'une saisie », voir §7 du fichier et les
commentaires dans `domain/soa.ts` / `001_schema.sql`) :
- **`avancement()` / `progressOf` / le Stat « Avancement »** : **inchangés**,
  toujours dérivés uniquement du journal. Cocher une case de checklist ne les
  touche jamais.
- **La checklist a sa propre jauge** : « X/Y étapes cochées », affichée dans le
  nouveau bloc « Étapes » de `ProjectScreen` (post-it inclinés, `web/src/screens/ProjectScreens.tsx`).

Ce que ça a nécessité :
- **Migrations** `server/migrations/003_checklist.sql` (table
  `checklist_items`) et `004_resume_ia.sql` (colonne `project_summaries.provider`
  + table `ai_usage`). **Appliquées manuellement via `psql`** sur la base
  réelle — rappel : il n'existe **aucun runner de migrations** dans ce projet,
  juste des fichiers `.sql` numérotés à jouer à la main (voir §6 du dossier
  `migrations/`, et ne **jamais** rejouer `002_seed.sql` sur cette base, il fait
  un `TRUNCATE`).
- **Backend** : `POST /api/projets` accepte un `checklist?: {id?, libelle}[]`
  optionnel (insertion dans une transaction avec le projet — `ecriture.ts`) ;
  `PATCH /api/projets/:id/checklist/:itemId` coche/décoche (ne touche jamais
  `derniere_activite`, volontairement — voir le commentaire dans le code) ;
  `GET /api/projets/:id` et `GET /api/etat` renvoient désormais la checklist
  de chaque projet (`etat.ts` avait sa **propre** requête SQL pour les projets,
  séparée de celle de `projets.ts` — les deux ont dû être étendues, sinon la
  checklist disparaissait après un rechargement de page).
- **Résumé IA (M5)** : existait déjà côté serveur (`server/src/resume.ts`,
  provider Claude) mais **n'était jamais appelé par le front** — `summaryFor()`
  dans `soa-store.tsx` est une heuristique locale entièrement déconnectée de la
  route `/api/projets/:id/resume`. Corrigé : `ProjectScreen` appelle
  maintenant réellement cette route en mode API (`API_ACTIVE`), l'heuristique
  locale ne servant plus que d'affichage instantané pendant le chargement.
  - Provider **Gemini ajouté et préféré à Claude** quand `GEMINI_API_KEY` est
    configurée (`env.geminiKey`). **Piège testé et vérifié en direct** : le
    modèle `gemini-2.0-flash` a un quota gratuit à **0** sur la clé fournie
    (429 systématique) — le modèle qui fonctionne réellement est
    `gemini-flash-latest`. `generationConfig.thinkingConfig.thinkingBudget: 0`
    est **rejeté** (400) par ce modèle ; `512` fonctionne et réduit fortement
    le coût en tokens de réflexion par rapport à l'absence de configuration
    (observé : ~230 tokens de pensée sur un prompt trivial sans cette limite).
    Si Gemini échoue ou que le quota du jour est atteint, repli sur Claude puis
    sur les règles — jamais d'échec visible à l'écran, même philosophie que
    l'existant.
  - Quota « usage modéré » : table `ai_usage` (par étudiant, par jour
    calendaire), incrémentée **avant** l'appel réseau (pas après un succès) —
    sinon une clé cassée ne consommerait jamais le quota. **En base et non en
    mémoire**, précisément parce que ce projet redémarre le service plusieurs
    fois par jour en développement (voir §11.1) : un compteur en mémoire
    perdrait toute utilité à chaque redémarrage.
  - Colonne `project_summaries.provider` : le cache par empreinte renvoyait
    avant un `source: "claude"` codé en dur sur tout hit de cache. Avec deux
    providers possibles, ça mentirait sur l'origine d'un résumé caché — d'où
    la colonne.
- **Secret** : `GEMINI_API_KEY` est dans `/opt/Aura++/server/.env` (mode 0600,
  propriétaire `vitanow` — **attention en éditant ce fichier avec un outil qui
  écrit en tant que root, `chown vitanow:vitanow` derrière, sinon le service ne
  peut plus lire son `.env` au redémarrage**, piège rencontré et corrigé dans
  cette session). Jamais dans `web/`, jamais commitée. Ajoutée aussi (vide)
  dans `server/.env.example`.

**Vérifié en conditions réelles** : compte de test créé, projet + checklist
créés via l'API, item coché (confirmé : `derniere_activite` inchangée),
résumé demandé (confirmé : réponse `source: "gemini"`, ligne insérée dans
`project_summaries` et `ai_usage`) — puis **tout supprimé** (le `DELETE` sur
`students` cascade sur projet/checklist/résumé/usage). La base est revenue
exactement à son état d'avant le test.

**Non fait / à vérifier par qui reprend** :
- `BACKLOG.md` **n'a pas été mis à jour** avec cette fonctionnalité — elle n'y
  était pas prévue sous ce nom. À reconcilier si vous continuez sur ce fil.
- Aucune limite de taille sur le nombre d'étapes qu'un étudiant peut ajouter à
  la création (pas de plafond côté serveur). Probablement à ajouter si ça pose
  problème en usage réel.
- Le mirindra branch merge (design du rail de navigation, des onglets Projets
  et Communauté) a été intégré en combinant manuellement (`git merge-file`,
  base/ours/theirs extraits en fichiers temporaires) le nouveau design avec la
  conversion Lottie déjà en place sur les mêmes fichiers — pas de trace de
  cette fusion dans l'historique git puisque rien n'a été commité (voir §11.1).
  Si `origin/mirindra` évolue encore, il faudra refaire cet exercice de fusion
  à la main plutôt que `git merge` directement, tant que les changements
  d'icônes ne sont pas commités sur `main`.
