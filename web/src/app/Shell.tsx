import {
  Bell,
  Building2,
  FolderKanban,
  LayoutDashboard,
  LibraryBig,
  UserRound,
  Users,
  LogOut,
  Menu,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { useSectionActive } from "@/lib/use-section-active";
import { useVitanow } from "@/app/vitanow-store";
import { Button } from "@/ui/Button";
import { activeTab, estEcranNu, hrefFor, spaceOf, type Route } from "./router";

/**
 * Shell.tsx — la navigation, en trois chromes distincts.
 *
 * Le cadrage décrit trois publics qui ne se ressemblent pas : un visiteur qui
 * ne connaît pas VITA'NOW, un étudiant qui a un projet en cours, une entreprise qui
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
  /* « Chercher » plutôt que « Mémoire » : le verbe dit quoi faire. « Mémoire »
     portait la thèse du produit mais laissait l'utilisateur deviner l'usage —
     et un onglet qu'on n'ouvre pas ne sert à rien, si juste soit son nom.
     La route reste `#/memoire` : elle est documentée et liée ailleurs. */
  { label: "Chercher", name: "memoire", route: { name: "memoire" }, icon: LibraryBig },
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

const LANDING_LINKS = [
  { label: "Le problème", id: "probleme" },
  { label: "Comment ça marche", id: "methode" },
  { label: "Communauté", id: "communaute" },
  { label: "FAQ", id: "faq" },
];

/** Les ancres suivies par la barre publique, dans l'ordre de la page. */
const LANDING_IDS = LANDING_LINKS.map((lien) => lien.id);

function Wordmark({
  onClick,
  sousTitre,
}: {
  onClick?: () => void;
  sousTitre?: string;
}) {
  return (
    <a
      href={hrefFor({ name: "accueil" })}
      onClick={onClick}
      className="flex shrink-0 items-center gap-2.5 rounded-sm"
    >
      {/* L'emblème est déjà détouré sur fond transparent : ni cadre, ni fond, ni
          recadrage. Il est contraint en hauteur et non en carré — la source fait
          755×699, donc un `size-*` l'écraserait de 8 %. */}
      <img
        src="/logo-vita-now.png"
        alt=""
        className="h-8 w-auto shrink-0"
      />
      <span className="flex flex-col leading-none">
        <span className="font-display text-heading text-ink">VITA'NOW</span>
        {sousTitre && <span className="text-caption text-ink-muted">{sousTitre}</span>}
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
  onMenu,
}: {
  navigate: (to: Route) => void;
  unread: number;
  titre: string;
  onMenu: () => void;
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

        <div className="flex items-center">
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

        {/* Le seul accès mobile à la déconnexion et au changement d'espace.
            Sans lui, ces gestes n'existaient que dans le rail desktop. */}
        <button
          onClick={onMenu}
          aria-label="Ouvrir le menu"
          aria-haspopup="dialog"
          className="grid size-11 place-items-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
        >
          <Menu aria-hidden className="size-5" />
        </button>
        </div>
      </div>
    </header>
  );
}


/**
 * Menu mobile — ce que le rail latéral porte, et que la barre d'onglets ne
 * peut pas porter.
 *
 * La barre basse est plafonnée à cinq entrées (`bottom-nav-limit`), et ces
 * cinq places vont aux destinations principales. Tout le reste — déconnexion,
 * changement d'espace, notifications — n'avait donc **aucun point d'entrée
 * sous 1024px** : un utilisateur mobile ne pouvait tout simplement pas se
 * déconnecter, ni rejoindre l'espace entreprise.
 *
 * Une feuille plutôt qu'un menu déroulant : à cette largeur, un menu ancré au
 * coin supérieur droit ouvre ses éléments à l'endroit le plus difficile à
 * atteindre au pouce. La feuille arrive par le bas, là où la main se trouve.
 */
function MenuMobile({
  ouvert,
  fermer,
  navigate,
  entreprise,
}: {
  ouvert: boolean;
  fermer: () => void;
  navigate: (to: Route) => void;
  entreprise: boolean;
}) {
  const { me, logout, unread } = useVitanow();
  const reduced = useReducedMotion() ?? false;

  /* Le défilement de la page derrière la feuille est bloqué tant qu'elle est
     ouverte : sans cela, faire glisser la feuille entraîne la page dessous. */
  useEffect(() => {
    if (!ouvert) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = avant;
    };
  }, [ouvert]);

  /* Échap ferme, comme tout ce qui se superpose (`modal-escape`). */
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert, fermer]);

  const aller = (to: Route) => {
    fermer();
    navigate(to);
  };

  return (
    <AnimatePresence>
      {ouvert && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Voile : il isole le contenu et sert de zone de fermeture. */}
          <motion.button
            aria-label="Fermer le menu"
            onClick={fermer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 h-full w-full bg-ink/40"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", duration: 0.42, bounce: 0.08 }}
            className={cn(
              "absolute inset-x-0 bottom-0 rounded-t-card border-t border-border bg-background",
              "px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
            )}
          >
            {/* Poignée : elle dit que l'objet vient du bas et peut y retourner. */}
            <span
              aria-hidden
              className="mx-auto mb-4 block h-1 w-10 rounded-full bg-border-strong"
            />

            <div className="mb-4 flex items-center gap-3 px-2">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-wash font-semibold text-primary">
                {me.initiales}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body font-medium text-ink">
                  {me.nom}
                </span>
                <span className="block truncate text-caption text-ink-muted">
                  {me.niveau} · {me.filiere}
                </span>
              </span>
            </div>

            <ul className="flex flex-col">
              <li>
                <button
                  onClick={() => aller({ name: "notifications" })}
                  className="flex h-13 w-full items-center gap-3 rounded-sm px-2 text-body text-ink transition-colors duration-150 hover:bg-surface"
                >
                  <Bell aria-hidden className="size-5 shrink-0 text-ink-muted" />
                  Notifications
                  {unread > 0 && (
                    <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-caption text-on-primary">
                      {unread}
                    </span>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => aller({ name: "profil-edition" })}
                  className="flex h-13 w-full items-center gap-3 rounded-sm px-2 text-body text-ink transition-colors duration-150 hover:bg-surface"
                >
                  <UserRound aria-hidden className="size-5 shrink-0 text-ink-muted" />
                  Modifier mon profil
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    aller(entreprise ? { name: "tableau" } : { name: "ent-accueil" })
                  }
                  className="flex h-13 w-full items-center gap-3 rounded-sm px-2 text-body text-ink transition-colors duration-150 hover:bg-surface"
                >
                  <Building2 aria-hidden className="size-5 shrink-0 text-ink-muted" />
                  {entreprise ? "Espace étudiant" : "Espace entreprise"}
                </button>
              </li>

              {/* `destructive-nav-separation` : la déconnexion change d'état,
                  contrairement à tout ce qui la précède. Elle est séparée. */}
              <li className="mt-2 border-t border-border pt-2">
                <button
                  onClick={() => {
                    fermer();
                    logout();
                    navigate({ name: "accueil" });
                  }}
                  className="flex h-13 w-full items-center gap-3 rounded-sm px-2 text-body text-destructive transition-colors duration-150 hover:bg-destructive/5"
                >
                  <LogOut aria-hidden className="size-5 shrink-0" />
                  Se déconnecter
                </button>
              </li>
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Shell ──────────────────────────────────────────────────────────────── */

const TITRES: Partial<Record<Route["name"], string>> = {
  tableau: "Tableau",
  projets: "Projets",
  memoire: "Chercher",
  communaute: "Communauté",
  profil: "Profil",
};

export function Shell({ route, navigate, children }: ShellProps) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const espace = spaceOf(route);
  const { unread, logout, me } = useVitanow();

  /* Appelé sans condition, comme tout hook — mais avec une liste vide hors de
     la landing, ce qui démonte l'observateur au lieu de le laisser tourner sur
     des écrans qui n'ont aucune de ces sections. */
  const sectionActive = useSectionActive(espace === "public" ? LANDING_IDS : []);

  const skip = (
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-sm focus:bg-card focus:px-4 focus:py-2 focus:text-caption focus:shadow-lift"
    >
      Aller au contenu
    </a>
  );

  /* Écran nu — la connexion. Elle porte sa propre marque et sa propre sortie ;
     lui ajouter la barre marketing offrirait quatre ancres vers des arguments
     de vente à quelqu'un qui a déjà décidé d'entrer. */
  if (estEcranNu(route)) {
    return (
      <>
        {skip}
        <main id="contenu" tabIndex={-1} className="focus:outline-none">
          {children}
        </main>
      </>
    );
  }

  /* Landing publique — en-tête marketing, pas de navigation applicative. */
  if (espace === "public") {
    return (
      <div className="flex min-h-dvh flex-col">
        {skip}
        {/* Barre publique — posée à même la page, sans conteneur.
            La référence ne met ni pilule, ni fond contrasté, ni filet : la
            marque, les liens et les deux actions flottent directement sur
            l'aplat de la page. Le seul habillage est le fond translucide, et il
            n'est là que pour une raison fonctionnelle — au défilement, du texte
            passe dessous et une barre réellement transparente deviendrait
            illisible. En haut de page, où la référence se juge, le rendu est
            identique à un fond nu. */}
        <motion.header
          className="sticky top-0 z-30 bg-background/85 backdrop-blur-md"
          /* La barre descend de sa propre hauteur à l'ouverture. Elle est le
             premier élément peint : la voir se poser situe le haut de la page
             avant même que le héros ait fini d'arriver. */
          initial={{ y: -72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: EASE.outExpo }}
        >
          <div className="page-measure flex h-18 items-center gap-6">
            <Wordmark onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

            {/* Les liens se rangent contre la marque, pas au centre : c'est ce
                qui laisse le vide de la référence entre eux et les actions. */}
            <nav aria-label="Sections" className="hidden flex-1 items-center gap-1 md:flex">
              {LANDING_LINKS.map((lien) => {
                const courant = sectionActive === lien.id;

                return (
                  <a
                    key={lien.id}
                    href={`#${lien.id}`}
                    aria-current={courant ? "true" : undefined}
                    className={cn(
                      "relative rounded-full px-3.5 py-2 text-caption font-medium",
                      "transition-colors duration-150",
                      courant ? "text-ink" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {/* La pastille active glisse d'un lien à l'autre au lieu de
                        se rallumer sur place. Un seul `layoutId` partagé par les
                        quatre liens suffit : Framer Motion reconnaît le même
                        élément d'un lien à l'autre et anime le déplacement. Elle
                        est **derrière** le libellé — d'où `-z-10` — sans quoi
                        elle le recouvrirait pendant le trajet. */}
                    {courant && (
                      <motion.span
                        aria-hidden
                        layoutId="nav-section-active"
                        className="absolute inset-0 -z-10 rounded-full bg-surface"
                        transition={{ type: "spring", stiffness: 380, damping: 34 }}
                      />
                    )}
                    {lien.label}
                  </a>
                );
              })}
            </nav>

            {/* Les deux boutons de la référence : le premier en pilule claire
                bordée, le second plein. C'est le seul endroit de la barre où la
                hiérarchie se lit — d'où deux boutons, et non un bouton et un
                lien nu. */}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="quiet"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate({ name: "connexion" })}
              >
                Se connecter
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate({ name: "tableau" })}
              >
                Commencer
              </Button>
            </div>
          </div>
        </motion.header>
        <main id="contenu" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    );
  }

  const entreprise = espace === "entreprise";
  const items = entreprise ? COMPANY_NAV : STUDENT_NAV;

  return (
    <div className="flex min-h-dvh">
      {skip}

      <SideRail
        items={items}
        route={route}
        navigate={navigate}
        sousTitre={entreprise ? "Espace entreprise" : "ENI Fianarantsoa"}
        bas={
          entreprise ? (
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
              {/* `destructive-nav-separation` : la déconnexion est séparée du
                  reste par un filet. Elle change d'état, contrairement à tout
                  ce qui la précède, et une action qui change d'état ne se colle
                  pas à des liens de navigation. */}
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
                Se déconnecter ({me.nom.split(" ")[0]})
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
            titre={TITRES[activeTab(route) ?? route.name] ?? "VITA'NOW"}
            onMenu={() => setMenuOuvert(true)}
          />
        )}
        {entreprise && (
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

      <MenuMobile
        ouvert={menuOuvert}
        fermer={() => setMenuOuvert(false)}
        navigate={navigate}
        entreprise={entreprise}
      />
    </div>
  );
}
