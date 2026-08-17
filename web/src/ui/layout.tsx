import type { ReactNode } from "react";

import { hrefFor, type Route } from "@/app/router";
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/Icon";

/**
 * layout.tsx — la charpente d'un écran applicatif.
 *
 * Un seul composant décide de la largeur, du rembourrage et du rythme
 * vertical de tous les écrans. C'est ce qui évite la dérive classique où
 * chaque écran invente son propre `px-*` et où l'application finit par
 * « bouger » d'un onglet à l'autre (`navigation-consistency`).
 *
 * Mobile d'abord : 16px de gouttière à 375px, 24px dès 640px, largeur bornée
 * au-delà (`adaptive-gutters-by-breakpoint`).
 */

export function Screen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[100rem] px-4 pt-6 sm:px-6 lg:px-8",
        // `fixed-element-offset` : la barre d'onglets basse mesure 68px plus la
        // zone de sécurité. Sans cette réserve, la dernière carte de chaque
        // liste passe dessous et devient intouchable.
        "pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-16",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Écran large — listes denses, tableaux, espace entreprise. */
export function WideScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6",
        "pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-16",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Écran pleine largeur — tableaux de bord et vues de pilotage.
 *
 * `WideScreen` plafonne à 72 rem (1152 px). À côté d'un rail de 15 rem, sur un
 * portable de 1920 px, cela laisse près de 500 px inutilisés : le contenu
 * paraît alors flotter au milieu d'un écran vide, quelle que soit la densité
 * réelle des données.
 *
 * 100 rem (1600 px) est la borne haute retenue. Sans borne du tout, une ligne
 * de texte traverserait un écran ultra-large de bout en bout et deviendrait
 * illisible — le confort de lecture plafonne bien avant la largeur de l'écran.
 * Avec cette valeur, un 1920 px est rempli, et un 2560 px reste lisible.
 */
export function BoardScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[100rem] px-4 pt-6 sm:px-6 lg:px-8",
        "pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-16",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * En-tête d'écran.
 *
 * `retour` n'est pas décoratif : sur les écrans profonds atteints par lien
 * direct (une notification, une URL de soutenance), le geste de retour du
 * navigateur ne suffit pas — il n'y a pas d'historique. Le bouton donne
 * toujours une sortie (`escape-routes`, `back-behavior`).
 */
export function ScreenHead({
  eyebrow,
  titre,
  lede,
  actions,
  retour,
  onRetour,
  className,
}: {
  eyebrow?: string;
  titre: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  retour?: Route;
  onRetour?: (to: Route) => void;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {retour && onRetour && (
        <a
          href={hrefFor(retour)}
          onClick={(event) => {
            event.preventDefault();
            onRetour(retour);
          }}
          className="-ml-2 inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 pl-2 text-caption font-medium text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
        >
          <Icon name="back" size={16} aria-hidden />
          Retour
        </a>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow && <span className="label-eyebrow">{eyebrow}</span>}
          <h1 className="text-balance font-display text-display-3 text-ink sm:text-display-2">
            {titre}
          </h1>
          {lede && <p className="prose-measure text-body text-ink-muted">{lede}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Bloc de section à l'intérieur d'un écran. */
export function Block({
  titre,
  action,
  children,
  className,
}: {
  titre?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-10 flex flex-col gap-4", className)}>
      {(titre || action) && (
        <div className="flex items-baseline justify-between gap-4">
          {titre && <h2 className="font-heading text-heading text-ink">{titre}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Onglets internes à un écran.
 *
 * Distincts de la navigation principale (`nav-hierarchy`) : ils ne changent
 * pas de route, ils filtrent un contenu. Rendus en `role="tablist"` pour que
 * la flèche du clavier fonctionne comme attendu.
 */
export function Tabs<T extends string>({
  valeurs,
  actif,
  onChange,
  className,
}: {
  valeurs: readonly T[];
  actif: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        // Défilement horizontal borné à ce conteneur : la page elle-même ne
        // défile jamais latéralement (`horizontal-scroll`).
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {valeurs.map((v) => {
        const courant = v === actif;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={courant}
            onClick={() => onChange(v)}
            className={cn(
              "h-10 shrink-0 rounded-full border px-4 text-caption font-medium",
              "transition-colors duration-150",
              courant
                ? "border-ink bg-ink text-background"
                : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
            )}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Liste de cartes cliquables — le motif dominant de l'application mobile.
 * Cible tactile pleine largeur, retour de pression par translation d'1px
 * (`press-feedback` sans décalage de mise en page).
 */
export function CardLink({
  href,
  onClick,
  children,
  className,
}: {
  href: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={cn(
        "group block rounded-card border border-border bg-card p-4 sm:p-5",
        "transition-[border-color,box-shadow,transform] duration-150 ease-out",
        "hover:border-border-strong hover:shadow-card active:translate-y-px",
        className,
      )}
    >
      {children}
    </a>
  );
}
