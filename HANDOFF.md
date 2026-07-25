# HANDOFF.md — Aura++

> Document de passation. Destiné à un agent (ou un humain) qui reprend le projet
> sur le VPS sans avoir assisté à ce qui précède.
> Dernière mise à jour : **26 juillet 2026**.

---

## 0. À lire avant de toucher au code

Trois documents font contrat. Ils ne sont pas indicatifs.

| Fichier | Autorité | Ce qu'il fixe |
|---|---|---|
| [PRODUCT.md](PRODUCT.md) | **Produit — souverain** | Ce que Aura++ est, et surtout ce qu'il n'est pas |
| [Product_2.0.md](Product_2.0.md) | **Produit** | Vision, MVP, happy path, règles de démo |
| [DESIGN.md](DESIGN.md) | **Esthétique** | Tokens, typographie, mouvement, checklist anti-slop |

En cas de conflit : produit > esthétique > confort d'implémentation.

### Les interdits qui font échouer une revue

Ils viennent du sujet du hackathon, pas d'un goût personnel. La lettre source
rejette explicitement ces mécaniques (« pas de streak à casser, pas de score,
pas de niveau suivant ») :

- ❌ Score, points, badges, niveaux, classement, podium, streak
- ❌ Barre de progression, jauge, compteur de complétion
- ❌ Message d'encouragement ou de culpabilisation (« déjà 4 jours ! »)
- ❌ Toute fonctionnalité assimilable à GitHub / Notion / Trello
- ❌ Module entreprise, CV dynamique, intégrations GitHub/Gmail réelles
  (slide de pitch uniquement, zéro ligne de code)

**Si une demande contredit ces documents, la signaler explicitement et proposer
une alternative — ne pas trancher silencieusement.**

---

## 1. Où en est le projet

### Fait et vérifié en navigateur réel

- Front complet : **5 écrans**, testés en 1440×900 et 375×812, zéro erreur console
- Design system : tokens, primitives, états (vide / chargement / erreur / squelette)
- Scène 3D unique + repli SVG automatique sur 4 chemins de défaillance
- Couche de données découplée derrière un port (`FragmentRepository`)
- Corpus de démonstration déterministe, 5 fragments à contenu technique réel
- Build de production vert, three.js isolé en chunk paresseux

### Pas fait

- **Aucun backend.** Pas d'Express/FastAPI, pas de PostgreSQL, pas de pgvector,
  pas d'appel à l'API Claude. Tout passe par une implémentation en mémoire.
- Aucune authentification (l'utilisateur courant est codé en dur : `CURRENT_USER`).
- Aucune persistance : un rechargement de page perd les dépôts effectués.
- Aucun test automatisé.
- Aucun CI/CD.

### Décision d'architecture à connaître

Le front a été construit **avant** le backend, contrairement au plan de bataille
de [PRODUCT.md §7](PRODUCT.md) qui plaçait le pipeline pgvector en premier.
C'est un écart assumé : le « Demo Mode » de Product_2.0.md autorise des données
préchargées et des réponses déterministes, et le port rend le branchement
ultérieur mécanique. **Le risque technique du matching sémantique reste donc
entier et non validé.**

---

## 2. Stack

| Élément | Version | Note |
|---|---|---|
| Node | 22.13 | |
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
DevHunt2026/
├── PRODUCT.md, Product_2.0.md, DESIGN.md, HANDOFF.md
└── web/
    ├── README.md              scénario de démo + URLs directes
    └── src/
        ├── domain/            types + port — ne connaît ni React ni HTTP
        ├── data/              corpus de démo + implémentation en mémoire
        ├── app/               providers, routeur, chrome
        ├── ui/                primitives du design system
        ├── features/          composants liés à un usage
        ├── screens/           les 5 écrans
        └── styles/            theme.css (tokens) + base.css (socle)
```

**Règle d'architecture :** aucun écran n'importe le corpus. Ils appellent
`useRepository()`. Cette règle est ce qui rend le point 4 possible.

---

## 4. Le point d'extension — brancher le vrai backend

C'est **le seul endroit à toucher** pour passer de la démo au produit réel.

1. Implémenter [`FragmentRepository`](web/src/domain/repository.ts) contre
   l'API (5 méthodes : `search`, `getById`, `capsuleForCurrentProject`,
   `declareUse`, `latestSignal`, `deposit`).
2. La passer au provider :
   ```tsx
   <RepositoryProvider repository={new HttpFragmentRepository(baseUrl)}>
   ```
3. C'est tout. **Aucun composant ne change.**

Contraintes à respecter côté serveur :
- Temps de réponse **< 2 s** (Product_2.0.md, checklist avant merge).
- `search` doit honorer l'`AbortSignal` — le front annule les requêtes obsolètes.
- `latestSignal` doit rester résolvable sans déclaration préalable : un
  rechargement en pleine soutenance ne doit pas vider l'écran le plus important.
- `search` renvoie un `why` par résultat (pourquoi *ce* fragment répond à *cette*
  question). Sans cette phrase, le résultat demande un acte de foi.

---

## 5. Déploiement VPS

Le front est une **SPA statique**. Le routage est en `#hash`, donc **aucune
règle de réécriture n'est nécessaire** — un serveur de fichiers nu suffit.

### Build

```bash
cd web
npm ci
npm run build      # produit web/dist/
```

### Servir — Caddy (recommandé, HTTPS automatique)

`/etc/caddy/Caddyfile` :

```
auraplusplus.exemple.mg {
    root * /var/www/aura-plus-plus
    encode zstd gzip
    file_server

    # Les polices et les assets hachés sont immuables.
    @assets path /assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
    header /index.html Cache-Control "no-cache"
}
```

```bash
sudo rsync -a --delete web/dist/ /var/www/aura-plus-plus/
sudo systemctl reload caddy
```

### Servir — nginx (alternative)

```nginx
server {
    listen 80;
    server_name auraplusplus.exemple.mg;
    root /var/www/aura-plus-plus;

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Quand le backend existera

Ajouter un reverse proxy sur `/api` vers le service Node/Python, et injecter
l'URL via `VITE_API_URL` **au moment du build** (Vite inline les variables ; les
changer après le build n'a aucun effet).

### Vérification post-déploiement

```bash
curl -sI https://auraplusplus.exemple.mg | head -1          # 200
curl -s https://auraplusplus.exemple.mg | grep -o '<title>.*</title>'
```

Puis, dans un navigateur, dérouler le scénario du [README](web/README.md).

---

## 6. Ce qui reste à faire, par priorité

### P0 — sans quoi le produit n'est qu'une maquette

1. **Pipeline de matching sémantique.** PostgreSQL + pgvector, extraction et
   embedding du corpus, endpoint `search`. C'est le cœur technique risqué et il
   n'est pas validé.
2. **API REST** exposant les 6 méthodes du port.
3. **Extraction par l'API Claude** : à partir d'un mémoire brut, produire
   `reasoning` / `choices` / `deadEnds` / `leads`. Jamais de code brut en sortie.
4. **Persistance des dépôts** — actuellement perdus au rechargement.

### P1 — crédibilité de la démonstration

5. Corpus réel de l'ENI (quelques mémoires vrais valent mieux que cinquante faux).
6. Détection d'inactivité réelle pour déclencher la capsule (aujourd'hui simulée).
7. Auth minimale — suffit pour que « l'auteur » et « le chercheur » soient deux
   personnes distinctes à l'écran.

### P2 — solidité

8. Tests : le classement de recherche et le repli 3D en premier.
9. CI (typecheck + build) et déploiement automatisé.
10. Passe Lighthouse + audit clavier complet sur les 5 écrans.

### Hors périmètre MVP — slide de pitch uniquement

Module entreprise, CV dynamique, intégrations GitHub/Gmail, extension VS Code,
app mobile, dette de contexte collective.

---

## 7. Pièges connus

- **`tailwind-merge` doit connaître les tokens.** `text-body` (taille) et
  `text-canvas` (couleur) partagent le préfixe `text-`. Sans déclaration dans
  [`cn.ts`](web/src/lib/cn.ts), la fusion en supprime un — le bouton primaire
  devenait un rectangle blanc sans libellé, invisible au type-check.
  **Toute nouvelle valeur ajoutée à `theme.css` doit y être déclarée aussi.**
- **La loi de la braise.** La couleur d'accent n'a droit qu'à 3 emplacements
  ([DESIGN.md §3.3](DESIGN.md)). Un bouton coloré ou une erreur en rouge viderait
  le signal de son sens.
- **Budget d'animation.** Deux moments narratifs, pas trois. Tout le reste est
  plafonné à 200 ms, `transform`/`opacity` uniquement. Pas de reveal-au-scroll.
- **Toute dérogation à DESIGN.md doit être écrite dans son §7bis avant d'être
  codée.**
- Vite 8 utilise Rolldown : `build.rollupOptions.output.manualChunks` en objet
  n'existe plus. Le découpage passe par `React.lazy`.
- Newsreader est distribué par axe (`opsz.css`), pas par sous-ensemble — il n'y
  a pas de `latin.css` pour cette famille.

---

## 8. Checklist de suivi

### Reprise du projet
- [ ] Lire PRODUCT.md, Product_2.0.md, DESIGN.md
- [ ] `cd web && npm ci && npm run dev` — l'app démarre
- [ ] Dérouler le scénario de démo du README de bout en bout
- [ ] `npm run build` — build vert

### Déploiement
- [ ] Node 22+ installé sur le VPS
- [ ] Build produit et transféré dans `/var/www/aura-plus-plus`
- [ ] Serveur web configuré (Caddy ou nginx)
- [ ] HTTPS actif
- [ ] Les 5 URLs répondent (`#/`, `#/fragment/f-sync-conflits`, `#/reprise`, `#/deposer`, `#/signal/f-sync-conflits`)
- [ ] En-têtes de cache posés sur `/assets/`
- [ ] Scénario de démo rejoué depuis l'URL publique

### Backend (P0)
- [ ] PostgreSQL + pgvector provisionnés
- [ ] Schéma et ingestion du corpus
- [ ] Embeddings générés
- [ ] Endpoint `search` — réponse < 2 s, `AbortSignal` honoré
- [ ] Endpoints `getById`, `capsule`, `declareUse`, `latestSignal`, `deposit`
- [ ] Extraction Claude : raisonnement / choix / impasses / pistes
- [ ] `HttpFragmentRepository` écrit et passé au provider
- [ ] Vérifié : aucun composant modifié pour ce branchement
- [ ] Persistance des dépôts confirmée après rechargement

### Avant démonstration au jury
- [ ] Zéro élément de gamification sur l'ensemble des écrans
- [ ] Aucun écran vide (Demo Mode)
- [ ] Réponses déterministes
- [ ] Aucune dépendance Internet critique
- [ ] Les 5 écrans tiennent à 375px sans défilement horizontal
- [ ] Navigation clavier complète, focus visible
- [ ] `prefers-reduced-motion` respecté sur les deux moments narratifs
- [ ] Repli SVG vérifié (désactiver WebGL dans le navigateur)
- [ ] Scénario répété à voix haute, chronométré
