import { useEffect, useState } from "react";

import { useSoa } from "@/app/soa-store";
import { cn } from "@/lib/cn";
import { charger, enregistrer } from "@/lib/persistence";
import { Icon } from "@/ui/Icon";

/**
 * BandeauPlateforme — ce que l'administration a à dire à tout le monde.
 *
 * Deux choses, jamais plus : une annonce déposée depuis la console
 * (`platform_settings.annonce`) et l'état de maintenance. Toutes deux viennent
 * de `/api/etat` et suivent donc le cycle de l'état — poser une annonce la
 * fait apparaître au prochain chargement, la retirer la fait disparaître.
 *
 * La maintenance est **prévenue, pas appliquée** ici : c'est le serveur qui
 * refuse les écritures (`server.ts`, garde `onRequest`), et lui seul. Le
 * bandeau évite seulement à quelqu'un de découvrir le refus au bas d'un
 * formulaire qu'il vient de remplir. Il ne se ferme donc pas — il décrit un
 * état en cours, pas un message qu'on a fini de lire.
 *
 * L'annonce, elle, se ferme. Un bandeau qu'on ne peut pas écarter et qui
 * reste des jours devient du décor : on le renvoie une fois par contenu, et
 * la mémoire porte sur le contenu lui-même, de sorte qu'une **nouvelle**
 * annonce revient même si la précédente avait été écartée.
 */

/** Clé de mémoire : le contenu, pas un identifiant — voir plus haut. */
const CLE_ANNONCE = "annonce-ecartee";

export function BandeauPlateforme() {
  const { annonce, maintenance } = useSoa();
  const empreinte = annonce ? `${annonce.ton}|${annonce.titre}|${annonce.corps}` : null;
  const [ecartee, setEcartee] = useState<string | null>(null);

  /* Lu après le premier rendu : `charger` touche `localStorage`, qui n'existe
     pas au rendu serveur et qu'on ne veut pas lire à chaque passage. */
  useEffect(() => {
    setEcartee(charger<string>(CLE_ANNONCE));
  }, []);

  const afficherAnnonce = Boolean(empreinte) && empreinte !== ecartee;

  if (!maintenance && !afficherAnnonce) return null;

  const alerte = annonce?.ton === "alerte";

  return (
    <div className="flex flex-col gap-2 px-4 pt-3 lg:px-8 print:hidden">
      {maintenance && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-card border border-destructive/40 bg-destructive/5 px-4 py-3"
        >
          <Icon name="alertTriangle" size={18} aria-hidden className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-caption leading-relaxed text-ink">
            <span className="font-semibold">Maintenance en cours.</span>{" "}
            La consultation reste ouverte, mais les enregistrements sont
            momentanément suspendus — un brouillon écrit maintenant ne sera pas
            conservé.
          </p>
        </div>
      )}

      {afficherAnnonce && annonce && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-card border px-4 py-3",
            alerte
              ? "border-destructive/40 bg-destructive/5"
              : "border-primary/30 bg-primary-wash",
          )}
        >
          <Icon
            name={alerte ? "alertTriangle" : "sparkle"}
            size={18}
            aria-hidden
            className={cn("mt-0.5 shrink-0", alerte ? "text-destructive" : "text-primary")}
          />
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold text-ink">{annonce.titre}</p>
            <p className="mt-0.5 text-caption leading-relaxed text-ink-muted">{annonce.corps}</p>
          </div>
          <button
            type="button"
            aria-label="Masquer cette annonce"
            onClick={() => {
              if (!empreinte) return;
              enregistrer(CLE_ANNONCE, empreinte);
              setEcartee(empreinte);
            }}
            className="-my-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-card hover:text-ink"
          >
            <span aria-hidden className="text-title leading-none">×</span>
          </button>
        </div>
      )}
    </div>
  );
}
