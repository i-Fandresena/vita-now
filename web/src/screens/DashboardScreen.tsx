import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import { joursDepuis, type Project } from "@/domain/soa";
import { cn } from "@/lib/cn";
import { rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Progress, Rhythm, Stat } from "@/ui/data";
import { Icon } from "@/ui/Icon";
import { BoardScreen, CardLink, ScreenHead } from "@/ui/layout";
import { useResumeProjet } from "./ProjectScreens";

/**
 * Tableau de bord — le « QG » que la landing promet.
 *
 * Deux corrections par rapport à la version précédente, et elles vont
 * ensemble.
 *
 * **La largeur.** L'écran tenait dans une colonne de 896 px. Sur un portable
 * de 1440 px, une fois le rail de navigation retiré, cela laissait près de
 * 300 px de vide de chaque côté — et un tableau de bord entouré de vide donne
 * l'impression d'un produit vide, quelle que soit la richesse de ses données.
 *
 * **Ce qu'il montrait.** Il ignorait la moitié de ce que l'API renvoie déjà
 * dans le même appel : notifications, points, badges. Ces données étaient
 * chargées, puis jetées.
 *
 * D'où la disposition en deux colonnes au-delà de 1024 px : à gauche ce sur
 * quoi on agit — la reprise, les projets en cours ; à droite ce qu'on
 * consulte — le rythme, les chiffres, les alertes. L'ordre de lecture mobile
 * reste celui d'avant, parce qu'il était juste : la reprise d'abord, le reste
 * après (`content-priority`).
 */

function heureDuJour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

/* ── Impulsion du jour ─────────────────────────────────────────────────── */

function empreinte(texte: string): number {
  return Array.from(texte).reduce((total, caractere) => ((total * 31) + caractere.charCodeAt(0)) >>> 0, 7);
}

function citationContextuelle({
  prenom,
  projet,
  debutant,
  termines,
  tour,
}: {
  prenom: string;
  projet?: string;
  debutant: boolean;
  termines: number;
  tour: number;
}): string {
  /* Ce n'est pas une liste qui s'épuise : les débuts, les gestes et les
     aboutissements se combinent. Le contexte réel (premier projet, projet
     actif, parcours déjà mené) détermine également le ton de la phrase. */
  const debuts = debutant
    ? [
        "Un premier geste suffit pour donner une direction à une idée.",
        "Commencer petit est déjà une façon de construire grand.",
        "Le projet que tu ouvres aujourd'hui peut devenir ta meilleure preuve demain.",
      ]
    : termines > 0
      ? [
          "Tu sais déjà terminer : aujourd'hui, il suffit de reprendre ce savoir-faire.",
          "Chaque projet abouti t'a laissé une méthode que tu peux réutiliser maintenant.",
          "Ce que tu as déjà mené au bout rend le prochain pas plus crédible.",
        ]
      : [
          "La régularité transforme une intention en projet visible.",
          "Un projet avance quand une idée trouve un prochain geste concret.",
          "Une petite avancée documentée vaut mieux qu'une grande intention gardée pour demain.",
        ];
  const gestes = [
    "Choisis le geste qui réduit l'incertitude, puis donne-lui vingt minutes.",
    "Cherche la prochaine preuve, pas la perfection du plan.",
    "Quand le chemin semble flou, avance jusqu'à la prochaine question utile.",
    "Une tâche claire aujourd'hui libère plus d'énergie qu'une longue liste demain.",
    "Fais de la place au brouillon : c'est souvent là que la solution commence.",
    "Le rythme gagne contre l'élan quand l'élan fatigue.",
    "Une décision modeste prise maintenant a plus de valeur qu'une option idéale remise à plus tard.",
  ];
  const ancrages = projet
    ? [
        `${projet} n'a pas besoin d'être parfait pour devenir plus solide aujourd'hui.`,
        `Sur ${projet}, une action vérifiable vaut mieux qu'une promesse vague.`,
        `Même ${projet} avance dès que tu transformes son prochain doute en essai.`,
      ]
    : [
        `Ton futur projet commence par une décision simple, ${prenom}.`,
        `L'idée la plus utile est souvent celle à laquelle tu donnes une première forme, ${prenom}.`,
        `Tu n'as pas besoin de tout voir pour créer la première étape, ${prenom}.`,
      ];
  const graine = empreinte(`${new Date().toDateString()}-${prenom}-${projet ?? "nouveau"}`);
  const choix = (liste: string[], decalage: number) => liste[(graine + tour * 17 + decalage) % liste.length]!;
  const variantes = [
    `${choix(debuts, 0)} ${choix(gestes, 1)}`,
    `${choix(ancrages, 2)} ${choix(gestes, 3)}`,
    `${choix(gestes, 4)} ${choix(debuts, 5)}`,
  ];
  return variantes[(graine + tour * 11) % variantes.length]!;
}

/**
 * Bannière pleine largeur, en tête d'écran — la forme d'origine, remise en
 * place à la demande. Le bouton « Une autre idée » relance la rotation sans
 * attendre : la citation évolue déjà d'elle-même à chaque nouvelle session,
 * mais quelqu'un qui n'accroche pas à la phrase du jour n'a pas à la subir
 * jusqu'au lendemain.
 */
function CitationDuJour({
  studentId,
  prenom,
  projet,
  debutant,
  termines,
  reduced,
}: {
  studentId: string;
  prenom: string;
  projet?: string;
  debutant: boolean;
  termines: number;
  reduced: boolean;
}) {
  const cle = `vitanow:citation:${new Date().toDateString()}:${studentId}`;
  const [tour, setTour] = useState(() => {
    try {
      const session = `${cle}:session`;
      const precedent = Number(window.localStorage.getItem(cle) ?? 0) || 0;
      /* Une session navigateur ne change pas la citation à chaque retour sur
         le tableau, mais une nouvelle session de cet étudiant la fait évoluer
         automatiquement. La clé contient son identifiant : deux comptes sur
         le même poste ne se partagent jamais leur rotation. */
      if (window.sessionStorage.getItem(session) !== null) return precedent;
      const prochain = precedent + 1;
      window.localStorage.setItem(cle, String(prochain));
      window.sessionStorage.setItem(session, String(prochain));
      return prochain;
    } catch {
      return 0;
    }
  });
  const citation = citationContextuelle({ prenom, projet, debutant, termines, tour });

  const changer = () => {
    setTour((precedent) => {
      const prochain = precedent + 1;
      try {
        window.localStorage.setItem(cle, String(prochain));
      } catch {
        // Le changement de citation reste fonctionnel si le stockage est bloqué.
      }
      return prochain;
    });
  };

  return (
    <motion.section
      variants={rise}
      className="relative overflow-hidden rounded-card border border-primary/25 bg-[linear-gradient(120deg,color-mix(in_oklab,var(--color-primary)_13%,var(--color-card)),var(--color-card)_52%,color-mix(in_oklab,var(--color-accent)_19%,var(--color-card)))] p-5 shadow-card sm:p-6"
      aria-label="Impulsion du jour"
    >
      <motion.span
        aria-hidden
        className="absolute -right-8 -top-10 size-36 rounded-full bg-primary/10 blur-2xl"
        animate={reduced ? undefined : { x: [0, -12, 0], y: [0, 10, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        aria-hidden
        className="absolute -bottom-16 right-[22%] size-28 rounded-full bg-accent/20 blur-2xl"
        animate={reduced ? undefined : { x: [0, 15, 0], y: [0, -9, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <span className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-primary">
            <Icon name="sparkle" size={15} aria-hidden />
            Impulsion du jour
          </span>
          <p className="mt-3 font-heading text-xl leading-snug text-ink sm:text-2xl">
            « {citation} »
          </p>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0 self-start sm:self-auto" onClick={changer}>
          <Icon name="sparkle" size={15} aria-hidden className="text-primary" />
          Une autre idée
        </Button>
      </div>
    </motion.section>
  );
}

/* ── La reprise — ce qui passe avant tout ───────────────────────────────── */

function CarteReprise({ navigate }: { navigate: (to: Route) => void }) {
  const { capsule, projects } = useSoa();
  const projetDormant = projects.find((p) => p.id === capsule?.projectId);
  // Hook appelé sans condition (règle de React) : `useResumeProjet` gère
  // lui-même l'absence de projet. Un seul appel par visite du tableau de
  // bord — le widget le plus visible de l'appli, pas une liste de cartes.
  const { resume, resumeSource } = useResumeProjet(projetDormant, true);

  if (!capsule) return null;

  const jours = joursDepuis(capsule.lastActivity);

  // Checklist réelle du projet endormi : combien de tâches restent à faire,
  // pas une estimation. Sert de repli si le résumé IA n'est pas disponible.
  const checklist = projetDormant?.checklist ?? [];
  const restantes = checklist.filter((e) => !e.fait).length;

  // « Assistant IA » n'est affiché comme tel que si le message vient
  // réellement d'un modèle (Gemini/Claude) — même règle de vérité que le
  // pied de page du bloc Résumé sur la page projet (`resumeSource`). Sinon,
  // le message reste réel (checklist ou blocage du journal), juste sans
  // prétendre à un appel modèle qui n'a pas eu lieu.
  const estIA = resumeSource !== "journal";
  const messageAssistant = estIA
    ? resume?.pourquoi
    : restantes > 0
      ? `${restantes} tâche${restantes > 1 ? "s" : ""} pas encore finie${restantes > 1 ? "s" : ""} sur ${capsule.projectTitle}. On s'y met ?`
      : null;

  return (
    <motion.section
      variants={rise}
      className="rounded-card border border-primary/25 bg-primary-wash p-5 sm:p-6"
    >
      {messageAssistant && (
        <a
          href={hrefFor({ name: "projet", id: capsule.projectId })}
          onClick={(e) => {
            e.preventDefault();
            navigate({ name: "projet", id: capsule.projectId });
          }}
          className="mb-4 flex flex-col gap-2 rounded-card border border-border bg-card p-4 shadow-float transition-colors duration-150 hover:border-border-strong"
        >
          <span className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-primary">
            <Icon name="sparkle" size={14} aria-hidden />
            Assistant{estIA ? " IA" : ""}
          </span>
          <p className="text-body text-ink">« {messageAssistant} »</p>
          <span className="flex items-center gap-1 text-caption font-medium text-primary">
            Reprendre {capsule.projectTitle}
            <Icon name="arrowRight" size={14} aria-hidden />
          </span>
        </a>
      )}

      <div className="flex items-center gap-2">
        <Icon name="clock" size={16} aria-hidden className="text-primary" />
        {/* Le nombre de jours est un fait, pas un reproche : pas de gros
            caractères, pas de « déjà », pas de point d'exclamation. */}
        <span className="text-caption font-medium text-primary">
          En sommeil depuis {jours} jour{jours > 1 ? "s" : ""}
        </span>
      </div>

      <h2 className="mt-3 font-heading text-heading text-ink">{capsule.projectTitle}</h2>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="text-caption text-ink-muted">Ce qui bloquait</p>
          <p className="mt-1 text-body text-ink">{capsule.blocking}</p>
        </div>
        <div className="rounded-sm bg-card p-4">
          <p className="text-caption text-ink-muted">
            Le prochain pas — {capsule.nextStep.minutes} minutes
          </p>
          <p className="mt-1 text-body text-ink">{capsule.nextStep.action}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => navigate({ name: "reprise" })}>
          Reprendre
        </Button>
        <Button variant="secondary" onClick={() => navigate({ name: "memoire" })}>
          <Icon name="search" size={16} aria-hidden />
          Chercher ce blocage
        </Button>
      </div>
    </motion.section>
  );
}

/* ── Une ligne de projet ────────────────────────────────────────────────── */

function LigneProjet({
  projet,
  navigate,
}: {
  projet: Project;
  navigate: (to: Route) => void;
}) {
  const { progressOf } = useSoa();
  const jours = joursDepuis(projet.derniereActivite);

  return (
    <CardLink
      href={hrefFor({ name: "projet", id: projet.id })}
      onClick={() => navigate({ name: "projet", id: projet.id })}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-body font-semibold text-ink">{projet.nom}</h3>
        <Icon
          name="arrowRight"
          size={16}
          aria-hidden
          className="mt-0.5 shrink-0 text-ink-muted transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </div>

      <ChipRow className="mt-3">
        <Chip tone={projet.status === "En cours" ? "primary" : "neutral"}>
          {projet.status}
        </Chip>
        {projet.technos[0] && <Chip>{projet.technos[0]}</Chip>}
      </ChipRow>

      <Progress
        className="mt-4"
        valeur={progressOf(projet.id)}
        libelle="Avancement"
        origine={`Déduit du journal · dernière entrée il y a ${jours} j`}
      />
    </CardLink>
  );
}

/* ── Colonne de droite : ce qu'on consulte ──────────────────────────────── */

function Alertes({ navigate }: { navigate: (to: Route) => void }) {
  const { notifications, unread } = useSoa();
  const recentes = notifications.slice(0, 3);

  return (
    <motion.section
      variants={rise}
      className="rounded-card border border-border bg-card p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-heading text-ink">Notifications</h2>
        {unread > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-caption text-on-primary">
            {unread}
          </span>
        )}
      </div>

      {recentes.length > 0 ? (
        <>
          <ul className="mt-4 flex flex-col gap-3">
            {recentes.map((n) => (
              <li key={n.id} className="flex gap-3">
                <Icon
                  name="bell"
                  size={16}
                  aria-hidden
                  className={cn(
                    "mt-0.5 shrink-0",
                    n.lu ? "text-ink-muted" : "text-primary",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-caption font-medium text-ink">
                    {n.titre}
                  </span>
                  <span className="line-clamp-2 block text-caption text-ink-muted">
                    {n.corps}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Button
            variant="quiet"
            size="sm"
            className="mt-4 px-0"
            onClick={() => navigate({ name: "notifications" })}
          >
            Tout voir
          </Button>
        </>
      ) : (
        <p className="mt-3 text-caption text-ink-muted">
          Rien de neuf. C'est une bonne nouvelle : personne n'attend après toi.
        </p>
      )}
    </motion.section>
  );
}

/**
 * Les points SOA, ici en lecture seule et sans classement.
 *
 * Leur place naturelle reste le profil (SPEC.md §2bis les tient hors du chemin
 * de travail). Ce bloc n'en montre que le total, sans comparaison ni rang :
 * une information sur soi, pas une position par rapport aux autres.
 */
function Reconnaissance({ navigate }: { navigate: (to: Route) => void }) {
  const { me, pointsOf, analytics } = useSoa();

  return (
    <motion.section
      variants={rise}
      className="rounded-card border border-accent bg-accent-soft p-5"
    >
      <div className="flex items-center gap-2">
        <Icon name="trophy" size={16} aria-hidden className="text-on-accent" />
        <h2 className="font-heading text-heading text-on-accent">Ton parcours</h2>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-display-2 tabular-nums text-on-accent">
          {pointsOf(me.id)}
        </span>
        <span className="text-caption text-on-accent/80">points</span>
      </div>

      <p className="mt-2 text-caption text-on-accent/80">
        Gagnés en terminant un projet, en aidant un pair, en partageant une
        solution ou en documentant une erreur.
      </p>

      {analytics.projetsTermines > 0 && (
        <p className="mt-3 text-caption text-on-accent">
          {analytics.projetsTermines} projet
          {analytics.projetsTermines > 1 ? "s" : ""} mené
          {analytics.projetsTermines > 1 ? "s" : ""} jusqu'au bout.
        </p>
      )}

      <Button
        variant="quiet"
        size="sm"
        className="mt-3 px-0 text-on-accent"
        onClick={() => navigate({ name: "profil" })}
      >
        Voir le détail
      </Button>
    </motion.section>
  );
}

/* ── Écran ──────────────────────────────────────────────────────────────── */

export function DashboardScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { myProjects, analytics, capsule, me } = useSoa();
  const reduced = useReducedMotion() ?? false;

  const actifs = myProjects.filter(
    (p) => p.status === "En cours" || p.status === "En pause",
  );
  /* Le prénom vient de la session, pas du corpus : modifier son nom dans son
     profil — ou se connecter avec un autre compte — doit changer qui l'écran
     salue. */
  const prenom = me.nom.split(" ")[0] ?? me.nom;

  /* Aucun projet du tout — compte neuf, ou tous archivés. L'état se lit sur
     `myProjects` et non sur `actifs` : quelqu'un dont les projets sont tous
     terminés a bien un rythme et des chiffres à montrer. */
  const debutant = myProjects.length === 0;

  return (
    <BoardScreen>
      <ScreenHead
        eyebrow={heureDuJour()}
        titre={<>{prenom}.</>}
        lede={
          debutant
            ? "Rien ici pour l'instant. Un projet commencé aujourd'hui aura un journal demain."
            : capsule
              ? "Un projet t'attend. Le reste peut attendre."
              : "Aucun projet en sommeil. Tout est à jour."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate({ name: "copilote" })}
            >
              <Icon name="sparkle" size={16} aria-hidden className="text-primary" />
              Copilote IA
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate({ name: "classements" })}
            >
              <Icon name="trophy" size={16} aria-hidden className="text-primary" />
              Classements & Prix
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate({ name: "calendrier" })}
            >
              <Icon name="calendar" size={16} aria-hidden className="text-primary" />
              Calendrier
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate({ name: "projet-nouveau" })}
            >
              <Icon name="plus" size={16} aria-hidden />
              Nouveau projet
            </Button>
          </div>
        }
      />

      <motion.div
        variants={sequence(reduced ? 0 : 0.05)}
        initial="hidden"
        animate="visible"
        className="mt-8 flex flex-col gap-6"
      >
        <CitationDuJour
          studentId={me.id}
          prenom={prenom}
          projet={capsule?.projectTitle ?? actifs[0]?.nom}
          debutant={debutant}
          termines={analytics.projetsTermines}
          reduced={reduced}
        />

        {/* La reprise garde toute la largeur : c'est la seule chose de l'écran
            sur laquelle on agit tout de suite, et la réduire à une colonne la
            ferait passer pour une carte parmi d'autres. */}
        <CarteReprise navigate={navigate} />

        {/* Deux tiers pour l'action, un tiers pour la consultation.
            Au-delà de 1536 px, la colonne de gauche est élargie encore : à
            cette largeur, une carte de projet à 1000 px devient une bande, et
            mieux vaut rendre l'espace à ce qu'on lit qu'à ce qu'on consulte. */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start 2xl:grid-cols-[1.9fr_1fr]">
          {/* ── Colonne d'action ── */}
          <div className="flex flex-col gap-6">
            <motion.section variants={rise}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-heading text-heading text-ink">En cours</h2>
                <a
                  href={hrefFor({ name: "projets" })}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate({ name: "projets" });
                  }}
                  className="rounded-sm text-caption font-medium text-primary underline-offset-4 hover:underline"
                >
                  Tous les projets
                </a>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {actifs.length > 0 ? (
                  actifs.map((p) => (
                    <LigneProjet key={p.id} projet={p} navigate={navigate} />
                  ))
                ) : (
                  <div className="rounded-card border border-border bg-surface p-6">
                    <p className="text-body text-ink">
                      {debutant
                        ? "Ton premier projet t'attend."
                        : "Aucun projet en cours."}
                    </p>
                    <p className="mt-1 text-body text-ink-muted">
                      Reprendre un projet arrêté coûte moins cher que d'en commencer un.
                    </p>
                    {/* Les deux sorties sont côte à côte sur un compte neuf : le
                        bouton « Nouveau projet » de l'en-tête est loin du pouce
                        sur un téléphone, et c'est ici que la question se pose. */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {debutant && (
                        <Button
                          variant="primary"
                          onClick={() => navigate({ name: "projet-nouveau" })}
                        >
                          Commencer un projet
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => navigate({ name: "renaissance" })}
                      >
                        Voir les projets à reprendre
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>

            {!debutant && (
              <motion.section
                variants={rise}
                className="rounded-card border border-border bg-card p-5 sm:p-6"
              >
                <Rhythm valeurs={analytics.rythme} libelle="Ton rythme d'écriture" />
                <p className="mt-4 text-caption text-ink-muted">
                  Une colonne par semaine — une entrée de journal, une décision,
                  une erreur documentée. Une semaine vide est une information,
                  pas une faute.
                </p>
              </motion.section>
            )}
          </div>

          {/* ── Colonne de consultation ── */}
          <div className="flex flex-col gap-6">
            {!debutant && (
              <motion.section variants={rise}>
                <h2 className="font-heading text-heading text-ink">Où tu en es</h2>
                {/* Deux colonnes même sur grand écran : cette colonne est
                    étroite, et quatre tuiles en ligne y deviendraient des
                    timbres-poste illisibles. */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Stat valeur={analytics.projetsCommences} libelle="Projets" />
                  <Stat
                    valeur={analytics.projetsTermines}
                    libelle="Terminés"
                    ton="success"
                    detail={`sur ${analytics.projetsCommences}`}
                  />
                  <Stat valeur={analytics.entreesJournal} libelle="Entrées" />
                  <Stat
                    valeur={
                      <span className="text-title font-semibold">
                        {analytics.technoPrincipale}
                      </span>
                    }
                    libelle="Techno"
                  />
                </div>
                {analytics.progressionMoyenne > 0 && (
                  <div className="mt-3 rounded-card border border-border bg-card p-4">
                    <Progress
                      valeur={analytics.progressionMoyenne}
                      libelle="Progression moyenne"
                      origine="Sur les projets non terminés"
                    />
                  </div>
                )}
              </motion.section>
            )}

            <Alertes navigate={navigate} />

            {!debutant && <Reconnaissance navigate={navigate} />}

            <motion.section variants={rise}>
              <CardLink
                href={hrefFor({ name: "renaissance" })}
                onClick={() => navigate({ name: "renaissance" })}
              >
                <div className="flex items-start gap-3">
                  <Icon name="sparkle" size={20} aria-hidden className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <h3 className="font-heading text-heading text-ink">Renaissance</h3>
                    <p className="mt-1 text-caption text-ink-muted">
                      Des projets arrêtés par d'autres attendent. Leur journal et
                      leur raison d'abandon sont déjà écrits — tu ne repars pas
                      de zéro.
                    </p>
                  </div>
                </div>
              </CardLink>
            </motion.section>
          </div>
        </div>
      </motion.div>
    </BoardScreen>
  );
}
