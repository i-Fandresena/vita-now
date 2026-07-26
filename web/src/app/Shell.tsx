import {
  Bell,
  Building2,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  UserRound,
  Users,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { useSoa } from "@/app/soa-store";
import { Button } from "@/ui/Button";
import { activeTab, hrefFor, spaceOf, type Route } from "./router";

/**
 * Shell.tsx — la navigation, en trois chromes distincts.
 *
 * Le cadrage décrit trois publics qui ne se ressemblent pas : un visiteur qui
 * ne connaît pas SOA, un étudiant qui a un projet en cours, une entreprise qui
 * cherche des profils. Leur imposer une même barre forcerait deux d'entre eux
 * à porter la navigation du troisième.
 *
 * L'espace étudiant est **mobile d'abord** :
 *   · < 1024px  barre d'onglets basse, cinq entrées, icône + libellé
 *   · ≥ 1024px  rail latéral persistant, même ordre, même vocabulaire
 *
 * C'est la règle `adaptive-navigation` : les grands écrans préfèrent un rail,
 * les petits une barre basse — mais la structure ne change pas, seule sa
 * projection change. Un utilisateur qui passe du téléphone au projecteur
 * retrouve les mêmes cinq destinations, dans le même ordre.
 */

interface ShellProps {
  route: Route;
  navigate: (to: Route) => void;
  children: ReactNode;
}

interface NavItem {
  label: string;
  name: Route["name"];
  route: Route;
  icon: ComponentType<{ className?: string }>;
}

/** `bottom-nav-limit` : cinq entrées, pas six. */
const STUDENT_NAV: NavItem[] = [
  { label: "Tableau", name: "tableau", route: { name: "tableau" }, icon: LayoutDashboard },
  { label: "Projets", name: "projets", route: { name: "projets" }, icon: FolderKanban },
  { label: "Mémoire", name: "memoire", route: { name: "memoire" }, icon: LibraryBig },
  { label: "Communauté", name: "communaute", route: { name: "communaute" }, icon: Users },
  { label: "Profil", name: "profil", route: { name: "profil" }, icon: UserRound },
];

const COMPANY_NAV: NavItem[] = [
  { label: "Accueil", name: "ent-accueil", route: { name: "ent-accueil" }, icon: Building2 },
  { label: "Talents", name: "ent-talents", route: { name: "ent-talents" }, icon: Users },
  {
    label: "Opportunités",
    name: "ent-opportunites",
    route: { name: "ent-opportunites" },
    icon: FolderKanban,
  },
  {
    label: "Challenges",
    name: "ent-challenges",
    route: { name: "ent-challenges" },
    icon: LibraryBig,
  },
  {
    label: "Prototypes",
    name: "ent-marketplace",
    route: { name: "ent-marketplace" },
    icon: LayoutDashboard,
  },
];

const UNIVERSITY_NAV: NavItem[] = [
  {
    label: "Suivi",
    name: "univ-accueil",
    route: { name: "univ-accueil" },
    icon: GraduationCap,
  },
];

const LANDING_LINKS = [
  { label: "Le problème", href: "#probleme" },
  { label: "Comment ça marche", href: "#methode" },
  { label: "Communauté", href: "#communaute" },
  { label: "FAQ", href: "#faq" },
];

function Wordmark({ onClick, sousTitre }: { onClick?: () => void; sousTitre?: string }) {
  return (
    <a
      href={hrefFor({ name: "accueil" })}
      onClick={onClick}
      className="flex shrink-0 items-center gap-2.5 rounded-sm"
    >
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-sm bg-primary font-display text-body text-on-primary"
      >
        S
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-heading text-ink">SOA</span>
        {sousTitre && (
          <span className="text-caption text-ink-muted">{sousTitre}</span>
        )}
      </span>
    </a>
  );
}

/* ── Barre d'onglets basse (mobile) ─────────────────────────────────────── */

function TabBar({
  items,
  route,
  navigate,
}: {
  items: NavItem[];
  route: Route;
  navigate: (to: Route) => void;
}) {
  const courant = activeTab(route) ?? route.name;

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden",
        // `safe-area-awareness` : sur les téléphones à barre de geste, sans ce
        // rembourrage les onglets tombent sous l'indicateur système.
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="flex">
        {items.map(({ label, name, route: cible, icon: Icon }) => {
          const actif = courant === name;
          return (
            <li key={name} className="min-w-0 flex-1">
              <a
                href={hrefFor(cible)}
                aria-current={actif ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(cible);
                }}
                className={cn(
                  // 56px de haut : au-delà du minimum de 44px, parce qu'un
                  // onglet se vise au pouce, souvent en marchant.
                  "flex h-14 flex-col items-center justify-center gap-1 px-1",
                  "transition-colors duration-150",
                  actif ? "text-primary" : "text-ink-muted",
                )}
              >
                <Icon
                  className={cn("size-5 shrink-0", actif && "scale-105")}
                  aria-hidden
                />
                {/* `nav-label-icon` : jamais d'icône seule — une icône sans
                    libellé se devine, et se devine mal. */}
                <span className="w-full truncate text-center text-[0.6875rem] font-medium leading-none">
                  {label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ── Rail latéral (desktop) ─────────────────────────────────────────────── */

function SideRail({
  items,
  route,
  navigate,
  sousTitre,
  bas,
}: {
  items: NavItem[];
  route: Route;
  navigate: (to: Route) => void;
  sousTitre?: string;
  bas?: ReactNode;
}) {
  const courant = activeTab(route) ?? route.name;

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 border-r border-border px-4 py-6 lg:flex">
      <div className="px-2">
        <Wordmark sousTitre={sousTitre} />
      </div>

      <nav aria-label="Navigation principale" className="min-h-0 flex-1">
        <ul className="flex flex-col gap-1">
          {items.map(({ label, name, route: cible, icon: Icon }) => {
            const actif = courant === name;
            return (
              <li key={name}>
                <a
                  href={hrefFor(cible)}
                  aria-current={actif ? "page" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(cible);
                  }}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-full px-4 text-body font-medium",
                    "transition-colors duration-150",
                    actif
                      ? "bg-primary-wash text-primary"
                      : "text-ink-muted hover:bg-surface hover:text-ink",
                  )}
                >
                  <Icon aria-hidden className="size-5 shrink-0" />
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {bas}
    </aside>
  );
}

/* ── En-tête applicatif (mobile) ────────────────────────────────────────── */

function AppTopBar({
  navigate,
  unread,
  titre,
}: {
  navigate: (to: Route) => void;
  unread: number;
  titre: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md lg:hidden",
        "pt-[env(safe-area-inset-top)]",
      )}
    >
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <span className="font-display text-heading text-ink">{titre}</span>

        <button
          onClick={() => navigate({ name: "notifications" })}
          aria-label={
            unread > 0
              ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}`
              : "Notifications"
          }
          className="relative grid size-11 place-items-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
        >
          <Bell aria-hidden className="size-5" />
          {unread > 0 && (
            // `tab-badge` : la pastille dit qu'il y a du nouveau, le compte
            // exact est dans l'aria-label — un chiffre à 8px ne se lit pas.
            <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </button>
      </div>
    </header>
  );
}

/* ── Shell ──────────────────────────────────────────────────────────────── */

const TITRES: Partial<Record<Route["name"], string>> = {
  tableau: "Tableau",
  projets: "Projets",
  memoire: "Mémoire",
  communaute: "Communauté",
  profil: "Profil",
};

export function Shell({ route, navigate, children }: ShellProps) {
  const espace = spaceOf(route);
  const { unread, logout } = useSoa();

  const skip = (
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-sm focus:bg-card focus:px-4 focus:py-2 focus:text-caption focus:shadow-lift"
    >
      Aller au contenu
    </a>
  );

  /* Landing publique — en-tête marketing, pas de navigation applicative. */
  if (espace === "public") {
    return (
      <div className="flex min-h-dvh flex-col">
        {skip}
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="page-measure flex h-16 items-center justify-between gap-6">
            <Wordmark onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
            <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
              {LANDING_LINKS.map((lien) => (
                <a
                  key={lien.href}
                  href={lien.href}
                  className="rounded-full px-3.5 py-2 text-caption font-medium text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
                >
                  {lien.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate({ name: "connexion" })}
              >
                Se connecter
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate({ name: "inscription" })}
              >
                Commencer
              </Button>
            </div>
          </div>
        </header>
        <main id="contenu" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    );
  }

  const entreprise = espace === "entreprise";
  const universite = espace === "universite";
  const items = entreprise ? COMPANY_NAV : universite ? UNIVERSITY_NAV : STUDENT_NAV;
  const sousTitre = entreprise
    ? "Espace entreprise"
    : universite
      ? "Espace universitaire"
      : "ENI Fianarantsoa";

  return (
    <div className="flex min-h-dvh">
      {skip}

      <SideRail
        items={items}
        route={route}
        navigate={navigate}
        sousTitre={sousTitre}
        bas={
          entreprise || universite ? (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => navigate({ name: "tableau" })}
            >
              ← Espace étudiant
            </Button>
          ) : (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => navigate({ name: "notifications" })}
                className="flex h-11 items-center gap-3 rounded-full px-4 text-body font-medium text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
              >
                <span className="relative">
                  <Bell aria-hidden className="size-5" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-background" />
                  )}
                </span>
                Notifications
                {unread > 0 && (
                  <span className="ml-auto text-caption tabular-nums text-ink-muted">
                    {unread}
                  </span>
                )}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => navigate({ name: "ent-accueil" })}
              >
                Espace entreprise →
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => navigate({ name: "univ-accueil" })}
              >
                Espace universitaire →
              </Button>
              {/* `destructive-nav-separation` : la déconnexion est séparée du
                  reste de la navigation, jamais collée à un onglet. */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 justify-start border-t border-border pt-4"
                onClick={() => {
                  logout();
                  navigate({ name: "accueil" });
                }}
              >
                <LogOut aria-hidden className="size-4" />
                Se déconnecter
              </Button>
            </div>
          )
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {!entreprise && (
          <AppTopBar
            navigate={navigate}
            unread={unread}
            titre={TITRES[activeTab(route) ?? route.name] ?? "SOA"}
          />
        )}
        {(entreprise || universite) && (
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <Wordmark />
              <Button variant="ghost" size="sm" onClick={() => navigate({ name: "tableau" })}>
                Étudiant
              </Button>
            </div>
          </header>
        )}

        <main id="contenu" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
      </div>

      <TabBar items={items} route={route} navigate={navigate} />
    </div>
  );
}
