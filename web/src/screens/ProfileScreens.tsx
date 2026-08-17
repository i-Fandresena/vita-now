import { motion } from "framer-motion";
import { Briefcase, ListOrdered, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import { BADGES, COMPANIES, MENTORS, studentById } from "@/data/soa-corpus";
import {
  FORUM_CATEGORIES,
  POINT_LABELS,
  POINT_VALUES,
  joursDepuis,
  type LeaderboardKind,
  type Notification,
  type PointReason,
  type Project,
} from "@/domain/soa";
import { cn } from "@/lib/cn";
import { rise, sequence } from "@/lib/motion";
import { reinitialiser } from "@/lib/persistence";
import { Button, button } from "@/ui/Button";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Avatar, Progress, Stat } from "@/ui/data";
import { Input, Textarea } from "@/ui/Field";
import { Icon, type IconName } from "@/ui/Icon";
import { Block, CardLink, Screen, ScreenHead, Tabs } from "@/ui/layout";
import { Pagination } from "@/ui/Pagination";
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

/** M12 — une icône par geste réel, aucune nouvelle icône ajoutée pour ça. */
const ICONE_POINT: Record<PointReason, IconName> = {
  "projet-termine": "check",
  "pair-aide": "user",
  "solution-partagee": "send",
  "erreur-documentee": "alertTriangle",
};

/** « Aujourd'hui » / « Hier » / une date — jamais un nombre de jours brut. */
function jourRelatif(date: string): string {
  const jours = joursDepuis(date);
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return "Hier";
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/**
 * Regroupe un journal de points déjà trié (le plus récent d'abord) par jour
 * relatif — façon Duolingo : « pourquoi j'ai gagné ça », classé par moment,
 * pas juste une liste plate.
 */
function groupesParJour<T extends { date: string }>(entrees: T[]): [string, T[]][] {
  const groupes: [string, T[]][] = [];
  for (const entree of entrees) {
    const jour = jourRelatif(entree.date);
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier[0] === jour) {
      dernier[1].push(entree);
    } else {
      groupes.push([jour, [entree]]);
    }
  }
  return groupes;
}

/**
 * Remise à zéro de la démonstration.
 *
 * **Pourquoi cet écran a besoin de ce bouton.** Depuis que l'état survit au
 * rechargement, un navigateur qui a déjà servi garde son état pour toujours :
 * une correction apportée au corpus dans le code n'apparaît jamais sur le
 * poste de démonstration, et rien à l'écran n'explique pourquoi. Sans cette
 * sortie, la seule échappatoire est la console du navigateur — hors de portée
 * de la plupart des gens qui feront tourner l'outil.
 *
 * **Deux temps, jamais un.** L'action est irréversible ; une seule pression
 * suffirait à effacer une démonstration en cours par erreur, et le geste est
 * d'autant plus facile sur un écran tactile. Le second bouton est donc explicite
 * (« Oui, tout effacer ») plutôt qu'un « OK » qu'on presse sans lire, et
 * « Annuler » reste la sortie la plus large.
 *
 * Le vocabulaire évite « localStorage », « cache » et « état » : la phrase dit
 * ce qui disparaît et ce qui revient, pas où c'était rangé.
 */
function RemiseAZero() {
  const [confirme, setConfirme] = useState(false);

  return (
    <section className="mt-10 rounded-card border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <RotateCcw aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
        <div className="min-w-0 flex-1">
          <h2 className="text-body font-semibold text-ink">Repartir de zéro</h2>
          <p className="mt-1 text-body text-ink-muted">
            Efface les projets, les entrées de journal et les messages que tu as
            ajoutés sur cet appareil, et remet l'exemple de départ. Rien n'est
            envoyé ni supprimé ailleurs — les autres appareils ne changent pas.
          </p>

          {confirme ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  reinitialiser();
                  /* Rechargement plutôt que remise à zéro de l'état en React :
                     deux magasins indépendants sont concernés (l'état applicatif
                     et les dépôts de la Mémoire), et les relire au démarrage est
                     le seul chemin déjà éprouvé. */
                  window.location.reload();
                }}
              >
                Oui, tout effacer
              </Button>
              <Button variant="ghost" onClick={() => setConfirme(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button variant="ghost" className="mt-4 -ml-3" onClick={() => setConfirme(true)}>
              Repartir de zéro
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function parseArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/^\{|\}$/g, "");
    if (!cleaned.trim()) return [];
    return cleaned.split(",").map((s) => s.replace(/^"|"$/g, "").trim()) as unknown as T[];
  }
  return [];
}

export function ProfileScreen({
  id,
  navigate,
}: {
  id?: string;
  navigate: (to: Route) => void;
}) {
  const { projects, points, pointsOf, me, students } = useSoa();
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]>("Projets");

  const etudiant = id ? (students.find((s) => s.id === id) ?? studentById(id)) : me;
  const moi = !id || (me && id === me.id);

  if (!etudiant) {
    return (
      <Screen>
        <ScreenHead
          titre="Profil introuvable"
          retour={{ name: "tableau" }}
          onRetour={navigate}
        />
        <EmptyState title="Profil introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const disponibilites = parseArray<string>(etudiant.disponibilites);
  const technos = parseArray<any>(etudiant.technos);
  const interets = parseArray<string>(etudiant.interets);

  const siens = projects.filter((p) => p.ownerId === etudiant.id);
  const termines = siens.filter((p) => p.status === "Terminé").length;
  const arretes = siens.filter((p) => p.status === "Abandonné").length;
  const mentor = MENTORS.find((m) => m.studentId === etudiant.id);
  const badgesObtenus = BADGES.filter((b) => b.obtenuLe);
  const mesPoints = points
    .filter((p) => p.studentId === etudiant.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Screen>
      <ScreenHead
        titre={moi ? "Profil" : etudiant.nom}
        retour={moi ? { name: "tableau" } : { name: "communaute" }}
        onRetour={navigate}
        actions={
          moi && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate({ name: "classements" })}
              >
                <Icon name="trophy" size={16} aria-hidden className="text-primary" />
                Classements & Prix
              </Button>
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
              <Button
                variant="primary"
                onClick={() => navigate({ name: "profil-edition" })}
              >
                Modifier
              </Button>
            </>
          )
        }
      />

      <section className="mt-6 overflow-hidden rounded-card border border-border bg-card">
        {/* Bande de fond : tokens existants (primary/accent), pas de nouvelle
            couleur — un simple dégradé pour donner du relief à l'en-tête sans
            rivaliser avec le contenu. */}
        <div
          aria-hidden
          className="h-16 bg-gradient-to-r from-primary-wash to-accent-soft sm:h-20"
        />
        <div className="-mt-8 flex flex-col gap-4 p-5 sm:-mt-10 sm:flex-row sm:items-end sm:gap-6 sm:p-6">
          <Avatar
            initiales={etudiant.initiales}
            nom={etudiant.nom}
            photoUrl={etudiant.photoUrl}
            taille="lg"
            className="ring-4 ring-card"
          />
          <div className="min-w-0 flex-1 sm:pb-1">
            <h2 className="text-title font-semibold text-ink">{etudiant.nom}</h2>
            <p className="mt-1 text-body text-ink-muted">
              {etudiant.niveau} · {etudiant.filiere}
            </p>
            <p className="mt-0.5 text-caption text-ink-muted">
              {etudiant.universite} · promo {etudiant.promo}
            </p>
            <ChipRow className="mt-3">
              {mentor && <Chip tone="primary">Mentor</Chip>}
              {disponibilites.map((d) => (
                <Chip key={d}>{d}</Chip>
              ))}
            </ChipRow>
          </div>
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
              {technos.map((t) => (
                <div key={t.nom}>
                  <Progress
                    valeur={(t.maitrise ?? 1) * 25}
                    libelle={t.nom}
                    origine={
                      ["Découverte", "Pratiqué", "À l'aise", "Avancé"][(t.maitrise ?? 1) - 1]
                    }
                  />
                  {/* E9 — la validation par une entreprise est une preuve, pas
                      une décoration : elle porte le nom de qui l'a signée. */}
                  {t.valideePar && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-caption text-success">
                      <Icon name="sparkle" size={14} aria-hidden />
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
              {interets.map((i) => (
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

          {/* M12 — « Points SOA gagnés en terminant un projet, aidant un pair,
              partageant une solution, documentant une erreur ». Le total seul
              ne dirait rien ; c'est le journal qui porte l'information. */}
          <div className="rounded-card border border-border bg-card p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-heading text-heading text-ink">Points VITA'NOW</h3>
              <span className="font-display text-display-3 tabular-nums text-primary">
                {pointsOf(etudiant.id)}
              </span>
            </div>

            {/* La liste complète, en clair : pas de multiplicateur cousu
                ailleurs, pas de source qui ne soit pas l'un de ces gestes. */}
            <p className="mt-2 text-caption text-ink-muted">
              Quatre gestes rapportent des points, et ce sont les seuls :
              terminer un projet (+{POINT_VALUES["projet-termine"]}), aider un
              pair ou répondre en tant que mentor (+{POINT_VALUES["pair-aide"]}),
              documenter une erreur (+{POINT_VALUES["erreur-documentee"]}), voir
              sa fiche mémoire servir à quelqu'un d'autre
              (+{POINT_VALUES["solution-partagee"]}).
            </p>

            <ul className="mt-4 flex flex-col gap-5">
              {groupesParJour(mesPoints).map(([jour, entrees]) => (
                <li key={jour}>
                  <p className="label-eyebrow mb-2">{jour}</p>
                  <ul className="flex flex-col gap-2">
                    {entrees.map((pt) => (
                      <li
                        key={pt.id ?? `${pt.studentId}-${pt.reason}-${pt.date}`}
                        className="flex items-center gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-wash text-primary">
                          <Icon name={ICONE_POINT[pt.reason]} size={14} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-body text-ink">{pt.detail}</span>
                          <span className="block text-caption text-ink-muted">
                            {POINT_LABELS[pt.reason]}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-caption font-medium text-success">
                          +{POINT_VALUES[pt.reason]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            {mesPoints.length === 0 && (
              <p className="mt-3 text-body text-ink-muted">
                Aucun point pour l'instant. Terminer un projet, aider un pair,
                partager une solution ou documenter une erreur en rapporte.
              </p>
            )}
          </div>

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
                      <Icon name="sparkle" size={16} aria-hidden className="mt-0.5 shrink-0 text-on-accent" />
                    ) : (
                      <Icon name="lock" size={16} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
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

      {/* Uniquement sur son propre profil : personne ne remet à zéro depuis la
          fiche de quelqu'un d'autre, et l'y afficher inquiéterait pour rien. */}
      {moi && <RemiseAZero />}
    </Screen>
  );
}

/* ── M11 — Classements ──────────────────────────────────────────────────── */

/** Les classements applicatifs. */
const CLASSEMENTS: { cle: LeaderboardKind; libelle: string }[] = [
  { cle: "meilleur-annee", libelle: "Meilleur de l'année" },
  { cle: "academique", libelle: "Par domaine & secteur" },
  { cle: "technologie", libelle: "Par technologie" },
  { cle: "progression", libelle: "Régularité" },
  { cle: "contribution", libelle: "Entraide" },
];

interface LigneClassement {
  projet: Project;
  auteur?: { nom: string };
  score: number;
  jalons: number;
  entrees: number;
  termine: boolean;
}

/**
 * Un classement groupé par catégorie (secteur ou technologie) — factorisé
 * pour ne pas dupliquer le rendu entre « Par domaine & secteur » et « Par
 * technologie », identiques à la présentation près du libellé du trophée.
 */
function ClassementParGroupe({
  groupes,
  libelleTop,
  navigate,
}: {
  groupes: { categorie: string; classes: LigneClassement[]; topProjet?: LigneClassement }[];
  libelleTop: string;
  navigate: (to: Route) => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-8">
      {groupes.map(({ categorie, classes, topProjet }) => (
        <section key={categorie} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-heading text-ink">{categorie}</h2>
            {topProjet && (
              <span className="text-caption text-primary font-medium flex items-center gap-1">
                <Icon name="trophy" size={14} /> {libelleTop} : {topProjet.projet.nom}
              </span>
            )}
          </div>
          <ol className="flex flex-col gap-2">
            {classes.map((c, index) => (
              <li key={c.projet.id}>
                <a
                  href={hrefFor({ name: "projet", id: c.projet.id })}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate({ name: "projet", id: c.projet.id });
                  }}
                  className={cn(
                    "flex items-center gap-4 rounded-card border p-4 transition-colors duration-150",
                    index === 0
                      ? "border-primary/40 bg-primary-wash/50 hover:border-primary"
                      : "border-border bg-card hover:border-border-strong",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-caption font-bold tabular-nums shrink-0",
                      index === 0 ? "bg-primary text-on-primary" : "bg-surface text-ink-muted",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-ink flex items-center gap-2">
                      {c.projet.nom}
                      {index === 0 && (
                        <span className="text-caption text-primary font-semibold">
                          N°1 {categorie}
                        </span>
                      )}
                    </p>
                    <p className="text-caption text-ink-muted">
                      {c.auteur?.nom} · {c.jalons} jalon{c.jalons > 1 ? "s" : ""} ·{" "}
                      {c.entrees} entrée{c.entrees > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-caption font-semibold text-ink shrink-0">
                    {c.score} pts
                  </span>
                  {c.termine && <Chip tone="success">Terminé</Chip>}
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function LeaderboardScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { projects, journalFor, students, me } = useSoa();
  const [type, setType] = useState<LeaderboardKind>("meilleur-annee");

  /**
   * Calcul automatique du score de performance d'un projet :
   * - Projets terminés prioritaires (50 pts)
   * - Jalons franchis (15 pts par jalon)
   * - Étapes de checklist cochées (8 pts par étape, sous-tâches comprises)
   * - Volume et rigueur des entrées de journal (5 pts par entrée)
   * - Nombre de technos maîtrisées associées (3 pts par techno)
   */
  const calculScoreProjet = (p: (typeof projects)[0]) => {
    const entrees = journalFor(p.id);
    const jalons = entrees.filter((e) => e.jalon).length;
    const etapesFaites = p.checklist?.filter((e) => e.fait).length ?? 0;
    const estTermine = p.status === "Terminé" ? 50 : 0;
    return (
      estTermine +
      jalons * 15 +
      etapesFaites * 8 +
      entrees.length * 5 +
      (p.technos?.length ?? 0) * 3
    );
  };

  /** Projets évalués et classés avec score global. */
  const projetsEvalues = useMemo(() => {
    return projects
      .filter((p) => p.public !== false)
      .map((p) => {
        const score = calculScoreProjet(p);
        const entrees = journalFor(p.id);
        const auteur = students.find((s) => s.id === p.ownerId) ?? studentById(p.ownerId);
        return {
          projet: p,
          auteur,
          score,
          jalons: entrees.filter((e) => e.jalon).length,
          entrees: entrees.length,
          termine: p.status === "Terminé",
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [projects, journalFor, students]);

  /** Meilleur projet de l'année (Le #1 absolu de la plateforme). */
  const meilleurDeLannee = projetsEvalues[0];

  /** Classement par Domaine / Secteur académique. */
  const parDomaine = useMemo(() => {
    const categories = [...new Set(projects.map((p) => p.type))];
    return categories
      .map((categorie) => {
        const classes = projetsEvalues.filter((item) => item.projet.type === categorie);
        return { categorie, classes, topProjet: classes[0] };
      })
      .filter((g) => g.classes.length > 0);
  }, [projects, projetsEvalues]);

  /**
   * Classement par technologie — « meilleur projet Java », etc. Le cadrage
   * nomme les mêmes catégories pour le forum et pour ce classement
   * (`AURA_cadrage.md`, « Forum technique par catégorie » / « meilleur projet
   * par catégorie ») : on regroupe donc par correspondance avec les technos
   * du projet, pas par `ProjectType` (déjà utilisé ci-dessus pour « secteur »).
   * Un projet sans techno reconnue n'apparaît dans aucun groupe — pas de
   * case "Autre" inventée.
   */
  const parTechnologie = useMemo(() => {
    return FORUM_CATEGORIES.map((categorie) => {
      const classes = projetsEvalues.filter((item) =>
        item.projet.technos.some((t) => t.toLowerCase() === categorie.toLowerCase()),
      );
      return { categorie, classes, topProjet: classes[0] };
    }).filter((g) => g.classes.length > 0);
  }, [projetsEvalues]);

  /** Calcul dynamique de régularité et entraide basé sur les données réelles. */
  const lignes = useMemo(() => {
    return students
      .map((student) => {
        const sesProjets = projects.filter(
          (p) => p.ownerId === student.id || p.membres?.includes(student.id),
        );
        const etapesFaites = sesProjets.reduce(
          (sum, p) => sum + (p.checklist?.filter((c) => c.fait).length ?? 0),
          0,
        );
        const journalEntriesCount = sesProjets.reduce(
          (sum, p) => sum + journalFor(p.id).length,
          0,
        );
        const tachesAssignees = sesProjets.reduce(
          (sum, p) => sum + (p.checklist?.filter((c) => c.assigneA === student.id).length ?? 0),
          0,
        );

        const regularite = (sesProjets.length * 10) + (etapesFaites * 5) + (journalEntriesCount * 4);
        const entraide = (sesProjets.filter((p) => p.membres && p.membres.length > 1).length * 15) + (tachesAssignees * 8) + 10;

        return {
          student,
          valeur: type === "progression" ? regularite : entraide,
        };
      })
      .sort((a, b) => b.valeur - a.valeur);
  }, [students, projects, journalFor, type]);

  const actif = CLASSEMENTS.find((c) => c.cle === type) ?? CLASSEMENTS[0]!;

  return (
    <Screen>
      <ScreenHead
        eyebrow="M11 — Talent & Innovation"
        titre="Classements & Prix"
        lede="Sélection automatique du meilleur projet par domaine, par secteur et du grand lauréat de l'année."
        retour={{ name: "profil" }}
        onRetour={navigate}
      />

      {/* Dit en clair ce que le calcul fait déjà silencieusement : on compare
          des projets, jamais des personnes — c'est une exigence du cadrage,
          pas un détail d'implémentation à cacher. */}
      <p className="mt-4 rounded-card border border-border bg-surface p-4 text-caption text-ink-muted">
        Ce classement compare des <strong className="text-ink">projets</strong>,
        jamais des personnes. Le score d'un projet est calculé, pas déclaré :
        Terminé (+50), par jalon franchi (+15), par étape de checklist cochée
        (+8), par entrée de journal (+5), par technologie maîtrisée associée
        (+3).
      </p>

      <Tabs
        valeurs={CLASSEMENTS.map((c) => c.libelle)}
        actif={actif.libelle}
        onChange={(l) => setType(CLASSEMENTS.find((c) => c.libelle === l)!.cle)}
        className="mt-6"
      />

      {/* ── Vue : Meilleur de l'année ─────────────────────────────────────── */}
      {type === "meilleur-annee" && (!meilleurDeLannee ? (
        <div className="mt-6">
          <EmptyState
            title="Aucun projet évalué pour le moment"
            body="Les projets s'afficheront automatiquement ici dès qu'ils auront enregistré leurs premières avancées."
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-card border-2 border-primary bg-primary-wash p-6 sm:p-8">
            <div className="absolute -right-6 -top-6 grid size-32 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon name="trophy" size={80} className="opacity-30" />
            </div>

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-primary font-semibold text-caption uppercase tracking-wider">
                <Icon name="sparkle" size={16} />
                Lauréat du Grand Prix VITA'NOW 2026
              </div>

              <div>
                <h2 className="font-display text-display-3 text-ink sm:text-display-2">
                  {meilleurDeLannee.projet.nom}
                </h2>
                <p className="mt-2 text-body text-ink-muted max-w-2xl">
                  {meilleurDeLannee.projet.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Avatar
                  initiales={meilleurDeLannee.auteur?.initiales ?? "??"}
                  nom={meilleurDeLannee.auteur?.nom ?? "Étudiant"}
                  taille="sm"
                />
                <div>
                  <p className="text-body font-medium text-ink">
                    {meilleurDeLannee.auteur?.nom}
                  </p>
                  <p className="text-caption text-ink-muted">
                    {meilleurDeLannee.auteur?.niveau} · {meilleurDeLannee.auteur?.filiere}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <Chip tone="primary">{meilleurDeLannee.projet.type}</Chip>
                  <span className="font-display text-title text-primary">
                    {meilleurDeLannee.score} pts
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                className="mt-2 w-fit"
                onClick={() => navigate({ name: "projet", id: meilleurDeLannee.projet.id })}
              >
                Consulter le projet lauréat
              </Button>
            </div>
          </div>

          <div className="rounded-card border border-border bg-card p-5">
            <h3 className="font-heading text-heading text-ink mb-4">
              Top 3 du classement général
            </h3>
            <ol className="flex flex-col gap-3">
              {projetsEvalues.slice(0, 3).map((item, idx) => (
                <li
                  key={item.projet.id}
                  className="flex items-center gap-4 rounded-sm border border-border bg-surface p-4"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-primary-wash font-display text-heading text-primary shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-body text-ink truncate">
                      {item.projet.nom}
                    </p>
                    <p className="text-caption text-ink-muted">
                      Par {item.auteur?.nom} · {item.jalons} jalons · {item.entrees} entrées
                    </p>
                  </div>
                  <span className="font-semibold text-body text-ink">
                    {item.score} pts
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ))}

      {/* ── Vue : Par domaine & secteur ───────────────────────────────────── */}
      {type === "academique" && (
        <ClassementParGroupe groupes={parDomaine} libelleTop="Top Secteur" navigate={navigate} />
      )}

      {/*
       * ── Vue : Par technologie ──────────────────────────────────────────
       * « Meilleur projet Java », etc. — regroupe par correspondance avec
       * les technos du projet (Java, PHP, React, IA, BDD, Réseau), pas par
       * type de projet (voir `parTechnologie` ci-dessus).
       */}
      {type === "technologie" && (
        <ClassementParGroupe groupes={parTechnologie} libelleTop="Top Techno" navigate={navigate} />
      )}

      {/* ── Vues : Régularité & Entraide ─────────────────────────────────── */}
      {(type === "progression" || type === "contribution") && (
        <ol className="mt-6 flex flex-col gap-2">
          {lignes.map((l, index) => {
            const moi = l.student.id === me.id;
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
                    {l.valeur} pts
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </Screen>
  );
}

/* ── M16 — Portfolio ────────────────────────────────────────────────────── */

/**
 * Bandeaux de couleur des cartes "projets marquants" — mêmes tokens que
 * `HALO_STATUT` dans `ProjectScreens.tsx` (primary/accent/success), cyclés
 * par position plutôt que choisis au hasard : pas de nouvelle couleur
 * inventée pour l'occasion.
 */
const BANDEAUX_MARQUANTS = ["bg-primary-wash", "bg-accent-soft", "bg-success/15", "bg-surface"];

export function PortfolioScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const { projects, journalFor, students } = useSoa();
  const etudiant = students.find((s) => s.id === id) ?? studentById(id);
  const [copie, setCopie] = useState(false);

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
  // Même garde qu'ProfileScreen (ligne 143) : selon l'état d'hydratation,
  // `technos` peut arriver comme un tableau JSON déjà propre ou comme la
  // représentation brute d'un tableau Postgres — jamais `undefined`, mais
  // pas toujours un vrai tableau JS non plus.
  const technos = parseArray<{ nom: string; maitrise: number; valideePar?: string }>(
    etudiant.technos,
  );

  // Un projet Terminé mais privé n'a rien à faire sur une page qui se dit
  // « Portfolio public » — même principe que la confidentialité par défaut
  // appliquée ailleurs (GET /api/projets).
  const marquants = termines
    .filter((p) => p.public)
    .sort((a, b) => new Date(b.debut).getTime() - new Date(a.debut).getTime());

  // Toutes les checklists cochées, tous projets confondus — une donnée
  // réelle, pas une jauge de gamification inventée pour l'occasion.
  const taches = siens.reduce(
    (n, p) => n + (p.checklist?.filter((e) => e.fait).length ?? 0),
    0,
  );

  // Jours calendaires distincts avec au moins une entrée de journal sur les
  // 30 derniers jours. Remplace une « série active » qu'aucune donnée du
  // modèle ne permet de calculer honnêtement (pas de suivi de streak
  // consécutif) — inventer un chiffre irait contre SPEC.md §2bis.
  const joursActifs = new Set(
    siens
      .flatMap((p) => journalFor(p.id))
      .filter((e) => joursDepuis(e.date) <= 30)
      .map((e) => e.date.slice(0, 10)),
  ).size;

  const badgesObtenus = BADGES.filter((b) => b.obtenuLe);

  const lien =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}${hrefFor({ name: "portfolio", id: etudiant.id })}`
      : "";

  const nomEtudiant = etudiant.nom;

  const copierLien = () => {
    navigator.clipboard
      ?.writeText(lien)
      .then(() => {
        setCopie(true);
        setTimeout(() => setCopie(false), 2000);
      })
      // Contexte non sécurisé, permission refusée... : rien de mieux à
      // proposer, mais ça ne doit pas remonter comme une erreur non gérée.
      .catch(() => {});
  };

  const partager = () => {
    if (navigator.share) {
      navigator.share({ title: `Portfolio de ${nomEtudiant}`, url: lien }).catch(() => {});
    } else {
      copierLien();
    }
  };

  return (
    <Screen>
      <ScreenHead
        eyebrow="Portfolio public"
        titre={etudiant.nom}
        lede={`${etudiant.niveau} · ${etudiant.filiere} · ${etudiant.universite}`}
        retour={{ name: "profil" }}
        onRetour={navigate}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="secondary" onClick={copierLien}>
              <Icon name="check" size={16} aria-hidden />
              {copie ? "Copié !" : "Copier le lien"}
            </Button>
            <Button variant="secondary" onClick={partager}>
              <Icon name="send" size={16} aria-hidden />
              Partager
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Icon name="folder" size={16} aria-hidden />
              Exporter en PDF
            </Button>
            {etudiant.cvUrl && (
              <a href={etudiant.cvUrl} download={etudiant.cvNom} className={button({ variant: "secondary" })}>
                <Icon name="book" size={16} aria-hidden />
                Télécharger le CV
              </a>
            )}
          </div>
        }
      />

      <section className="mt-6 overflow-hidden rounded-card border border-border bg-card">
        {/* Même bande de dégradé que l'en-tête du profil (tokens existants) —
            langage visuel cohérent entre les deux écrans. */}
        <div
          aria-hidden
          className="h-14 bg-gradient-to-r from-primary-wash to-accent-soft sm:h-16"
        />
        <div className="-mt-7 flex items-end gap-4 px-5 sm:-mt-8 sm:px-6">
          <Avatar
            initiales={etudiant.initiales}
            nom={etudiant.nom}
            photoUrl={etudiant.photoUrl}
            taille="lg"
            className="ring-4 ring-card"
          />
        </div>
        <p className="px-5 pb-5 pt-4 text-body text-ink sm:px-6 sm:pb-6">
          {etudiant.objectifs}
        </p>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat valeur={termines.length} libelle="Projets livrés" ton="success" />
        <Stat valeur={taches} libelle="Tâches finies" />
        <Stat valeur={joursActifs} libelle="Jours actifs" detail="30 derniers jours" />
        <Stat valeur={badgesObtenus.length} libelle="Distinctions" />
      </div>

      <Block titre="Projets marquants">
        {marquants.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {marquants.map((p, index) => (
              <CardLink
                key={p.id}
                href={hrefFor({ name: "projet", id: p.id })}
                onClick={() => navigate({ name: "projet", id: p.id })}
                className="overflow-hidden !p-0"
              >
                <div
                  className={cn(
                    "h-24",
                    BANDEAUX_MARQUANTS[index % BANDEAUX_MARQUANTS.length],
                  )}
                  aria-hidden
                />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Chip>{p.type}</Chip>
                    <span className="shrink-0 text-caption text-ink-muted">
                      {new Date(p.debut).getFullYear()}
                    </span>
                  </div>
                  <h3 className="mt-3 font-heading text-heading text-ink">{p.nom}</h3>
                  <ChipRow className="mt-3">
                    {p.technos.slice(0, 3).map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </ChipRow>
                  <p className="mt-4 flex items-center gap-1.5 text-caption font-medium text-primary">
                    Voir le projet
                    <Icon name="arrowRight" size={14} aria-hidden />
                  </p>
                </div>
              </CardLink>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucun projet marquant pour l'instant"
            body="Un projet apparaît ici une fois Terminé et rendu public."
          />
        )}
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
            {technos.map((t) => (
              <div key={t.nom}>
                <Progress
                  valeur={t.maitrise * 25}
                  libelle={t.nom}
                  origine={["Découverte", "Pratiqué", "À l'aise", "Avancé"][t.maitrise - 1]}
                />
                {t.valideePar && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-caption text-success">
                    <Icon name="sparkle" size={14} aria-hidden />
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

const ICONE_NOTIF: Record<Notification["kind"], ComponentType<{ className?: string }>> = {
  reprise: (props) => <Icon name="bell" size={16} {...props} />,
  forum: (props) => <Icon name="bell" size={16} {...props} />,
  challenge: (props) => <Icon name="bell" size={16} {...props} />,
  opportunite: Briefcase,
  signal: (props) => <Icon name="sparkle" size={16} {...props} />,
  mentorat: (props) => <Icon name="bell" size={16} {...props} />,
  evenement: (props) => <Icon name="calendar" size={16} {...props} />,
};

export function NotificationsScreen({ navigate }: { navigate: (to: Route) => void }) {
  const {
    notifications,
    markNotificationRead,
    markAllRead,
    deleteNotifications,
    deleteAllNotifications,
    unread,
    channels,
    setChannel,
  } = useSoa();
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);

  const toutSelectionne = notifications.length > 0 && selection.size === notifications.length;

  function basculerSelection(id: string) {
    setSelection((courante) => {
      const suivante = new Set(courante);
      if (suivante.has(id)) suivante.delete(id);
      else suivante.add(id);
      return suivante;
    });
  }

  function basculerTout() {
    setSelection(toutSelectionne ? new Set() : new Set(notifications.map((notification) => notification.id)));
  }

  async function supprimerSelection(ids: string[]) {
    if (ids.length === 0) return;
    setErreurSuppression(null);
    setSuppressionEnCours(true);
    try {
      await deleteNotifications(ids);
      setSelection((courante) => {
        const suivante = new Set(courante);
        ids.forEach((id) => suivante.delete(id));
        return suivante;
      });
    } catch {
      setErreurSuppression("La suppression n'a pas pu être enregistrée. Réessaie dans un instant.");
    } finally {
      setSuppressionEnCours(false);
    }
  }

  async function supprimerTout() {
    if (!window.confirm("Supprimer toutes vos notifications ? Cette action est définitive.")) return;
    setErreurSuppression(null);
    setSuppressionEnCours(true);
    try {
      await deleteAllNotifications();
      setSelection(new Set());
    } catch {
      setErreurSuppression("La suppression n'a pas pu être enregistrée. Réessaie dans un instant.");
    } finally {
      setSuppressionEnCours(false);
    }
  }

  return (
    <Screen>
      <ScreenHead
        titre="Notifications"
        retour={{ name: "tableau" }}
        onRetour={navigate}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {unread > 0 && (
              <Button variant="secondary" onClick={markAllRead}>
                Tout marquer comme lu
              </Button>
            )}
            {notifications.length > 0 && (
              <>
                <Button variant="secondary" onClick={basculerTout} disabled={suppressionEnCours}>
                  {toutSelectionne ? "Tout désélectionner" : "Tout sélectionner"}
                </Button>
                {selection.size > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => void supprimerSelection([...selection])}
                    disabled={suppressionEnCours}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Supprimer ({selection.size})
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => void supprimerTout()}
                  disabled={suppressionEnCours}
                  className="text-destructive hover:text-destructive"
                >
                  Tout supprimer
                </Button>
              </>
            )}
          </div>
        }
      />

      {erreurSuppression && (
        <p role="alert" className="mt-4 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-caption text-destructive">
          {erreurSuppression}
        </p>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Aucune notification"
          body="Les rappels, réponses et actualités de tes projets apparaîtront ici."
        />
      ) : (
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
              <div
                className={cn(
                  "flex gap-3 rounded-card border p-3 transition-colors duration-150 sm:gap-4 sm:p-4",
                  n.lu
                    ? "border-border bg-card"
                    : "border-primary/25 bg-primary-wash",
                )}
              >
                <label className="flex shrink-0 cursor-pointer items-start pt-2">
                  <input
                    type="checkbox"
                    checked={selection.has(n.id)}
                    onChange={() => basculerSelection(n.id)}
                    aria-label={`Sélectionner la notification : ${n.titre}`}
                    className="size-4 accent-[var(--color-primary)]"
                  />
                </label>
                <span
                  aria-hidden
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-sm",
                    n.lu ? "bg-surface text-ink-muted" : "bg-card text-primary",
                  )}
                >
                  <Icone className="size-4" />
                </span>
                <a
                  href={n.cible ?? "#"}
                  onClick={() => markNotificationRead(n.id)}
                  className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-body font-medium text-ink">{n.titre}</p>
                    {!n.lu && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-caption text-ink-muted">{n.corps}</p>
                  <p className="mt-2 text-caption text-ink-muted">il y a {joursDepuis(n.date)} j</p>
                </a>
                <button
                  type="button"
                  onClick={() => void supprimerSelection([n.id])}
                  disabled={suppressionEnCours}
                  aria-label={`Supprimer la notification : ${n.titre}`}
                  className="grid size-10 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </motion.li>
          );
          })}
        </motion.ul>
      )}

      {/* M20 — « Canaux : email, push mobile, notification web ». Les trois
          existent comme réglage ; deux ne peuvent pas fonctionner sans serveur,
          et l'écran le dit au lieu de le laisser croire. */}
      <Block titre="Canaux">
        <div className="flex flex-col gap-3">
          {(
            [
              ["web", "Notification web", "Active. C'est ce que tu vois ici."],
              ["email", "E-mail", "Nécessite un serveur d'envoi — pas encore développé."],
              ["push", "Push mobile", "Nécessite une application native — hors périmètre."],
            ] as const
          ).map(([cle, libelle, detail]) => {
            const dispo = cle === "web";
            return (
              <label
                key={cle}
                className={cn(
                  "flex items-start gap-3 rounded-card border border-border bg-card p-4",
                  !dispo && "opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  checked={channels[cle]}
                  disabled={!dispo}
                  onChange={(e) => setChannel(cle, e.target.checked)}
                  className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-body font-medium text-ink">{libelle}</span>
                  <span className="block text-caption text-ink-muted">{detail}</span>
                </span>
              </label>
            );
          })}
        </div>
      </Block>
    </Screen>
  );
}

/* ── M13 — Opportunités (côté étudiant) ─────────────────────────────────── */

export function OpportunitiesScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { me, myProjects, opportunities, companies, students, publishOpportunity } = useSoa();
  const [ouvert, setOuvert] = useState(false);
  const [source, setSource] = useState<"Entreprises" | "Toutes" | "Étudiants" | "Mes appels">("Entreprises");
  const [page, setPage] = useState(1);
  const [publicationEnCours, setPublicationEnCours] = useState(false);
  const [erreurPublication, setErreurPublication] = useState<string | null>(null);
  const [succesPublication, setSuccesPublication] = useState<string | null>(null);
  const [form, setForm] = useState({
    titre: "",
    description: "",
    technos: "",
    dureeMois: 3,
    profil: "",
  });

  const mesTechnos = new Set(myProjects.flatMap((p) => p.technos));
  const termines = myProjects.filter((p) => p.status === "Terminé").length;
  const offres = opportunities.filter((opportunite) => {
    if (source === "Entreprises") return Boolean(opportunite.companyId);
    if (source === "Étudiants") return Boolean(opportunite.studentId);
    if (source === "Mes appels") return opportunite.studentId === me.id;
    return true;
  });
  const pages = Math.max(1, Math.ceil(offres.length / 8));
  const offresPage = offres.slice((page - 1) * 8, page * 8);

  useEffect(() => { setPage(1); }, [source]);
  useEffect(() => { setPage((courante) => Math.min(courante, pages)); }, [pages]);

  return (
    <Screen>
      <ScreenHead
        eyebrow="M13"
        titre="Opportunités"
        lede="Consulte toutes les offres publiées par les entreprises, puis les appels à projets des autres étudiants."
        retour={{ name: "profil" }}
        onRetour={navigate}
        actions={
          <Button variant="primary" onClick={() => setOuvert(!ouvert)}>
            Publier un appel
          </Button>
        }
      />

      {/* Garde-fou du cadrage rendu littéral : tant qu'aucun projet n'est
          terminé, l'écran explique pourquoi plutôt que de vendre des offres. */}
      {termines === 0 && (
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <p className="text-body text-ink">Tu n'as pas encore de projet terminé.</p>
          <p className="mt-1 text-body text-ink-muted">
            Les offres restent consultables, mais ce que les entreprises regardent
            ici, c'est un projet mené jusqu'au bout — pas une liste de technologies.
          </p>
        </div>
      )}

      {/* M13 — « Entreprises **ou étudiants** publient des projets à réaliser ». */}
      {ouvert && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.titre.trim()) return;
            setPublicationEnCours(true);
            setErreurPublication(null);
            setSuccesPublication(null);
            void publishOpportunity({
              titre: form.titre.trim(),
              description: form.description.trim(),
              technos: form.technos.split(",").map((t) => t.trim()).filter(Boolean),
              dureeMois: form.dureeMois,
              profil: form.profil.trim() || "Ouvert à tous les niveaux.",
              nature: "Projet",
            }, "etudiant")
              .then(() => {
                setOuvert(false);
                setSource("Mes appels");
                setForm({ titre: "", description: "", technos: "", dureeMois: 3, profil: "" });
                setSuccesPublication("Appel publié. Il est maintenant visible par tous les utilisateurs dans Opportunités.");
              })
              .catch(() => setErreurPublication("La publication n'a pas pu être enregistrée. Réessaie dans un instant."))
              .finally(() => setPublicationEnCours(false));
          }}
          className="mt-6 flex flex-col gap-5 rounded-card border border-border bg-card p-5 sm:p-6"
        >
          <h2 className="font-heading text-heading text-ink">Publier un appel</h2>
          <p className="text-caption text-ink-muted">
            Tu cherches quelqu'un pour ton projet ? Publie-le ici : c'est le même
            canal que les entreprises, et les étudiants le lisent davantage.
          </p>

          <Input
            label="Titre"
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            placeholder="Cherche un binôme pour la partie synchronisation"
            required
          />
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <Input
            label="Technologies"
            value={form.technos}
            onChange={(e) => setForm({ ...form, technos: e.target.value })}
            hint="Séparées par des virgules."
          />
          <Input
            label="Durée (mois)"
            type="number"
            inputMode="numeric"
            min={1}
            max={24}
            value={form.dureeMois}
            onChange={(e) => setForm({ ...form, dureeMois: Number(e.target.value) || 1 })}
          />
          <Input
            label="Profil recherché"
            value={form.profil}
            onChange={(e) => setForm({ ...form, profil: e.target.value })}
            required
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={!form.titre.trim() || publicationEnCours}>
              {publicationEnCours ? "Publication…" : "Publier"}
            </Button>
            <Button variant="ghost" onClick={() => setOuvert(false)} disabled={publicationEnCours}>
              Annuler
            </Button>
          </div>
          {erreurPublication && <p role="alert" className="text-caption text-destructive">{erreurPublication}</p>}
        </form>
      )}

      <Tabs
        valeurs={["Entreprises", "Toutes", "Étudiants", "Mes appels"] as const}
        actif={source}
        onChange={setSource}
        className="mt-6"
      />

      {succesPublication && <p role="status" className="mt-4 rounded-card border border-success/30 bg-success/10 px-4 py-3 text-caption text-success">{succesPublication}</p>}

      <div className="mt-6 flex flex-col gap-4">
        {offresPage.map((o) => {
          const entreprise = o.companyId
            ? companies.find((e) => e.id === o.companyId) ?? COMPANIES.find((e) => e.id === o.companyId)
            : undefined;
          const offreEntreprise = Boolean(o.companyId);
          const auteur = o.studentId
            ? (o.studentId === me.id ? me : students.find((etudiant) => etudiant.id === o.studentId) ?? studentById(o.studentId))
            : undefined;
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
                    {offreEntreprise ? (
                      <>
                        <Icon name="building" size={14} aria-hidden />
                        {entreprise?.nom ?? "Entreprise partenaire"}
                        {entreprise?.secteur ? ` · ${entreprise.secteur}` : ""}
                      </>
                    ) : (
                      <>
                        <Avatar
                          initiales={auteur?.initiales ?? "??"}
                          nom={auteur?.nom ?? ""}
                          taille="sm"
                        />
                        {auteur?.nom} · {auteur?.niveau} {auteur?.filiere}
                      </>
                    )}
                  </p>
                </div>
                <ChipRow>
                  {!offreEntreprise && <Chip tone="primary">Étudiant</Chip>}
                  <Chip tone={o.nature === "Stage" ? "primary" : "neutral"}>{o.nature}</Chip>
                </ChipRow>
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

        {offres.length === 0 && (
          <EmptyState
            title={source === "Entreprises" ? "Aucune offre d'entreprise pour le moment" : "Aucune offre pour le moment"}
            body="Les nouvelles offres publiées sur la plateforme apparaîtront ici automatiquement."
          />
        )}
      </div>
      <Pagination page={page} total={offres.length} pageSize={8} onChange={setPage} itemLabel="offre" />
    </Screen>
  );
}
