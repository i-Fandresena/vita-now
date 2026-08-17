import { LayoutDashboard, LibraryBig } from "lucide-react";
import {
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";

import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

import type { Notification, ResumptionCapsule } from "@/domain/soa";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { charger, enregistrer } from "@/lib/persistence";
import { useSectionActive } from "@/lib/use-section-active";
import { useVitanow } from "@/app/vitanow-store";
import { useUserTheme } from "@/app/user-theme";
import { PointsCelebration } from "@/features/points/PointsCelebration";
import { BandeauPlateforme } from "@/ui/BandeauPlateforme";
import { BasculeTheme } from "@/ui/BasculeTheme";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
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
  { label: "Projets", name: "projets", route: { name: "projets" }, icon: (props) => <Icon name="folder" size={20} {...props} /> },
  /* « Chercher » plutôt que « Mémoire » : le verbe dit quoi faire. « Mémoire »
     portait la thèse du produit mais laissait l'utilisateur deviner l'usage —
     et un onglet qu'on n'ouvre pas ne sert à rien, si juste soit son nom.
     La route reste `#/memoire` : elle est documentée et liée ailleurs. */
  { label: "Chercher", name: "memoire", route: { name: "memoire" }, icon: LibraryBig },
  { label: "Communauté", name: "communaute", route: { name: "communaute" }, icon: (props) => <Icon name="user" size={20} {...props} /> },
  { label: "Profil", name: "profil", route: { name: "profil" }, icon: (props) => <Icon name="user" size={20} {...props} /> },
];

const COMPANY_NAV: NavItem[] = [
  { label: "Accueil", name: "ent-accueil", route: { name: "ent-accueil" }, icon: (props) => <Icon name="building" size={20} {...props} /> },
  { label: "Talents", name: "ent-talents", route: { name: "ent-talents" }, icon: (props) => <Icon name="user" size={20} {...props} /> },
  {
    label: "Opportunités",
    name: "ent-opportunites",
    route: { name: "ent-opportunites" },
    icon: (props) => <Icon name="folder" size={20} {...props} />,
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

/* Les mouvements narratifs de la landing sont activés explicitement au build.
   En cas de régression, `VITE_LANDING_MOTION=0` conserve le même contenu et la
   même navigation, sans la barre de progression scroll-driven. */
// Même contrat que LandingScreen : actif par défaut, désactivable uniquement
// avec `VITE_LANDING_MOTION=0` pour conserver un retour stable immédiat.
const LANDING_MOTION_ENABLED = import.meta.env.VITE_LANDING_MOTION !== "0";

function LandingScrollProgress() {
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll();
  const progression = useSpring(scrollYProgress, { stiffness: 180, damping: 32, mass: 0.22 });

  if (!LANDING_MOTION_ENABLED || reduced) return null;

  return (
    <motion.span
      aria-hidden
      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary"
      style={{ scaleX: progression }}
    />
  );
}

/**
 * Navigation publique compacte : sur téléphone, les liens et la connexion ne
 * disparaissent plus derrière la largeur de la marque. Une feuille courte
 * garde les cibles faciles à toucher et ne concurrence pas le CTA principal.
 */
function LandingMobileMenu({
  ouvert,
  fermer,
  navigate,
}: {
  ouvert: boolean;
  fermer: () => void;
  navigate: (to: Route) => void;
}) {
  const reduced = useReducedMotion() ?? false;

  const allerSection = (id: string) => {
    fermer();
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }, 0);
  };

  return (
    <AnimatePresence>
      {ouvert && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.button
            type="button"
            aria-label="Fermer le menu"
            onClick={fermer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 h-full w-full bg-ink/35"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation de la landing page"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.98 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.28, ease: EASE.outExpo }}
            className="absolute top-3 right-3 left-3 rounded-card border border-border bg-card p-3 shadow-float"
          >
            <div className="mb-2 flex items-center justify-between px-2 py-1">
              <span className="label-eyebrow text-primary">Navigation</span>
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={fermer}
                className="grid size-11 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <span aria-hidden className="text-title leading-none">×</span>
              </button>
            </div>
            <nav aria-label="Sections de la landing" className="flex flex-col gap-1">
              {LANDING_LINKS.map((lien) => (
                <button
                  key={lien.id}
                  type="button"
                  onClick={() => allerSection(lien.id)}
                  className="flex min-h-12 items-center rounded-sm px-3 text-left text-body font-medium text-ink transition-colors hover:bg-surface"
                >
                  {lien.label}
                </button>
              ))}
            </nav>
            <div className="mt-3 border-t border-border pt-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  fermer();
                  navigate({ name: "connexion" });
                }}
              >
                Se connecter
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Wordmark({
  onClick,
  sousTitre,
  compactMobile = false,
}: {
  onClick?: () => void;
  sousTitre?: string;
  /** La marque garde son emblème sur téléphone pour laisser les actions lisibles. */
  compactMobile?: boolean;
}) {
  return (
    <a
      href={hrefFor({ name: "accueil" })}
      onClick={onClick}
      className="flex shrink-0 items-center gap-3 rounded-sm"
    >
      {/* L'emblème est déjà détouré sur fond transparent : ni cadre, ni fond, ni
          recadrage. Il est contraint en hauteur et non en carré — la source fait
          755×699, donc un `size-*` l'écraserait de 8 %. */}
      <img
        src="/logo-vita-now.png"
        alt=""
        className="h-10 w-auto shrink-0"
      />
      {/* Le mot monte d'un cran sur l'échelle, pas d'une valeur inventée : 32px
          est le barreau suivant après 24 (`--text-display-3`). Les deux tiennent
          dans la barre publique, haute de 72px, et dans le rail de 240px —
          Anton est condensée, « VITA'NOW » y mesure environ 110px. */}
      <span className={cn("flex flex-col leading-none", compactMobile && "hidden sm:flex")}>
        <span className="font-display text-display-3 text-ink">VITA'NOW</span>
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
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden print:hidden",
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

/* ── Carte d'appel du rail ──────────────────────────────────────────────── */

/** Les quatre poses, dans l'ordre du relais. */
const MASCOTTES = [
  "/mascotte1.png",
  "/mascotte2.png",
  "/mascotte3.png",
  "/mascotte4.png",
];

/**
 * La carte illustrée du bas de rail.
 *
 * Elle ne fait pas de promotion — le produit n'a rien à vendre. Elle porte la
 * seule action qui vaille depuis n'importe quel écran, et **cette action change
 * selon l'état réel** : s'il existe un projet en sommeil, la capsule de reprise
 * (M6) ; sinon, la création d'un projet. Une carte fixe qui répéterait le même
 * appel à quelqu'un qui vient de le suivre serait un bandeau publicitaire.
 *
 * Toute la carte est un seul lien. La pastille fléchée est décorative : deux
 * cibles de clic superposées pour la même destination donnent deux tabulations
 * au clavier et un lecteur d'écran qui annonce le lien en double.
 *
 * Elle reste disponible à toutes les hauteurs. Sous 820px, elle adopte une
 * version compacte ; la navigation au-dessus devient défilable si nécessaire.
 * Ainsi la carte ne recouvre jamais une entrée du rail, même sur un portable
 * 1366×768 ou une fenêtre réduite.
 */
function CarteMascotte({
  capsule,
  navigate,
  variant = "student",
}: {
  capsule: ResumptionCapsule | null;
  navigate: (to: Route) => void;
  variant?: "student" | "company";
}) {
  const estEntreprise = variant === "company";
  const cible: Route = estEntreprise
    ? { name: "ent-opportunites-nouveau" }
    : capsule
      ? { name: "reprise" }
      : { name: "projet-nouveau" };
  const titre = estEntreprise
    ? "Lance une annonce"
    : capsule
      ? "Reprends ton projet"
      : "Lance un projet";
  const ligne = estEntreprise
    ? "Un projet, un stage ou une alternance."
    : capsule
      ? capsule.projectTitle
      : "Trois champs suffisent.";

  return (
    <a
      href={hrefFor(cible)}
      onClick={(event) => {
        event.preventDefault();
        navigate(cible);
      }}
      className={cn(
        "panel-aura-pale group relative block overflow-hidden rounded-card p-2",
        "[@media(min-height:820px)]:p-3 [@media(min-height:820px)]:pt-4",
        "transition-shadow duration-150 ease-out hover:shadow-lift",
      )}
    >
      {/* Les quatre poses sont empilées et se relaient. Elles sont toutes
          chargées : ce sont quatre PNG de 40 à 80 ko, et les alterner par le
          `src` d'une seule balise ferait clignoter la carte le temps du
          téléchargement de la pose suivante. */}
      <span
        aria-hidden
        className={cn(
          "mascotte-flotte relative block h-14 w-full [@media(min-height:820px)]:h-24",
          "transition-transform duration-300 ease-out group-hover:-translate-y-1",
          "motion-reduce:transition-none motion-reduce:group-hover:translate-y-0",
        )}
      >
        {MASCOTTES.map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            style={{ "--mascotte": index } as CSSProperties}
            className={cn(
              "mascotte-relais absolute inset-y-0 left-1/2 h-14 w-auto -translate-x-1/2 [@media(min-height:820px)]:h-24",
              // La première pose est celle qui reste sous mouvement réduit.
              index > 0 && "opacity-0",
            )}
          />
        ))}
      </span>

      <div className="mt-2 flex items-center gap-2 rounded-sm bg-card p-2 [@media(min-height:820px)]:mt-3 [@media(min-height:820px)]:p-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-caption font-semibold text-ink">
            {titre}
          </span>
          <span className="block truncate text-caption text-ink-muted">{ligne}</span>
        </span>
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary"
        >
          <Icon name="arrowRight" size={16} />
        </span>
      </div>
    </a>
  );
}

/* ── Rail latéral (desktop) ─────────────────────────────────────────────── */

/**
 * Une ligne du rail. La classe est partagée par les deux groupes : c'est ce qui
 * fait que le second se lit comme de la navigation et non comme un pied de
 * rail. `min-h-11` plutôt que `h-11` — « Classements & Prix » passe sur deux
 * lignes dans 240px, et une hauteur fixe le ferait déborder de sa pastille.
 */
const RAIL_ROW = [
  "flex min-h-11 w-full items-center gap-3 rounded-full px-4 py-2",
  "text-left text-body font-medium leading-tight",
  "transition-colors duration-150",
].join(" ");

function SideRail({
  items,
  secondaires,
  route,
  navigate,
  sousTitre,
  bas,
}: {
  items: NavItem[];
  /**
   * Second groupe de destinations. Il vit dans la même `<nav>` que le premier,
   * séparé par un filet : ce sont des écrans comme les autres, ils n'avaient
   * simplement pas de place dans les cinq onglets du bas (`bottom-nav-limit`),
   * qui est une contrainte du mobile et n'a aucune raison d'amputer le rail.
   */
  secondaires?: (NavItem & { badge?: number })[];
  route: Route;
  navigate: (to: Route) => void;
  sousTitre?: string;
  bas?: ReactNode;
}) {
  /* `activeTab` rattache Notifications à Tableau et Classements à Profil —
     nécessaire pour la barre basse, où ces écrans n'ont pas d'onglet à eux.
     Le rail, lui, les affiche : sans cette correction, ouvrir Notifications
     allumerait Tableau **et** Notifications, soit deux entrées courantes. */
  const surSecondaire = secondaires?.some((s) => s.name === route.name) ?? false;
  const courant = surSecondaire ? route.name : (activeTab(route) ?? route.name);

  const lien = ({ label, name, route: cible, icon: Icon, badge }: NavItem & { badge?: number }) => {
    const actif = courant === name;
    return (
      <li key={name}>
        <a
          href={hrefFor(cible)}
          aria-current={actif ? "page" : undefined}
          aria-label={
            badge && badge > 0
              ? `${label}, ${badge} non lue${badge > 1 ? "s" : ""}`
              : undefined
          }
          onClick={(event) => {
            event.preventDefault();
            navigate(cible);
          }}
          className={cn(
            RAIL_ROW,
            actif
              ? "bg-primary-wash text-primary"
              : "text-ink-muted hover:bg-surface hover:text-ink",
          )}
        >
          <span className="relative shrink-0">
            <Icon aria-hidden className="size-5" />
            {badge !== undefined && badge > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-background"
              />
            )}
          </span>
          {label}
          {badge !== undefined && badge > 0 && (
            <span aria-hidden className="ml-auto text-caption tabular-nums">
              {badge}
            </span>
          )}
        </a>
      </li>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 border-r border-border px-4 py-6 lg:flex print:hidden">
      <div className="px-2">
        <Wordmark sousTitre={sousTitre} />
      </div>

      <nav aria-label="Navigation principale" className="min-h-0 flex-1 overflow-y-auto pr-1">
        <ul className="flex flex-col gap-1">{items.map(lien)}</ul>

        {secondaires && secondaires.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
            {secondaires.map(lien)}
          </ul>
        )}
      </nav>

      <div className="shrink-0">{bas}</div>
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
        "sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md lg:hidden print:hidden",
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
          <Icon name="bell" size={20} aria-hidden />
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
          <Icon name="menu" size={20} aria-hidden />
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
  const {
    me,
    logout,
    unread,
    entreprise: entrepriseSession,
    entrepriseConnectee,
    logoutEntreprise,
  } = useVitanow();
  const reduced = useReducedMotion() ?? false;
  // Entreprise réellement connectée, sans session étudiant : identité et
  // navigation différentes du cas « étudiant qui feuillette la démo ».
  const seulementEntreprise = entrepriseConnectee && entreprise;

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
                {seulementEntreprise ? <Icon name="building" size={20} aria-hidden /> : me.initiales}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body font-medium text-ink">
                  {seulementEntreprise ? entrepriseSession?.nom : me.nom}
                </span>
                <span className="block truncate text-caption text-ink-muted">
                  {seulementEntreprise
                    ? entrepriseSession?.secteur
                    : `${me.niveau} · ${me.filiere}`}
                </span>
              </span>
            </div>

            <ul className="flex flex-col">
              {seulementEntreprise ? (
                <li>
                  <button
                    onClick={() => aller({ name: "ent-profil-edition" })}
                    className="flex h-13 w-full items-center gap-3 rounded-sm px-2 text-body text-ink transition-colors duration-150 hover:bg-surface"
                  >
                    <Icon name="user" size={20} aria-hidden className="shrink-0 text-ink-muted" />
                    Modifier le profil
                  </button>
                </li>
              ) : (
                <>
                  <li>
                    <button
                      onClick={() => aller({ name: "copilote" })}
                      className="flex h-13 w-full items-center gap-3 rounded-sm px-2 text-body text-ink transition-colors duration-150 hover:bg-surface"
                    >
                      <Icon name="sparkle" size={20} aria-hidden className="shrink-0 text-primary" />
                      Copilote IA
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => aller({ name: "notifications" })}
                      className="flex h-13 w-full items-center gap-3 rounded-sm px-2 text-body text-ink transition-colors duration-150 hover:bg-surface"
                    >
                      <Icon name="bell" size={20} aria-hidden className="shrink-0 text-ink-muted" />
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
                      onClick={() => aller({ name: "classements" })}
                      className="flex h-13 w-full items-center gap-3 rounded-sm px-2 text-body text-ink transition-colors duration-150 hover:bg-surface"
                    >
                      <Icon name="trophy" size={20} aria-hidden className="shrink-0 text-primary" />
                      Classements & Prix
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => aller({ name: "profil-edition" })}
                      className="flex h-13 w-full items-center gap-3 rounded-sm px-2 text-body text-ink transition-colors duration-150 hover:bg-surface"
                    >
                      <Icon name="user" size={20} aria-hidden className="shrink-0 text-ink-muted" />
                      Modifier mon profil
                    </button>
                  </li>
                </>
              )}

              {/* `destructive-nav-separation` : la déconnexion change d'état,
                  contrairement à tout ce qui la précède. Elle est séparée. */}
              <li className="mt-2 border-t border-border pt-2">
                <button
                  onClick={() => {
                    fermer();
                    if (seulementEntreprise) {
                      logoutEntreprise();
                    } else {
                      logout();
                    }
                    navigate({ name: "accueil" });
                  }}
                  className="flex h-13 w-full items-center gap-3 rounded-sm px-2 text-body text-destructive transition-colors duration-150 hover:bg-destructive/5"
                >
                  <Icon name="logout" size={20} aria-hidden className="shrink-0" />
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
  copilote: "Copilote IA",
  projets: "Projets",
  memoire: "Chercher",
  communaute: "Communauté",
  profil: "Profil",
};

/* ── Rappel contextuel ─────────────────────────────────────────────────── */

interface MemoireRappels {
  affiches: string[];
  derniereAffichage?: string;
}

function prioriteRappel(notification: Notification): number {
  // Une personne a explicitement demandé de l'aide : ne pas la laisser sous
  // un rappel de routine. Puis viennent les blocages renseignés par l'auteur.
  if (notification.kind === "mentorat" && notification.titre === "Une demande d'aide") return 6;
  if (notification.titre === "Tâche bloquée") return 5;
  if (notification.titre === "Projet à reprendre") return 4;
  if (notification.titre === "Prochaine étape recommandée") return 3;
  if (notification.kind === "evenement") {
    return notification.corps.startsWith("Aujourd'hui") ? 2 : 1;
  }
  return notification.kind === "reprise" ? 1 : 0;
}

/**
 * Le rappel est une note, pas une alerte bloquante : aucun voile, aucune
 * interruption de navigation et une seule apparition pour une même
 * notification. Une nouvelle connexion reçoit une nouvelle recommandation
 * serveur ; un simple rechargement ne la recrée pas. Après son apparition il
 * est marqué lu, mais reste dans l'historique — le popup n'est jamais la seule
 * trace de l'information.
 */
function RappelPostIt({
  notifications,
  studentId,
  actif,
  route,
  marquerLu,
}: {
  notifications: Notification[];
  studentId: string;
  actif: boolean;
  route: Route;
  marquerLu: (id: string) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const [rappel, setRappel] = useState<Notification | null>(null);
  const cle = `rappels-popup:${studentId}`;

  useEffect(() => {
    if (!actif || route.name === "notifications" || rappel) return;

    const memoire = charger<MemoireRappels>(cle) ?? { affiches: [] };
    const limiteFraicheur = Date.now() - 10 * 24 * 60 * 60 * 1_000;
    const candidat = notifications
      .filter(
        (notification) =>
          prioriteRappel(notification) > 0 &&
          !memoire.affiches.includes(notification.id) &&
          new Date(notification.date).getTime() >= limiteFraicheur,
      )
      .sort((a, b) => {
        const priorite = prioriteRappel(b) - prioriteRappel(a);
        return priorite || new Date(b.date).getTime() - new Date(a.date).getTime();
      })[0];
    if (!candidat) return;

    const minuterie = window.setTimeout(() => {
      setRappel(candidat);
      marquerLu(candidat.id);
      enregistrer<MemoireRappels>(cle, {
        affiches: [...memoire.affiches, candidat.id].slice(-80),
        derniereAffichage: new Date().toISOString(),
      });
    }, 1_200);
    return () => window.clearTimeout(minuterie);
  }, [actif, cle, marquerLu, notifications, rappel, route.name]);

  useEffect(() => {
    if (!rappel) return;
    const minuterie = window.setTimeout(() => setRappel(null), 18_000);
    return () => window.clearTimeout(minuterie);
  }, [rappel]);

  const ouvrir = () => {
    const cible = rappel?.cible;
    setRappel(null);
    if (cible?.startsWith("#")) window.location.hash = cible.slice(1);
    else window.location.hash = "/notifications";
  };

  return (
    <AnimatePresence>
      {rappel && (
        <motion.aside
          role="status"
          aria-label="Rappel personnalisé"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, rotate: -1.5 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, rotate: -0.35 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.28, ease: EASE.outExpo }}
          className="fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 border border-accent/60 bg-accent-soft p-5 shadow-float sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[22rem]"
        >
          <span aria-hidden className="absolute -top-2 left-7 size-4 rotate-45 border-t border-l border-accent/60 bg-accent-soft" />
          <div className="relative flex items-start gap-3">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary shadow-card">
              <Icon name={rappel.kind === "evenement" ? "calendar" : "sparkle"} size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold text-ink">Rappel pour toi</p>
              <p className="mt-1 text-body font-semibold text-ink">{rappel.titre}</p>
              <p className="mt-1 text-caption leading-relaxed text-ink-muted">{rappel.corps}</p>
            </div>
            <button
              type="button"
              onClick={() => setRappel(null)}
              className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-card hover:text-ink"
              aria-label="Fermer ce rappel"
            >
              <span aria-hidden className="text-title leading-none">×</span>
            </button>
          </div>
          <div className="relative mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setRappel(null)} className="text-caption font-medium text-ink-muted hover:text-ink">
              Plus tard
            </button>
            <Button variant="primary" size="sm" onClick={ouvrir}>
              Voir maintenant
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export function Shell({ route, navigate, children }: ShellProps) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const espace = spaceOf(route);
  const {
    unread,
    notifications,
    channels,
    hydrated,
    markNotificationRead,
    logout,
    me,
    capsule,
    entreprise: entrepriseSession,
    entrepriseConnectee,
    logoutEntreprise,
  } = useVitanow();
  const identiteTheme =
    espace === "entreprise"
      ? `entreprise:${entrepriseSession?.id ?? "apercu"}`
      : espace === "etudiant"
        ? `etudiant:${me.id}`
        : // L'administration n'a qu'un compte et pas d'identifiant à porter :
          // une clé fixe suffit, et elle reste distincte de celles des espaces
          // applicatifs — la console peut donc rester sombre pendant qu'un
          // étudiant travaille en clair dans un autre onglet.
          espace === "admin"
          ? "admin"
          : null;
  const { theme, changerTheme } = useUserTheme(identiteTheme);

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

  if (espace === "admin") {
    return (
      <div className="min-h-dvh bg-background">
        {skip}
        <BasculeTheme theme={theme} changerTheme={changerTheme} />
        <main id="contenu" tabIndex={-1} className="focus:outline-none">
          {children}
        </main>
      </div>
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
            <Wordmark
              compactMobile
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />

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
                variant="secondary"
                size="sm"
                className="md:hidden"
                aria-label="Ouvrir le menu de navigation"
                aria-expanded={menuOuvert}
                aria-haspopup="dialog"
                onClick={() => setMenuOuvert(true)}
              >
                <Icon name="menu" size={20} aria-hidden />
                Menu
              </Button>
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
          <LandingScrollProgress />
        </motion.header>
        <LandingMobileMenu
          ouvert={menuOuvert}
          fermer={() => setMenuOuvert(false)}
          navigate={navigate}
        />
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

      {!entreprise && (
        <RappelPostIt
          notifications={notifications}
          studentId={me.id}
          // Le corpus local est présent pendant quelques millisecondes avant
          // `/api/etat`. Ne jamais afficher une de ses fausses notifications :
          // son id n'existe pas en base et le marquage « lu » répondrait 404.
          actif={channels.web && hydrated}
          route={route}
          marquerLu={markNotificationRead}
        />
      )}

      {/* M12, hors cadrage — confettis et journal des points fraîchement
          gagnés. Strictement étudiant : voir PointsCelebration.tsx. */}
      {!entreprise && <PointsCelebration />}

      <BasculeTheme theme={theme} changerTheme={changerTheme} />

      {/* Le sous-titre du rail ne sert plus qu'à distinguer l'espace entreprise
          de l'espace étudiant. Côté étudiant il n'y a rien à distinguer : la
          marque suffit, et le rail gagne une ligne. */}
      <SideRail
        items={items}
        secondaires={
          entreprise
            ? undefined
            : [
                {
                  label: "Copilote IA",
                  name: "copilote",
                  route: { name: "copilote" },
                  icon: (props) => <Icon name="sparkle" size={20} {...props} />,
                },
                {
                  label: "Notifications",
                  name: "notifications",
                  route: { name: "notifications" },
                  icon: (props) => <Icon name="bell" size={20} {...props} />,
                  badge: unread,
                },
                {
                  label: "Classements & Prix",
                  name: "classements",
                  route: { name: "classements" },
                  icon: (props) => <Icon name="trophy" size={20} {...props} />,
                },
              ]
        }
        route={route}
        navigate={navigate}
        sousTitre={entreprise ? "Espace entreprise" : undefined}
        bas={
          entreprise ? (
            entrepriseConnectee ? (
              // Entreprise réellement connectée (hors cadrage, addition) :
              // pas de session étudiant vers laquelle « revenir », donc pas de
              // lien de bascule — son identité et sa déconnexion à la place.
              <div className="flex flex-col gap-4">
                <CarteMascotte capsule={null} navigate={navigate} variant="company" />
                <div className="flex flex-col gap-1">
                  <p className="truncate px-2 text-caption font-medium text-ink-muted">
                    {entrepriseSession?.nom}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      logoutEntreprise();
                      navigate({ name: "accueil" });
                    }}
                  >
                    <Icon name="logout" size={16} aria-hidden />
                    Se déconnecter
                  </Button>
                </div>
              </div>
            ) : (
              <CarteMascotte capsule={null} navigate={navigate} variant="company" />
            )
          ) : (
            <div className="flex flex-col gap-4">
              <CarteMascotte capsule={capsule} navigate={navigate} />

              {/* La carte porte l'action de lancement : le rail étudiant reste
                  consacré au projet de l'étudiant, sans accès entreprise. */}
              <div className="flex flex-col gap-1">
                {/* `destructive-nav-separation` : la déconnexion est séparée du
                    reste par un filet. Elle change d'état, contrairement à tout
                    ce qui la précède, et une action qui change d'état ne se
                    colle pas à des liens de navigation. */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-auto justify-start border-t border-border py-3 pt-4"
                  onClick={() => {
                    logout();
                    navigate({ name: "accueil" });
                  }}
                >
                  <Icon name="logout" size={16} aria-hidden />
                  <span className="flex flex-col items-start leading-tight">
                    <span>Se déconnecter</span>
                    <span className="mt-0.5 text-caption font-normal text-ink-muted">
                      ({me.nom.split(" ")[0]})
                    </span>
                  </span>
                </Button>
              </div>
            </div>
          )
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {!entreprise && (
          <AppTopBar
            navigate={navigate}
            unread={unread}
            titre={TITRES[route.name] ?? TITRES[activeTab(route) ?? route.name] ?? "VITA'NOW"}
            onMenu={() => setMenuOuvert(true)}
          />
        )}
        {entreprise && (
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden print:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <Wordmark />
              <Button variant="ghost" size="sm" onClick={() => navigate({ name: "tableau" })}>
                Étudiant
              </Button>
            </div>
          </header>
        )}

        {/* Ce que l'administration a à dire, au-dessus du contenu et sous
            l'en-tête : une annonce déposée depuis la console, et l'état de
            maintenance. Posé ici et nulle part ailleurs — un bandeau global
            monté par écran finirait par manquer à la moitié d'entre eux. */}
        <BandeauPlateforme />

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
