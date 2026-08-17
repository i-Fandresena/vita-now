#!/usr/bin/env bash
#
# VITA'NOW — déploiement sur le VPS.
#
#   sudo bash deploy/deployer.sh
#
# Idempotent et non destructif : relançable sans effacer les assets hashés des
# versions précédentes. C'est indispensable pour les navigateurs qui ont une
# page ouverte pendant une publication (voir deploy/EXPLOITATION.md).

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
# Le dépôt de production peut contenir le travail en cours de l'équipe. Un
# `git reset --hard` dans un script de déploiement détruirait ces modifications
# locales : récupérer une branche est donc une étape explicite, jamais cachée
# dans le déploiement.
info "Version à publier"
vert "  $(git rev-parse --short HEAD)$(git diff --quiet || printf ' (modifications locales)')"

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
VITE_MODE_API=1 VITE_LANDING_MOTION="${VITE_LANDING_MOTION:-1}" npm run build

# Le remplacement se fait après un build réussi seulement : si `npm run build`
# échoue, l'ancienne version reste en ligne au lieu d'être remplacée par rien.
#
# Surtout, aucun `--delete` ici. Les assets Vite ont un hash et sont mis en
# cache un an par nginx. Supprimer le hash précédent casse les onglets déjà
# ouverts et provoque un `ChunkLoadError` / écran blanc. Les anciens fichiers
# sont minuscules à l'échelle du disque et constituent une compatibilité de
# déploiement ; leur nettoyage est une opération planifiée, jamais un effet de
# bord de la publication.
info "Mise en ligne du front"
mkdir -p "$WEB"
rsync -a --delay-updates --exclude='index.html' dist/ "$WEB/"
install -m 0644 dist/index.html "$WEB/index.html"

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
  if reponse=$(curl -fsS --max-time 5 http://127.0.0.1:3100/api/sante 2>/dev/null); then
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
code=$(curl -s -o /dev/null -w '%{http_code}' https://vitanow.aura-plus.site/)
[[ $code == 200 ]] && vert "  front : HTTP $code" || { rouge "  front : HTTP $code"; exit 1; }

code=$(curl -s -o /dev/null -w '%{http_code}' https://vitanow.aura-plus.site/api/sante)
[[ $code == 200 ]] && vert "  api   : HTTP $code" || { rouge "  api   : HTTP $code"; exit 1; }

code=$(curl -s -o /dev/null -w '%{http_code}' https://manage.aura-plus.site/)
[[ $code == 200 ]] && vert "  admin : HTTP $code" || { rouge "  admin : HTTP $code"; exit 1; }

code=$(curl -s -o /dev/null -w '%{http_code}' https://aura.icpp-conformite.cloud/)
[[ $code == 301 ]] && vert "  redirection historique : HTTP $code" || { rouge "  redirection historique : HTTP $code"; exit 1; }

vert ""
vert "Déploiement terminé — $(git rev-parse --short HEAD)"
