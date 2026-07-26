import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Button } from "@/ui/Button";
import { hrefFor, isAppRoute, type Route } from "./router";

/**
 * Le chrome du produit — deux chromes, pas un.
 *
 * DESIGN.md : la landing et l'application ne s'adressent pas à la même
 * personne. La landing parle à quelqu'un qui ne connaît pas SOA et doit être
 * convaincu ; l'application parle à quelqu'un qui a un projet en cours et veut
 * y retourner. Les faire partager un en-tête forcerait l'un des deux à porter
 * la navigation de l'autre.
 */

interface ShellProps {
  route: Route;
  navigate: (to: Route) => void;
  children: ReactNode;
}

const APP_LINKS: { label: string; route: Route }[] = [
  { label: "Chercher", route: { name: "recherche" } },
  { label: "Reprise", route: { name: "reprise" } },
  { label: "Déposer", route: { name: "depot" } },
];

/** Ancres de la landing — sections de la page, pas des routes. */
const LANDING_LINKS = [
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Comment ça marche", href: "#methode" },
  { label: "Communauté", href: "#communaute" },
  { label: "FAQ", href: "#faq" },
];

function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <a
      href={hrefFor({ name: "accueil" })}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-sm"
    >
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-sm bg-primary font-display text-body text-on-primary"
      >
        S
      </span>
      <span className="font-display text-heading text-ink">SOA</span>
    </a>
  );
}

export function Shell({ route, navigate, children }: ShellProps) {
  const inApp = isAppRoute(route);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-6 focus:left-6 focus:z-50 focus:rounded-sm focus:bg-card focus:px-4 focus:py-2 focus:text-caption focus:shadow-lift"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="page-measure flex h-18 items-center justify-between gap-6">
          <Wordmark
            onClick={
              inApp
                ? undefined
                : // Sur la landing, le logo ramène en haut sans recharger la route.
                  () => window.scrollTo({ top: 0, behavior: "smooth" })
            }
          />

          {inApp ? (
            <>
              <nav aria-label="Principale" className="flex items-center gap-1">
                {APP_LINKS.map((link) => {
                  const current = link.route.name === route.name;
                  return (
                    <a
                      key={link.label}
                      href={hrefFor(link.route)}
                      aria-current={current ? "page" : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        navigate(link.route);
                      }}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-caption font-medium transition-colors duration-150",
                        current
                          ? "bg-primary-wash text-primary"
                          : "text-ink-muted hover:bg-surface hover:text-ink",
                      )}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </nav>
              <span
                aria-label="Compte de démonstration"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-caption font-semibold text-on-accent"
              >
                S
              </span>
            </>
          ) : (
            <>
              <nav
                aria-label="Sections"
                className="hidden items-center gap-1 md:flex"
              >
                {LANDING_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-full px-3.5 py-2 text-caption font-medium text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate({ name: "recherche" })}
              >
                Commencer
              </Button>
            </>
          )}
        </div>
      </header>

      <main
        id="contenu"
        tabIndex={-1}
        className={cn("flex-1 focus:outline-none", inApp && "page-measure")}
      >
        {children}
      </main>

      {inApp && (
        <footer className="page-measure py-10">
          <p className="label-eyebrow">ENI Fianarantsoa — corpus interne</p>
        </footer>
      )}
    </div>
  );
}
