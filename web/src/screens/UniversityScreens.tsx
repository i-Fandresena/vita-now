import { useMemo, useState } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import { COHORTS, CURRENT_TEACHER, SUPERVISIONS, studentById } from "@/data/soa-corpus";
import { joursDepuis, type Cohort } from "@/domain/soa";
import { Button } from "@/ui/Button";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Avatar, Progress, Stat } from "@/ui/data";
import { Icon } from "@/ui/Icon";
import { CardLink, ScreenHead, Tabs, WideScreen } from "@/ui/layout";
import { EmptyState } from "@/ui/states";

/**
 * UniversityScreens.tsx — la branche « Universités » du schéma d'architecture.
 *
 * Elle n'apparaît dans aucun des 21 modules numérotés du cadrage, seulement
 * dans le schéma :
 *
 *     Mémoire IA SOA
 *        ↙        ↘
 *   Entreprises  Universités
 *   Stages       Suivi pédagogique
 *   Emplois      Projets académiques
 *   Challenges   Classements
 *
 * Ces trois usages sont donc les trois écrans de cet espace.
 *
 * **Le principe qui gouverne tout le reste : aucune note.** Le cadrage parle
 * de *suivi pédagogique*, pas d'évaluation. Un enseignant qui note dans SOA
 * transformerait le journal en copie — et personne n'écrit « je suis bloqué
 * depuis trois jours » sous l'œil de celui qui va le noter. L'outil perdrait
 * en une semaine la seule chose qui le rend utile : des journaux honnêtes.
 *
 * Ce que l'enseignant voit à la place : qui n'a plus d'activité, et depuis
 * quand. C'est actionnable, et ça ne demande à personne de se mettre en scène.
 */

const ONGLETS = ["Suivi pédagogique", "Projets académiques", "Classements"] as const;

export function UniversityScreen({ navigate }: { navigate: (to: Route) => void }) {
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]>("Suivi pédagogique");

  return (
    <WideScreen>
      <ScreenHead
        eyebrow="Espace universitaire"
        titre={CURRENT_TEACHER.nom}
        lede={`${CURRENT_TEACHER.departement} · ${CURRENT_TEACHER.universite}`}
      />

      {/* L'avertissement est en tête, pas en bas de page : c'est la règle qui
          conditionne l'usage de tout l'espace, pas une note de bas de page. */}
      <div className="mt-6 flex gap-3 rounded-card border border-accent bg-accent-soft p-5">
        <Icon name="alertTriangle" size={20} aria-hidden className="mt-0.5 shrink-0 text-on-accent" />
        <div>
          <p className="text-body font-medium text-on-accent">
            Suivi, pas évaluation.
          </p>
          <p className="prose-measure mt-1 text-body text-on-accent/80">
            Aucune note ne peut être saisie ici, et c'est délibéré. Un journal
            relu comme une copie cesse d'être honnête — et un journal malhonnête
            ne sert plus à reprendre un projet. Vous voyez ce qui avance et qui
            décroche ; vous n'évaluez pas.
          </p>
        </div>
      </div>

      <Tabs valeurs={ONGLETS} actif={onglet} onChange={setOnglet} className="mt-8" />

      {onglet === "Suivi pédagogique" && <SuiviPedagogique navigate={navigate} />}
      {onglet === "Projets académiques" && <ProjetsAcademiques navigate={navigate} />}
      {onglet === "Classements" && <ClassementsPromo navigate={navigate} />}
    </WideScreen>
  );
}

/* ── Suivi pédagogique ──────────────────────────────────────────────────── */

function SuiviPedagogique({ navigate }: { navigate: (to: Route) => void }) {
  const { cohortHealth, projects } = useSoa();
  const promos = COHORTS.filter((c) => CURRENT_TEACHER.promotions.includes(c.id));

  return (
    <div className="mt-8 flex flex-col gap-10">
      {promos.map((promo) => {
        const sante = cohortHealth(promo.id);
        return (
          <section key={promo.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-heading text-heading text-ink">{promo.libelle}</h2>
              <span className="text-caption text-ink-muted">{promo.annee}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Stat valeur={sante.effectif} libelle="Étudiants" />
              <Stat valeur={sante.projetsActifs} libelle="Projets actifs" ton="primary" />
              <Stat valeur={sante.projetsTermines} libelle="Terminés" ton="success" />
              <Stat valeur={sante.projetsEnSommeil} libelle="En sommeil" />
              <Stat valeur={sante.entreesJournal} libelle="Entrées de journal" />
            </div>

            {/* Le bloc qui compte. Il vient avant la liste complète, parce
                qu'une moyenne de promotion masque exactement les deux ou trois
                personnes que le suivi existe pour rattraper. */}
            {sante.etudiantsSansActivite.length > 0 && (
              <div className="mt-6 rounded-card border border-destructive/30 bg-destructive/5 p-5">
                <p className="flex items-center gap-2 text-body font-medium text-ink">
                  <Icon name="alertTriangle" size={16} aria-hidden className="shrink-0 text-destructive" />
                  {sante.etudiantsSansActivite.length} étudiant
                  {sante.etudiantsSansActivite.length > 1 ? "s" : ""} sans activité
                </p>
                <p className="mt-1 text-caption text-ink-muted">
                  Aucun projet actif depuis au moins sept jours. C'est le moment
                  où le cycle d'abandon se referme.
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {sante.etudiantsSansActivite.map((id) => {
                    const e = studentById(id);
                    if (!e) return null;
                    const siens = projects.filter((p) => p.ownerId === id);
                    const dernier = siens
                      .map((p) => joursDepuis(p.derniereActivite))
                      .sort((a, b) => a - b)[0];
                    return (
                      <li key={id}>
                        <a
                          href={hrefFor({ name: "profil", id })}
                          onClick={(ev) => {
                            ev.preventDefault();
                            navigate({ name: "profil", id });
                          }}
                          className="flex items-center gap-3 rounded-sm bg-card p-3 transition-colors duration-150 hover:bg-surface"
                        >
                          <Avatar initiales={e.initiales} nom={e.nom} taille="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body font-medium text-ink">
                              {e.nom}
                            </span>
                            <span className="block text-caption text-ink-muted">
                              {siens.length === 0
                                ? "Aucun projet déclaré"
                                : `Dernière activité il y a ${dernier} jours`}
                            </span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <ul className="mt-6 grid gap-3 lg:grid-cols-2">
              {promo.studentIds.map((id) => {
                const e = studentById(id);
                if (!e) return null;
                const siens = projects.filter((p) => p.ownerId === id);
                const actifs = siens.filter((p) => p.status === "En cours").length;
                const termines = siens.filter((p) => p.status === "Terminé").length;
                return (
                  <li key={id}>
                    <CardLink
                      href={hrefFor({ name: "profil", id })}
                      onClick={() => navigate({ name: "profil", id })}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar initiales={e.initiales} nom={e.nom} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body font-medium text-ink">{e.nom}</p>
                          <p className="text-caption text-ink-muted">
                            {siens.length} projet{siens.length > 1 ? "s" : ""} ·{" "}
                            {actifs} actif{actifs > 1 ? "s" : ""} · {termines} terminé
                            {termines > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </CardLink>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ── Projets académiques ────────────────────────────────────────────────── */

function ProjetsAcademiques({ navigate }: { navigate: (to: Route) => void }) {
  const { projects, journalFor, progressOf } = useSoa();

  const encadres = SUPERVISIONS.map((s) => ({
    supervision: s,
    projet: projects.find((p) => p.id === s.projectId),
    promo: COHORTS.find((c) => c.id === s.cohortId),
  })).filter((e) => e.projet);

  return (
    <div className="mt-8 flex flex-col gap-4">
      {encadres.map(({ supervision, projet, promo }) => {
        if (!projet) return null;
        const auteur = studentById(projet.ownerId);
        const entrees = journalFor(projet.id);
        const jours = joursDepuis(projet.derniereActivite);
        const echeance = supervision.echeance;
        const joursRestants = echeance
          ? Math.round(
              (new Date(echeance.date).getTime() - Date.now()) / 86_400_000,
            )
          : null;

        return (
          <article
            key={projet.id}
            className="rounded-card border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-title font-semibold text-ink">{projet.nom}</h3>
                <p className="mt-1 text-caption text-ink-muted">
                  {auteur?.nom} · {promo?.libelle}
                </p>
              </div>
              <ChipRow>
                <Chip tone={projet.status === "En cours" ? "primary" : "neutral"}>
                  {projet.status}
                </Chip>
                {joursRestants !== null && (
                  <Chip tone={joursRestants < 10 ? "accent" : "neutral"}>
                    <Icon name="calendar" size={14} aria-hidden />
                    {echeance!.libelle} — J{joursRestants >= 0 ? "-" : "+"}
                    {Math.abs(joursRestants)}
                  </Chip>
                )}
              </ChipRow>
            </div>

            <p className="prose-measure mt-3 text-body text-ink-muted">{projet.objectif}</p>

            <div className="mt-5">
              <Progress
                valeur={progressOf(projet.id)}
                libelle="Avancement"
                origine={`${entrees.length} entrées de journal · dernière il y a ${jours} j`}
              />
            </div>

            {supervision.observation && (
              <div className="mt-5 rounded-sm border-l-2 border-primary bg-primary-wash p-4">
                <p className="label-eyebrow text-primary">Votre observation</p>
                <p className="mt-1 text-body text-ink">{supervision.observation}</p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate({ name: "projet-journal", id: projet.id })}
              >
                Lire le journal
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ name: "projet", id: projet.id })}
              >
                Voir le projet
              </Button>
            </div>
          </article>
        );
      })}

      {encadres.length === 0 && (
        <EmptyState
          title="Aucun projet encadré"
          body="Les projets apparaissent ici quand ils sont rattachés à une de vos promotions."
        />
      )}
    </div>
  );
}

/* ── Classements de promotion ───────────────────────────────────────────── */

function ClassementsPromo({ navigate }: { navigate: (to: Route) => void }) {
  const { projects, journalFor } = useSoa();
  const promos = COHORTS.filter((c) => CURRENT_TEACHER.promotions.includes(c.id));

  /**
   * Classement **par promotion et par projet**, jamais par étudiant.
   *
   * C'est la même règle que côté étudiant (M11) : comparer des projets sur des
   * faits vérifiables — jalons franchis, décisions écrites — reste défendable ;
   * classer des personnes dans un outil que leur enseignant consulte ne l'est
   * pas.
   */
  const classements = useMemo(
    () =>
      promos.map((promo: Cohort) => ({
        promo,
        classes: projects
          .filter((p) => promo.studentIds.includes(p.ownerId))
          .map((p) => {
            const entrees = journalFor(p.id);
            return {
              projet: p,
              auteur: studentById(p.ownerId),
              jalons: entrees.filter((e) => e.jalon).length,
              entrees: entrees.length,
            };
          })
          .sort(
            (a, b) =>
              Number(b.projet.status === "Terminé") -
                Number(a.projet.status === "Terminé") ||
              b.jalons - a.jalons ||
              b.entrees - a.entrees,
          ),
      })),
    [promos, projects, journalFor],
  );

  return (
    <div className="mt-8 flex flex-col gap-10">
      {classements.map(({ promo, classes }) => (
        <section key={promo.id}>
          <h2 className="font-heading text-heading text-ink">{promo.libelle}</h2>
          <ol className="mt-4 flex flex-col gap-2">
            {classes.map((c, index) => (
              <li key={c.projet.id}>
                <a
                  href={hrefFor({ name: "projet", id: c.projet.id })}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate({ name: "projet", id: c.projet.id });
                  }}
                  className="flex items-center gap-4 rounded-card border border-border bg-card p-4 transition-colors duration-150 hover:border-border-strong"
                >
                  <span className="w-6 shrink-0 text-right font-display text-title tabular-nums text-ink-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-ink">
                      {c.projet.nom}
                    </p>
                    <p className="text-caption text-ink-muted">
                      {c.auteur?.nom} · {c.jalons} jalon{c.jalons > 1 ? "s" : ""} ·{" "}
                      {c.entrees} entrée{c.entrees > 1 ? "s" : ""}
                    </p>
                  </div>
                  <Chip
                    tone={c.projet.status === "Terminé" ? "success" : "neutral"}
                  >
                    {c.projet.status}
                  </Chip>
                </a>
              </li>
            ))}
          </ol>
          {classes.length === 0 && (
            <p className="mt-3 text-body text-ink-muted">
              Aucun projet déclaré dans cette promotion.
            </p>
          )}
        </section>
      ))}

      <p className="rounded-card border border-border bg-surface p-4 text-caption text-ink-muted">
        Ce classement compare des <strong className="text-ink">projets</strong>,
        pas des étudiants. C'est ce qui le rend publiable sans transformer la
        promotion en compétition.
      </p>
    </div>
  );
}
