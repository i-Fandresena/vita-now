import { motion } from "framer-motion";
import {
  Award,
  Bell,
  Briefcase,
  Building2,
  ExternalLink,
  ListOrdered,
  Lock,
} from "lucide-react";
import { useState } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import {
  BADGES,
  COMPANIES,
  CURRENT_STUDENT,
  CURRENT_STUDENT_ID,
  MENTORS,
  OPPORTUNITIES,
  RELIABILITY,
  studentById,
} from "@/data/soa-corpus";
import { joursDepuis, type LeaderboardKind, type Notification } from "@/domain/soa";
import { cn } from "@/lib/cn";
import { rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Avatar, Progress, Stat } from "@/ui/data";
import { Block, CardLink, Screen, ScreenHead, Tabs } from "@/ui/layout";
import { EmptyState } from "@/ui/states";
import { ProjectRow } from "./ProjectScreens";

/**
 * ProfileScreens.tsx — profil, portfolio, reconnaissance, notifications,
 * opportunités (M1, M11, M12, M16, M20, M13).
 *
 * Décision structurante, tirée de SPEC.md §2bis : **les badges et le
 * classement vivent ici, et nulle part ailleurs.** Ni sur le tableau de bord,
 * ni sur un projet, ni dans la reprise. Le cadrage les demande ; la lettre
 * source dit qu'ils n'ont jamais suffi. Les cantonner à un onglet qu'on ouvre
 * volontairement est la seule façon de tenir les deux.
 */

const ONGLETS = ["Projets", "Compétences", "Reconnaissance"] as const;

export function ProfileScreen({
  id,
  navigate,
}: {
  id?: string;
  navigate: (to: Route) => void;
}) {
  const { projects } = useSoa();
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]>("Projets");

  const etudiant = id ? studentById(id) : CURRENT_STUDENT;
  const moi = !id || id === CURRENT_STUDENT_ID;

  if (!etudiant) {
    return (
      <Screen>
        <EmptyState title="Profil introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const siens = projects.filter((p) => p.ownerId === etudiant.id);
  const termines = siens.filter((p) => p.status === "Terminé").length;
  const arretes = siens.filter((p) => p.status === "Abandonné").length;
  const mentor = MENTORS.find((m) => m.studentId === etudiant.id);
  const badgesObtenus = BADGES.filter((b) => b.obtenuLe);

  return (
    <Screen>
      <ScreenHead
        titre={moi ? "Profil" : etudiant.nom}
        retour={moi ? undefined : { name: "communaute" }}
        onRetour={navigate}
        actions={
          moi && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate({ name: "opportunites" })}
              >
                <Briefcase aria-hidden className="size-4" />
                Opportunités
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate({ name: "portfolio", id: etudiant.id })}
              >
                Portfolio
              </Button>
            </>
          )
        }
      />

      <section className="mt-6 flex flex-col gap-4 rounded-card border border-border bg-card p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <Avatar initiales={etudiant.initiales} nom={etudiant.nom} taille="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-title font-semibold text-ink">{etudiant.nom}</h2>
          <p className="mt-1 text-body text-ink-muted">
            {etudiant.niveau} · {etudiant.filiere}
          </p>
          <p className="mt-0.5 text-caption text-ink-muted">
            {etudiant.universite} · promo {etudiant.promo}
          </p>
          <ChipRow className="mt-3">
            {mentor && <Chip tone="primary">Mentor</Chip>}
            {etudiant.disponibilites.map((d) => (
              <Chip key={d}>{d}</Chip>
            ))}
          </ChipRow>
        </div>
      </section>

      <div className="mt-4 rounded-card border border-border bg-surface p-5">
        <p className="label-eyebrow">Objectif</p>
        <p className="mt-1 text-body text-ink">{etudiant.objectifs}</p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat valeur={siens.length} libelle="Projets" />
        <Stat valeur={termines} libelle="Terminés" ton="success" />
        <Stat valeur={arretes} libelle="Arrêtés" detail="documentés" />
      </div>

      <Tabs valeurs={ONGLETS} actif={onglet} onChange={setOnglet} className="mt-8" />

      {onglet === "Projets" && (
        <div className="mt-6 flex flex-col gap-3">
          {siens.length > 0 ? (
            siens.map((p) => <ProjectRow key={p.id} projet={p} navigate={navigate} />)
          ) : (
            <EmptyState title="Aucun projet public" body="Rien à afficher pour l'instant." />
          )}
        </div>
      )}

      {onglet === "Compétences" && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="rounded-card border border-border bg-card p-5 sm:p-6">
            <h3 className="font-heading text-heading text-ink">Technologies</h3>
            <div className="mt-4 flex flex-col gap-4">
              {etudiant.technos.map((t) => (
                <div key={t.nom}>
                  <Progress
                    valeur={t.maitrise * 25}
                    libelle={t.nom}
                    origine={
                      ["Découverte", "Pratiqué", "À l'aise", "Avancé"][t.maitrise - 1]
                    }
                  />
                  {/* E9 — la validation par une entreprise est une preuve, pas
                      une décoration : elle porte le nom de qui l'a signée. */}
                  {t.valideePar && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-caption text-success">
                      <Award aria-hidden className="size-3.5" />
                      Validé par {t.valideePar}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-border bg-card p-5 sm:p-6">
            <h3 className="font-heading text-heading text-ink">Centres d'intérêt</h3>
            <ChipRow className="mt-4">
              {etudiant.interets.map((i) => (
                <Chip key={i}>{i}</Chip>
              ))}
            </ChipRow>
          </div>
        </div>
      )}

      {onglet === "Reconnaissance" && (
        <div className="mt-6 flex flex-col gap-6">
          {/* L'avertissement n'est pas de la modestie : il dit à quoi sert
              cet onglet et à quoi il ne sert pas. */}
          <p className="rounded-card border border-border bg-surface p-4 text-caption text-ink-muted">
            Ces éléments ne pilotent rien. Aucun écran de reprise ne les affiche,
            aucune notification ne s'appuie dessus. Ils décrivent ce qui a été
            fait — ils ne servent pas à faire avancer.
          </p>

          <div className="rounded-card border border-border bg-card p-5 sm:p-6">
            <h3 className="font-heading text-heading text-ink">Badges</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {BADGES.map((b) => {
                const obtenu = Boolean(b.obtenuLe);
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "flex gap-3 rounded-sm border p-4",
                      obtenu
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-surface opacity-70",
                    )}
                  >
                    {obtenu ? (
                      <Award aria-hidden className="mt-0.5 size-4 shrink-0 text-on-accent" />
                    ) : (
                      <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-body font-medium",
                          obtenu ? "text-on-accent" : "text-ink-muted",
                        )}
                      >
                        {b.nom}
                      </p>
                      <p className="mt-0.5 text-caption text-ink-muted">{b.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-caption text-ink-muted">
              {badgesObtenus.length} sur {BADGES.length} obtenus.
            </p>
          </div>

          <CardLink
            href={hrefFor({ name: "classements" })}
            onClick={() => navigate({ name: "classements" })}
          >
            <div className="flex items-center gap-3">
              <ListOrdered aria-hidden className="size-5 shrink-0 text-ink-muted" />
              <div>
                <p className="text-body font-medium text-ink">Classements</p>
                <p className="text-caption text-ink-muted">
                  Par progression, contribution, projets terminés.
                </p>
              </div>
            </div>
          </CardLink>
        </div>
      )}
    </Screen>
  );
}

/* ── M11 — Classements ──────────────────────────────────────────────────── */

const CLASSEMENTS: { cle: LeaderboardKind; libelle: string; unite: string }[] = [
  { cle: "progression", libelle: "Régularité", unite: "" },
  { cle: "contribution", libelle: "Entraide", unite: "" },
  { cle: "projets", libelle: "Projets terminés", unite: "" },
];

export function LeaderboardScreen({ navigate }: { navigate: (to: Route) => void }) {
  const [type, setType] = useState<LeaderboardKind>("progression");

  const lignes = [...RELIABILITY]
    .map((r) => ({
      student: studentById(r.studentId)!,
      valeur:
        type === "progression"
          ? r.regularite
          : type === "contribution"
            ? r.entraide
            : r.projetsTermines,
    }))
    .filter((l) => l.student)
    .sort((a, b) => b.valeur - a.valeur);

  const actif = CLASSEMENTS.find((c) => c.cle === type)!;

  return (
    <Screen>
      <ScreenHead
        eyebrow="M11"
        titre="Classements"
        lede="Le cadrage les demande. La lettre de Soa dit qu'ils n'ont jamais suffi. Ils sont donc ici, et seulement ici."
        retour={{ name: "profil" }}
        onRetour={navigate}
      />

      <Tabs
        valeurs={CLASSEMENTS.map((c) => c.libelle)}
        actif={actif.libelle}
        onChange={(l) => setType(CLASSEMENTS.find((c) => c.libelle === l)!.cle)}
        className="mt-6"
      />

      <ol className="mt-6 flex flex-col gap-2">
        {lignes.map((l, index) => {
          const moi = l.student.id === CURRENT_STUDENT_ID;
          return (
            <li key={l.student.id}>
              <a
                href={hrefFor({ name: "profil", id: l.student.id })}
                onClick={(e) => {
                  e.preventDefault();
                  navigate({ name: "profil", id: l.student.id });
                }}
                className={cn(
                  "flex items-center gap-4 rounded-card border p-4 transition-colors duration-150",
                  moi
                    ? "border-primary bg-primary-wash"
                    : "border-border bg-card hover:border-border-strong",
                )}
              >
                {/* Pas de podium, pas de médaille : un rang numéroté et rien
                    de plus. Le premier n'a pas de couronne. */}
                <span className="w-6 shrink-0 text-right font-display text-title tabular-nums text-ink-muted">
                  {index + 1}
                </span>
                <Avatar initiales={l.student.initiales} nom={l.student.nom} taille="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-ink">
                    {l.student.nom}
                    {moi && <span className="ml-2 text-caption text-primary">toi</span>}
                  </p>
                  <p className="text-caption text-ink-muted">
                    {l.student.niveau} · {l.student.filiere}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums text-body font-semibold text-ink">
                  {l.valeur}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}

/* ── M16 — Portfolio ────────────────────────────────────────────────────── */

export function PortfolioScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const { projects, journalFor } = useSoa();
  const etudiant = studentById(id);

  if (!etudiant) {
    return (
      <Screen>
        <EmptyState title="Portfolio introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const siens = projects.filter((p) => p.ownerId === etudiant.id);
  const termines = siens.filter((p) => p.status === "Terminé");
  const arretes = siens.filter((p) => p.status === "Abandonné");
  const entrees = siens.reduce((n, p) => n + journalFor(p.id).length, 0);

  return (
    <Screen>
      <ScreenHead
        eyebrow="Portfolio public"
        titre={etudiant.nom}
        lede={`${etudiant.niveau} · ${etudiant.filiere} · ${etudiant.universite}`}
        retour={{ name: "profil" }}
        onRetour={navigate}
        actions={
          <Button variant="secondary">
            <ExternalLink aria-hidden className="size-4" />
            Copier le lien
          </Button>
        }
      />

      <p className="mt-6 rounded-card border border-border bg-surface p-5 text-body text-ink">
        {etudiant.objectifs}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat valeur={termines.length} libelle="Livrés" ton="success" />
        <Stat valeur={arretes.length} libelle="Arrêtés" detail="documentés" />
        <Stat valeur={entrees} libelle="Décisions écrites" />
      </div>

      <Block titre="Projets livrés">
        <div className="flex flex-col gap-3">
          {termines.length > 0 ? (
            termines.map((p) => <ProjectRow key={p.id} projet={p} navigate={navigate} />)
          ) : (
            <EmptyState
              title="Aucun projet livré"
              body="Le portfolio se remplit tout seul à mesure que des projets passent en « Terminé »."
            />
          )}
        </div>
      </Block>

      {/* Montrer les projets arrêtés dans un portfolio est un choix : le
          cadrage en fait une ressource (M15), et une impasse documentée dit
          d'un candidat quelque chose qu'un CV ne dit jamais. */}
      {arretes.length > 0 && (
        <Block titre="Projets arrêtés, et pourquoi">
          <div className="flex flex-col gap-3">
            {arretes.map((p) => (
              <div key={p.id} className="rounded-card border border-border bg-card p-5">
                <h3 className="text-body font-semibold text-ink">{p.nom}</h3>
                <p className="mt-2 text-body text-ink-muted">{p.raisonAbandon}</p>
                <ChipRow className="mt-3">
                  {p.technos.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </ChipRow>
              </div>
            ))}
          </div>
          <p className="text-caption text-ink-muted">
            Un projet arrêté et documenté vaut mieux qu'un projet arrêté et caché.
          </p>
        </Block>
      )}

      <Block titre="Compétences">
        <div className="rounded-card border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            {etudiant.technos.map((t) => (
              <div key={t.nom}>
                <Progress
                  valeur={t.maitrise * 25}
                  libelle={t.nom}
                  origine={["Découverte", "Pratiqué", "À l'aise", "Avancé"][t.maitrise - 1]}
                />
                {t.valideePar && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-caption text-success">
                    <Award aria-hidden className="size-3.5" />
                    Validé par {t.valideePar}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Block>
    </Screen>
  );
}

/* ── M20 — Notifications ────────────────────────────────────────────────── */

const ICONE_NOTIF: Record<Notification["kind"], typeof Bell> = {
  reprise: Bell,
  forum: Bell,
  challenge: Bell,
  opportunite: Briefcase,
  signal: Award,
  mentorat: Bell,
};

export function NotificationsScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { notifications, markNotificationRead, markAllRead, unread } = useSoa();

  return (
    <Screen>
      <ScreenHead
        titre="Notifications"
        retour={{ name: "tableau" }}
        onRetour={navigate}
        actions={
          unread > 0 && (
            <Button variant="secondary" onClick={markAllRead}>
              Tout marquer comme lu
            </Button>
          )
        }
      />

      <motion.ul
        variants={sequence()}
        initial="hidden"
        animate="visible"
        className="mt-6 flex flex-col gap-3"
      >
        {notifications.map((n) => {
          const Icone = ICONE_NOTIF[n.kind];
          return (
            <motion.li key={n.id} variants={rise}>
              <a
                href={n.cible ?? "#"}
                onClick={() => markNotificationRead(n.id)}
                className={cn(
                  "flex gap-4 rounded-card border p-4 transition-colors duration-150",
                  n.lu
                    ? "border-border bg-card"
                    : "border-primary/25 bg-primary-wash",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-sm",
                    n.lu ? "bg-surface text-ink-muted" : "bg-card text-primary",
                  )}
                >
                  <Icone className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-body font-medium text-ink">{n.titre}</p>
                    {!n.lu && (
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 text-caption text-ink-muted">{n.corps}</p>
                  <p className="mt-2 text-caption text-ink-muted">
                    il y a {joursDepuis(n.date)} j
                  </p>
                </div>
              </a>
            </motion.li>
          );
        })}
      </motion.ul>

      <p className="mt-8 rounded-card border border-border bg-surface p-4 text-caption text-ink-muted">
        Les canaux e-mail et push sont prévus au cadrage (M20) mais hors périmètre
        de la démonstration : seul le canal web est actif.
      </p>
    </Screen>
  );
}

/* ── M13 — Opportunités (côté étudiant) ─────────────────────────────────── */

export function OpportunitiesScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { myProjects } = useSoa();
  const mesTechnos = new Set(myProjects.flatMap((p) => p.technos));
  const termines = myProjects.filter((p) => p.status === "Terminé").length;

  return (
    <Screen>
      <ScreenHead
        eyebrow="M13"
        titre="Opportunités"
        lede="Des entreprises publient des projets réels. Le cadrage est clair : elles arrivent après l'apprentissage, pas avant."
        retour={{ name: "profil" }}
        onRetour={navigate}
      />

      {/* Garde-fou du cadrage rendu littéral : tant qu'aucun projet n'est
          terminé, l'écran explique pourquoi plutôt que d'afficher des offres. */}
      {termines === 0 && (
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <p className="text-body text-ink">
            Tu n'as pas encore de projet terminé.
          </p>
          <p className="mt-1 text-body text-ink-muted">
            Les offres restent consultables, mais ce que les entreprises regardent
            ici, c'est un projet mené jusqu'au bout — pas une liste de technologies.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {OPPORTUNITIES.map((o) => {
          const entreprise = COMPANIES.find((e) => e.id === o.companyId);
          const communes = o.technos.filter((t) => mesTechnos.has(t));

          return (
            <article
              key={o.id}
              className="rounded-card border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-title font-semibold text-ink">{o.titre}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-caption text-ink-muted">
                    <Building2 aria-hidden className="size-3.5" />
                    {entreprise?.nom} · {entreprise?.secteur}
                  </p>
                </div>
                <Chip tone={o.nature === "Stage" ? "primary" : "neutral"}>{o.nature}</Chip>
              </div>

              <p className="prose-measure mt-3 text-body text-ink-muted">{o.description}</p>

              <ChipRow className="mt-4">
                {o.technos.map((t) => (
                  <Chip key={t} tone={communes.includes(t) ? "accent" : "neutral"}>
                    {t}
                  </Chip>
                ))}
                <Chip>{o.dureeMois} mois</Chip>
              </ChipRow>

              {communes.length > 0 && (
                <p className="mt-3 text-caption text-on-accent">
                  {communes.length} technologie{communes.length > 1 ? "s" : ""} que tu as
                  déjà utilisée{communes.length > 1 ? "s" : ""} sur un projet.
                </p>
              )}

              <div className="mt-4 border-t border-border pt-4">
                <p className="text-caption text-ink-muted">
                  <span className="font-medium text-ink">Profil recherché : </span>
                  {o.profil}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Screen>
  );
}
