import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { hrefFor, type Route } from "./router";

/**
 * Le chrome du produit — volontairement presque absent.
 *
 * PRODUCT.md:74 : l'accueil doit être « presque vide ». Une barre haute qui se
 * fait remarquer contredirait cette promesse dès la première seconde. Elle
 * porte donc trois choses et rien de plus : le nom, le retour à la recherche,
 * les deux gestes que l'on peut faire hors recherche.
 */

interface ShellProps {
  route: Route;
  navigate: (to: Route) => void;
  children: ReactNode;
}

const LINKS: { label: string; route: Route }[] = [
  { label: "Reprise", route: { name: "reprise" } },
  { label: "Déposer", route: { name: "depot" } },
];

export function Shell({ route, navigate, children }: ShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:rounded-control focus:bg-raised focus:px-4 focus:py-2 focus:text-caption"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-30 border-b border-line-faint bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[76rem] items-center justify-between px-6 lg:px-10">
          <a
            href={hrefFor({ name: "recherche" })}
            className="rounded-control font-display text-[1.0625rem] tracking-tight text-bone transition-colors duration-90 hover:text-bone-2"
          >
            Aura++
          </a>

          <nav aria-label="Principale" className="flex items-center gap-1">
            {LINKS.map((link) => {
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
                    "rounded-control px-3 py-2 text-caption transition-colors duration-90",
                    current ? "text-bone" : "text-bone-3 hover:text-bone",
                  )}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>
      </header>

      <main
        id="contenu"
        tabIndex={-1}
        className="mx-auto w-full max-w-[76rem] flex-1 px-6 focus:outline-none lg:px-10"
      >
        {children}
      </main>

      <footer className="mx-auto w-full max-w-[76rem] px-6 py-10 lg:px-10">
        <p className="label-archive text-bone-4">
          ENI Fianarantsoa — corpus interne
        </p>
      </footer>
    </div>
  );
}
