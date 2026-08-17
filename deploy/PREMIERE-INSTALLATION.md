# Première installation — VPS

> Destiné à l'agent ou à la personne qui met VITA'NOW en ligne sur
> `srv1335675.hstgr.cloud` (Hostinger), servi sur
> `https://aura.icpp-conformite.cloud`.
>
> **À jouer une seule fois.** Les mises à jour suivantes passent par
> [`deployer.sh`](deployer.sh). Pour l'exploitation quotidienne, les contrôles
> de santé et le diagnostic, suivre [`EXPLOITATION.md`](EXPLOITATION.md).

---

## Ce qui existe déjà sur ce serveur

Le front est **déjà en ligne** : nginx 1.24, TLS Let's Encrypt actif,
redirection 80 → 443 en place, racine `/var/www/aura-plus-plus`.

Ce qui n'existe pas encore : **PostgreSQL, l'API, et le service systemd**.

> ⚠️ Le vhost actuel porte un certificat géré par Certbot. **Ne pas écraser**
> `/etc/nginx/sites-enabled/aura.icpp-conformite.cloud` avec le fichier fourni :
> y reporter uniquement le bloc `location /api/` et les en-têtes. Réécrire le
> fichier ferait perdre les directives de Certbot et le renouvellement
> automatique cesserait — le site tomberait en HTTPS trois mois plus tard.

---

## 1. Utilisateur système

L'API ne tourne pas en root. Un compte sans shell et sans dossier personnel
suffit : le service n'a besoin ni de se connecter ni d'écrire des fichiers.

```bash
adduser --system --group --no-create-home --shell /usr/sbin/nologin vitanow
```

## 2. Dépendances

```bash
apt update
apt install -y postgresql postgresql-contrib rsync

# Node 22 — la version des paquets Debian est trop ancienne.
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node --version   # doit afficher v22.x
```

## 3. Base de données

```bash
# Mot de passe : en générer un et le garder pour l'étape 5.
MDP=$(openssl rand -hex 24); echo "mot de passe base : $MDP"

sudo -u postgres psql <<SQL
CREATE USER vitanow WITH PASSWORD '$MDP';
CREATE DATABASE vitanow OWNER vitanow;
SQL
```

Les extensions `unaccent`, `pgcrypto` et `citext` demandent le rôle superuser.
Le schéma les crée lui-même, on le joue donc en tant que `postgres` :

```bash
cd /opt/Aura++
sudo -u postgres psql -d vitanow -v ON_ERROR_STOP=1 -f server/migrations/001_schema.sql

# Le schéma appartient alors à postgres : on rend la main à l'utilisateur applicatif.
sudo -u postgres psql -d vitanow <<'SQL'
GRANT ALL ON SCHEMA public TO vitanow;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO vitanow;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO vitanow;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO vitanow;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vitanow;
SQL
```

Corpus de démonstration (**facultatif** — à omettre pour partir d'une base vide) :

```bash
sudo -u postgres psql -d vitanow -v ON_ERROR_STOP=1 -f server/migrations/002_seed.sql
```

> `002_seed.sql` commence par un `TRUNCATE` de toutes les tables.
> **Ne jamais le rejouer sur une base contenant de vraies données.**

## 4. Code

```bash
git clone https://github.com/i-Fandresena/AuraPlusPlus.git /opt/Aura++
cd /opt/Aura++
git checkout staging
```

## 5. Configuration

```bash
cp server/.env.example server/.env
nano server/.env
```

À renseigner :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | `postgres://vitanow:LE_MOT_DE_PASSE@localhost:5432/vitanow` |
| `PORT` | `3100` |
| `CORS_ORIGIN` | `https://aura.icpp-conformite.cloud` |
| `COOKIE_SECRET` | **`openssl rand -hex 32`** — jamais la valeur d'exemple |
| `ANTHROPIC_API_KEY` | facultatif ; vide, le résumé se déduit du journal |

```bash
chown vitanow:vitanow server/.env
chmod 600 server/.env       # le fichier porte deux secrets
```

> L'API **refuse de démarrer** si `COOKIE_SECRET` est resté à sa valeur
> d'exemple alors que `NODE_ENV=production`. C'est voulu : les sessions
> seraient signées avec une clé publiée sur GitHub.

## 6. Service systemd

```bash
cp deploy/vitanow-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now vitanow-api
systemctl status vitanow-api --no-pager
curl -s http://127.0.0.1:3100/api/sante     # {"statut":"ok","base":"ok",...}
```

## 7. nginx

Ouvrir le vhost existant et **ajouter** le bloc `location /api/` de
[`nginx-vitanow.conf`](nginx-vitanow.conf), avant le `location /`.

La racine de production est `/var/www/aura-plus-plus` ; elle doit rester
alignée avec `root` dans le vhost nginx.

```bash
nginx -t && systemctl reload nginx
curl -s https://aura.icpp-conformite.cloud/api/sante
```

## 8. Premier déploiement complet

```bash
chmod +x deploy/deployer.sh
sudo bash deploy/deployer.sh
```

## 9. Brancher le front sur l'API

**Par défaut, le front construit reste en mode démonstration** : corpus local,
`localStorage`, aucune requête réseau. C'est volontaire — il fonctionne même
serveur éteint.

Pour qu'il parle à l'API, il faut construire avec `VITE_MODE_API=1` :

```bash
cd /opt/Aura++/web
VITE_MODE_API=1 npm run build
# Les anciens assets hashés restent disponibles pour les onglets ouverts avant
# la publication : ne jamais ajouter --delete.
sudo rsync -a --delay-updates --exclude='index.html' dist/ /var/www/aura-plus-plus/
sudo install -m 0644 dist/index.html /var/www/aura-plus-plus/index.html
```

> `VITE_API_URL` reste **vide** : front et API sont servis par le même nginx,
> donc `/api/...` en chemin relatif suffit.
>
> ⚠️ **Ces variables sont inlinées au moment du build.** Les changer après
> n'a aucun effet — il faut reconstruire.

Pour rendre ce mode permanent, ajouter la variable au script :

```bash
sed -i 's|^npm run build$|VITE_MODE_API=1 npm run build|' deploy/deployer.sh
```

### Vérifier que la bascule a pris

```bash
curl -s https://aura.icpp-conformite.cloud/api/etat | head -c 200
```

Puis, dans le navigateur, ouvrir l'onglet Réseau : un appel à `/api/etat` doit
partir au chargement. S'il n'y en a pas, le front est resté en mode
démonstration — reconstruire avec la variable.

---

## Mises à jour suivantes

```bash
cd /opt/Aura++ && sudo bash deploy/deployer.sh
```

Le script récupère la branche courante, reconstruit front et API, redéploie,
redémarre le service et **vérifie que tout répond**. Il s'arrête avant de
toucher quoi que ce soit si `.env` manque ou si le secret est resté à sa
valeur d'exemple.

## En cas de panne

```bash
journalctl -u vitanow-api -n 100 --no-pager   # journal de l'API (JSON)
systemctl status vitanow-api --no-pager
curl -s http://127.0.0.1:3100/api/sante       # 503 => base injoignable
tail -50 /var/log/nginx/vitanow.error.log
```

| Symptôme | Cause la plus fréquente |
|---|---|
| `EADDRINUSE` | Un ancien processus tient le port 3100 : `systemctl restart vitanow-api` |
| `/api/sante` en 503 | PostgreSQL arrêté, ou `DATABASE_URL` faux |
| Le service ne démarre pas | `.env` absent, illisible par `vitanow`, ou `COOKIE_SECRET` d'exemple |
| Écran blanc après déploiement | Asset hashé supprimé ou `index.html` obsolète : voir `EXPLOITATION.md`, ne jamais employer `rsync --delete` |
| 502 sur `/api/` | L'API est arrêtée — voir `journalctl` |
