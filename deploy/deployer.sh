#!/usr/bin/env bash
#
# VITA'NOW — déploiement sur le VPS.
#
#   sudo bash deploy/deployer.sh
#
# Idempotent : relançable sans effet de bord. Ne crée pas la base et ne joue
# aucune migration destructive — voir deploy/PREMIERE-INSTALLATION.md pour la
# mise en place initiale.

set -euo pipefail

RACINE=/opt/Aura++
WEB=/var/www/aura-plus-plus
SERVICE=vitanow-api

rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
info()  { printf '\033[36m▸ %s\033[0m\n' "$*"; }

[[ $EUID -eq 0 ]] || { rouge "À lancer en root (sudo)."; exit 1; }

# ── Garde-fous ───────────────────────────────────────────────────────────
# Vérifiés AVANT toute modification : un déploiement à moitié fait est plus
# difficile à rattraper qu'un déploiement qui refuse de commencer.
[[ -d $RACINE/.git ]]        || { rouge "$RACINE n'est pas un dépôt git."; exit 1; }
[[ -f $RACINE/server/.env ]] || { rouge "server/.env absent. Voir .env.example."; exit 1; }

if grep -q 'changer-cette-valeur' "$RACINE/server/.env"; then
  rouge "COOKIE_SECRET est resté à sa valeur d'exemple."
  rouge "En générer un vrai :  openssl rand -hex 32"
  exit 1
fi

cd "$RACINE"

# ── Code ─────────────────────────────────────────────────────────────────
info "Récupération du code"
git fetch --all --prune
BRANCHE=$(git rev-parse --abbrev-ref HEAD)
git reset --hard "origin/$BRANCHE"
vert "  $BRANCHE @ $(git rev-parse --short HEAD)"

# ── Front ────────────────────────────────────────────────────────────────
info "Construction du front"
cd "$RACINE/web"
npm ci --no-audit --no-fund

# VITE_API_URL est inlinée AU MOMENT DU BUILD : la changer après n'a aucun
# effet. Vide = chemins relatifs (/api/...), ce que le reverse proxy sert
# déjà sur la même origine — c'est le cas nominal.
#
# VITE_MODE_API=1 est indispensable et doit rester ici : sans lui, le front se
# reconstruit **silencieusement** en mode démonstration — corpus local, aucune
# requête réseau. Rien n'échoue, rien n'avertit, et la base cesse simplement
# d'être lue. C'est la panne la plus difficile à diagnostiquer de ce dépôt.
VITE_MODE_API=1 npm run build

# Le remplacement se fait après un build réussi seulement : si `npm run build`
# échoue, l'ancienne version reste en ligne au lieu d'être remplacée par rien.
info "Mise en ligne du front"
mkdir -p "$WEB"
rsync -a --delete dist/ "$WEB/"
chown -R www-data:www-data "$WEB"

# ── API ──────────────────────────────────────────────────────────────────
info "Construction de l'API"
cd "$RACINE/server"
npm ci --no-audit --no-fund
npm run build
chown -R vitanow:vitanow "$RACINE/server"

info "Redémarrage du service"
systemctl daemon-reload
systemctl restart "$SERVICE"

# ── Vérification ─────────────────────────────────────────────────────────
info "Contrôle de santé"
for tentative in $(seq 1 10); do
  if reponse=$(curl -fsS --max-time 5 http://127.0.0.1:3000/api/sante 2>/dev/null); then
    vert "  $reponse"
    break
  fi
  [[ $tentative -eq 10 ]] && {
    rouge "L'API ne répond pas après 10 tentatives."
    rouge "Journal :  journalctl -u $SERVICE -n 50 --no-pager"
    exit 1
  }
  sleep 2
done

info "Rechargement de nginx"
nginx -t
systemctl reload nginx

info "Vérification publique"
code=$(curl -s -o /dev/null -w '%{http_code}' https://aura.icpp-conformite.cloud/)
[[ $code == 200 ]] && vert "  front : HTTP $code" || { rouge "  front : HTTP $code"; exit 1; }

code=$(curl -s -o /dev/null -w '%{http_code}' https://aura.icpp-conformite.cloud/api/sante)
[[ $code == 200 ]] && vert "  api   : HTTP $code" || { rouge "  api   : HTTP $code"; exit 1; }

vert ""
vert "Déploiement terminé — $(git rev-parse --short HEAD)"
