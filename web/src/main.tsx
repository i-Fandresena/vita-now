import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./index.css";

/*
 * Lors d'une publication, le navigateur peut avoir conservé un `index.html`
 * ou un import dynamique qui pointe vers un ancien fichier hashé. Vite émet
 * `vite:preloadError` dans ce cas : un rechargement unique récupère la version
 * cohérente sans laisser l'utilisateur face à un écran blanc.
 *
 * La garde `sessionStorage` évite toute boucle si une autre erreur se cache
 * derrière le chargement. Le déploiement conserve également les anciens assets
 * (voir scripts/deploy-frontend.sh), ce mécanisme reste donc un filet de
 * sécurité, pas la seule stratégie de disponibilité.
 */
const BUNDLE_RECOVERY_KEY = "vitanow:bundle-recovery";

function recoverStaleBundle() {
  const page = window.location.href;
  if (window.sessionStorage.getItem(BUNDLE_RECOVERY_KEY) === page) return;
  window.sessionStorage.setItem(BUNDLE_RECOVERY_KEY, page);
  window.location.reload();
}

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  recoverStaleBundle();
});

window.addEventListener("unhandledrejection", (event) => {
  const message = String(event.reason?.message ?? event.reason ?? "");
  if (!/(dynamically imported module|ChunkLoadError|Loading chunk|module script)/i.test(message)) return;
  event.preventDefault();
  recoverStaleBundle();
});

const container = document.getElementById("root");
if (!container) throw new Error("#root introuvable");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
