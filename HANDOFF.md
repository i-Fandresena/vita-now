# HANDOFF.md — Aura++ / SOA

> Document de passation. Destiné à qui reprend le projet sans avoir assisté à ce
> qui précède. **Dernière mise à jour : 26 juillet 2026.**

---

## 0. À lire avant de toucher au code

| Fichier | Autorité | Ce qu'il fixe |
|---|---|---|
| [AURA_cadrage.md](AURA_cadrage.md) | **Souverain** | Le besoin de l'équipe : 21 modules étudiants + 10 modules entreprise |
| [SPEC.md](SPEC.md) | **Opérationnel** | Traduction du cadrage en écrans, modèle de données, états |
| [BACKLOG.md](BACKLOG.md) | **Exécution** | Ce qui reste à faire, par priorité |
| [docs/archive/](docs/archive/) | **Périmé** | Ancien périmètre restreint — historique uniquement |

En cas de conflit : `AURA_cadrage.md` > `SPEC.md` > confort d'implémentation.

**Avertissement important pour qui reprend :** les documents `PRODUCT.md`,
`Product_2.0.md` et `DESIGN.md` ont été **archivés le 26 juillet 2026**. Ils
décrivaient un périmètre réduit à 3 mécaniques et interdisaient explicitement une
grande partie des modules du cadrage. Le code actuellement en ligne a été écrit
contre ces documents — **il ne couvre que 5 des 31 modules du cadrage**, dont 3
partiellement. Voir [SPEC.md §1](SPEC.md).

---

## 1. Où en est le projet

### Fait et vérifié

- Front React/Vite : **5 écrans**, testés en 1440×900 et 375×812, zéro erreur console
- Design system : tokens, primitives, états (vide / chargement / erreur / squelette)
- Scène 3D unique + repli SVG automatique sur 4 chemins de défaillance
- Couche de données découplée derrière un port (`FragmentRepository`)
- Corpus de démonstration déterministe, 5 entrées à contenu technique réel
- Build de production vert, three.js isolé en chunk paresseux
- **Déployé et servi en HTTPS** : https://aura.icpp-conformite.cloud/

### Pas fait

- **26 des 31 modules du cadrage n'ont aucune ligne de code.** Voir [SPEC.md §4](SPEC.md).
- **Aucun backend.** Pas d'Express/FastAPI, pas de PostgreSQL, pas de pgvector,
  pas d'appel à l'API Claude. Tout passe par une implémentation en mémoire.
- Aucune authentification (utilisateur courant codé en dur : `CURRENT_USER`).
- Aucune persistance : un rechargement de page perd les dépôts effectués.
- Aucun test automatisé, aucune CI/CD.
- Aucune landing page publique — le domaine ouvre directement sur l'écran de recherche.

### Écart d'architecture à connaître

Le front a été construit **avant** le backend. Le risque technique du matching
sémantique (pgvector + embeddings + API Claude) reste **entier et non validé**.

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
Aura++/
├── AURA_cadrage.md        source de vérité produit
├── SPEC.md                traduction opérationnelle
├── BACKLOG.md             travaux restants
├── HANDOFF.md             ce fichier
├── docs/archive/          PRODUCT.md, Product_2.0.md, DESIGN.md (périmés)
├── graphify-out/          graphe de connaissances du projet
└── web/
    ├── README.md          scénario de démo + URLs directes
    └── src/
        ├── domain/        types + port — ne connaît ni React ni HTTP
        ├── data/          corpus de démo + implémentation en mémoire
        ├── app/           providers, routeur, chrome
        ├── ui/            primitives du design system
        ├── features/      composants liés à un usage
        ├── screens/       les 5 écrans
        └── styles/        theme.css (tokens) + base.css (socle)
```

**Règle d'architecture :** aucun écran n'importe le corpus. Ils appellent
`useRepository()`. Cette règle est ce qui rend le §4 possible.

---

## 4. Le point d'extension — brancher le vrai backend

C'est **le seul endroit à toucher** pour passer de la démo au produit réel.

1. Implémenter [`FragmentRepository`](web/src/domain/repository.ts) contre l'API.
   Le port expose **6 méthodes** : `search`, `getById`, `capsuleForCurrentProject`,
   `declareUse`, `latestSignal`, `deposit`.
2. La passer au provider :
   ```tsx
   <RepositoryProvider repository={new HttpFragmentRepository(baseUrl)}>
   ```
3. C'est tout. **Aucun composant ne change.**

Contraintes côté serveur :
- Temps de réponse **< 2 s**.
- `search` doit honorer l'`AbortSignal` — le front annule les requêtes obsolètes.
- `latestSignal` doit rester résolvable sans déclaration préalable : un rechargement
  en pleine soutenance ne doit pas vider l'écran le plus important.
- `search` renvoie un `why` par résultat (pourquoi *ce* résultat répond à *cette*
  question). Sans cette phrase, le résultat demande un acte de foi.

**Attention :** ce port est modelé sur l'ancien périmètre (le « fragment »). Le
cadrage travaille au niveau du **projet**. Voir [BACKLOG.md](BACKLOG.md) §
Refonte du domaine — le port devra être élargi, pas seulement implémenté.

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
- Le vocabulaire du code (« fragment », « sceau », « braise ») vient de l'ancien
  périmètre et n'apparaît nulle part dans `AURA_cadrage.md`. Ne pas l'étendre à
  de nouveaux écrans sans décision explicite.

---

## 8. Checklist de reprise

- [ ] Lire `AURA_cadrage.md`, puis `SPEC.md`, puis `BACKLOG.md`
- [ ] `cd web && npm ci && npm run dev` — l'app démarre
- [ ] Dérouler le scénario de démo du README de bout en bout
- [ ] `npm run build` — build vert
- [ ] Ouvrir `graphify-out/graph.html` pour la carte du projet
