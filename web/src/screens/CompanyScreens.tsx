import { Award, Building2, Check, Filter, Search, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import {
  COMPANIES,
  OPPORTUNITIES,
  STUDENTS,
  reliabilityFor,
  studentById,
} from "@/data/soa-corpus";
import type { Company, Niveau, ReliabilityScore, TalentMatch } from "@/domain/soa";
import { Button } from "@/ui/Button";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Avatar, DefRow, Progress, ScoreRing, Stat } from "@/ui/data";
import { Block, CardLink, ScreenHead, Tabs, WideScreen } from "@/ui/layout";
import { EmptyState } from "@/ui/states";

/**
 * CompanyScreens.tsx — l'espace entreprise (E1 à E10).
 *
 * Espace **séparé**, avec sa propre navigation. C'est le garde-fou que le
 * cadrage pose lui-même : « SOA ne doit pas devenir uniquement un LinkedIn
 * étudiant — l'entreprise arrive après l'apprentissage, pas avant ». Un
 * bandeau entreprise dans l'application étudiante inverserait exactement ce
 * rapport.
 *
 * L'entreprise de démonstration est Agrivia — celle dont l'offre correspond au
 * projet en cours de Soa. C'est ce qui rend la boucle du pitch lisible.
 */

const ENTREPRISE_COURANTE: Company = COMPANIES[2]!; // Agrivia

/* ── E1 — Accueil ───────────────────────────────────────────────────────── */

export function CompanyHomeScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { projects } = useSoa();
  const e = ENTREPRISE_COURANTE;

  const prototypes = projects.filter((p) => p.public && p.status === "Terminé").length;
  const candidats = STUDENTS.length;

  return (
    <WideScreen>
      <ScreenHead
        eyebrow="Espace entreprise"
        titre={e.nom}
        lede={e.presentation}
        actions={
          <Button variant="primary" onClick={() => navigate({ name: "ent-talents" })}>
            <Search aria-hidden className="size-4" />
            Chercher un profil
          </Button>
        }
      />

      <section className="mt-6 rounded-card border border-border bg-card p-5 sm:p-6">
        <dl>
          <DefRow terme="Secteur">{e.secteur}</DefRow>
          <DefRow terme="Technologies recherchées">
            <ChipRow>
              {e.technosRecherchees.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </ChipRow>
          </DefRow>
          <DefRow terme="Profils recherchés">{e.profilsRecherches.join(", ")}</DefRow>
        </dl>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat valeur={candidats} libelle="Profils consultables" />
        <Stat valeur={prototypes} libelle="Prototypes livrés" />
        <Stat
          valeur={OPPORTUNITIES.filter((o) => o.companyId === e.id).length}
          libelle="Offres publiées"
        />
        <Stat valeur={1} libelle="Challenge sponsorisé" />
      </div>

      <Block titre="Le principe">
        <div className="rounded-card border border-accent bg-accent-soft p-5 sm:p-6">
          <p className="prose-measure text-body text-on-accent">
            Un CV dit ce qu'un étudiant a appris. SOA dit ce qu'il a{" "}
            <strong>terminé</strong>, ce qu'il a <strong>arrêté</strong> et pourquoi,
            ce qu'il a <strong>documenté</strong>, et à qui son travail a{" "}
            <strong>servi</strong>. C'est ce que vous regardez ici.
          </p>
          <p className="prose-measure mt-3 text-caption text-on-accent/80">
            Contrepartie explicite du cadrage : vous n'apparaissez jamais dans le
            parcours d'un étudiant tant qu'il n'a pas terminé ou repris un projet.
          </p>
        </div>
      </Block>

      <Block titre="Accès rapide">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              titre: "Talents",
              corps: "Recherche multicritère avec correspondance.",
              route: { name: "ent-talents" } as Route,
              icone: Search,
            },
            {
              titre: "Opportunités",
              corps: "Vos offres de projets et de stages.",
              route: { name: "ent-opportunites" } as Route,
              icone: Building2,
            },
            {
              titre: "Challenges",
              corps: "Sponsoriser un challenge encadré.",
              route: { name: "ent-challenges" } as Route,
              icone: Trophy,
            },
            {
              titre: "Prototypes",
              corps: "Découvrir les projets étudiants livrés.",
              route: { name: "ent-marketplace" } as Route,
              icone: Award,
            },
          ].map(({ titre, corps, route, icone: Icone }) => (
            <CardLink key={titre} href={hrefFor(route)} onClick={() => navigate(route)}>
              <Icone aria-hidden className="size-5 text-primary" />
              <h3 className="mt-3 text-body font-semibold text-ink">{titre}</h3>
              <p className="mt-1 text-caption text-ink-muted">{corps}</p>
            </CardLink>
          ))}
        </div>
      </Block>
    </WideScreen>
  );
}

/* ── E5 — Talent Discovery ──────────────────────────────────────────────── */

const NIVEAUX: (Niveau | "Tous")[] = ["Tous", "L2", "L3", "M1", "M2"];

export function TalentsScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { projects } = useSoa();
  const [techno, setTechno] = useState("");
  const [niveau, setNiveau] = useState<Niveau | "Tous">("Tous");
  const [minTermines, setMinTermines] = useState(0);

  /**
   * Le matching du cadrage : « 5 étudiants Java, 3+ projets terminés, actifs
   * 6 mois, disponibles stage » → correspondance en %.
   *
   * Chaque critère qui compte est **écrit dans `raisons`**. Une entreprise qui
   * ne peut pas expliquer pourquoi un candidat sort en tête ne peut pas s'en
   * servir — et un pourcentage opaque appliqué à des personnes est exactement
   * ce que le cadrage met en garde de ne pas devenir.
   */
  const resultats = useMemo<TalentMatch[]>(() => {
    return STUDENTS.map((s) => {
      const siens = projects.filter((p) => p.ownerId === s.id);
      const termines = siens.filter((p) => p.status === "Terminé").length;
      const score = reliabilityFor(s.id);
      const raisons: string[] = [];
      let points = 0;

      if (techno.trim()) {
        const t = s.technos.find(
          (x) => x.nom.toLowerCase() === techno.trim().toLowerCase(),
        );
        if (!t) return null;
        points += t.maitrise * 14;
        raisons.push(
          `${t.nom} — ${["découverte", "pratiqué", "à l'aise", "avancé"][t.maitrise - 1]}`,
        );
        if (t.valideePar) {
          points += 12;
          raisons.push(`Compétence validée par ${t.valideePar}`);
        }
      }

      if (niveau !== "Tous") {
        if (s.niveau !== niveau) return null;
        raisons.push(`Niveau ${s.niveau}`);
      }

      if (termines < minTermines) return null;
      if (termines > 0) {
        points += termines * 15;
        raisons.push(`${termines} projet${termines > 1 ? "s" : ""} terminé${termines > 1 ? "s" : ""}`);
      }

      const arretesDocumentes = siens.filter(
        (p) => p.status === "Abandonné" && p.raisonAbandon,
      ).length;
      if (arretesDocumentes > 0) {
        points += arretesDocumentes * 8;
        raisons.push(`${arretesDocumentes} impasse${arretesDocumentes > 1 ? "s" : ""} documentée${arretesDocumentes > 1 ? "s" : ""}`);
      }

      if (score) {
        points += Math.round(score.global / 4);
        raisons.push(`Fiabilité ${score.global}/100`);
      }

      return {
        student: s,
        correspondance: Math.min(98, points),
        raisons,
        score: score ?? {
          studentId: s.id,
          regularite: 0,
          projetsTermines: 0,
          documentation: 0,
          collaboration: 0,
          entraide: 0,
          global: 0,
        },
      };
    })
      .filter((r): r is TalentMatch => r !== null && r.correspondance > 0)
      .sort((a, b) => b.correspondance - a.correspondance);
  }, [projects, techno, niveau, minTermines]);

  return (
    <WideScreen>
      <ScreenHead
        eyebrow="E5 — Talent Discovery"
        titre="Chercher un profil"
        lede="Sur les preuves, pas sur les déclarations : projets terminés, impasses documentées, entraide."
        retour={{ name: "ent-accueil" }}
        onRetour={navigate}
      />

      <section className="mt-6 rounded-card border border-border bg-card p-5">
        <p className="label-eyebrow flex items-center gap-2">
          <Filter aria-hidden className="size-3.5" />
          Critères
        </p>

        <div className="mt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="techno" className="text-caption font-medium text-ink">
              Technologie
            </label>
            <input
              id="techno"
              value={techno}
              onChange={(e) => setTechno(e.target.value)}
              placeholder="Java, React, Python…"
              className="h-11 w-full rounded-sm border border-border bg-card px-3 text-body text-ink transition-colors duration-150 hover:border-border-strong focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-wash focus-visible:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-caption font-medium text-ink">Niveau</span>
            <Tabs valeurs={NIVEAUX} actif={niveau} onChange={setNiveau} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="termines" className="text-caption font-medium text-ink">
              Projets terminés — au moins {minTermines}
            </label>
            <input
              id="termines"
              type="range"
              min={0}
              max={3}
              value={minTermines}
              onChange={(e) => setMinTermines(Number(e.target.value))}
              className="h-11 w-full accent-[var(--color-primary)]"
            />
          </div>
        </div>
      </section>

      <Block titre={`${resultats.length} profil${resultats.length > 1 ? "s" : ""}`}>
        <div className="grid gap-3 lg:grid-cols-2">
          {resultats.map(({ student, correspondance, raisons }) => (
            <CardLink
              key={student.id}
              href={hrefFor({ name: "ent-talent", id: student.id })}
              onClick={() => navigate({ name: "ent-talent", id: student.id })}
            >
              <div className="flex items-start gap-4">
                <Avatar initiales={student.initiales} nom={student.nom} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-body font-semibold text-ink">{student.nom}</h3>
                      <p className="text-caption text-ink-muted">
                        {student.niveau} · {student.filiere}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-title tabular-nums text-primary">
                      {correspondance}%
                    </span>
                  </div>

                  <ul className="mt-3 flex flex-col gap-1">
                    {raisons.slice(0, 3).map((r) => (
                      <li key={r} className="flex gap-2 text-caption text-ink-muted">
                        <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardLink>
          ))}
        </div>

        {resultats.length === 0 && (
          <EmptyState
            title="Aucun profil ne correspond"
            body="Élargis les critères. Un filtre trop serré ne révèle pas un manque de candidats — il révèle un filtre trop serré."
          />
        )}
      </Block>
    </WideScreen>
  );
}

/* ── E3 + E4 — Fiche talent ─────────────────────────────────────────────── */

const COMPOSANTES: { cle: keyof ReliabilityScore; libelle: string; quoi: string }[] = [
  { cle: "regularite", libelle: "Régularité", quoi: "Fréquence des entrées de journal." },
  {
    cle: "projetsTermines",
    libelle: "Projets terminés",
    quoi: "Part des projets menés jusqu'à la livraison.",
  },
  {
    cle: "documentation",
    libelle: "Documentation",
    quoi: "Décisions et impasses écrites, lisibles par un tiers.",
  },
  {
    cle: "collaboration",
    libelle: "Collaboration",
    quoi: "Participation aux projets et challenges collectifs.",
  },
  { cle: "entraide", libelle: "Entraide", quoi: "Réponses au forum qui ont débloqué quelqu'un." },
];

export function TalentScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const { projects, journalFor } = useSoa();
  const etudiant = studentById(id);
  const score = reliabilityFor(id);

  if (!etudiant || !score) {
    return (
      <WideScreen>
        <EmptyState title="Profil introuvable" body="Le lien est peut-être périmé." />
      </WideScreen>
    );
  }

  const siens = projects.filter((p) => p.ownerId === etudiant.id);
  const termines = siens.filter((p) => p.status === "Terminé");
  const arretes = siens.filter((p) => p.status === "Abandonné" && p.raisonAbandon);
  const entrees = siens.reduce((n, p) => n + journalFor(p.id).length, 0);

  return (
    <WideScreen>
      <ScreenHead
        eyebrow="Recrutement sur preuves"
        titre={etudiant.nom}
        lede={`${etudiant.niveau} · ${etudiant.filiere} · ${etudiant.universite} · promo ${etudiant.promo}`}
        retour={{ name: "ent-talents" }}
        onRetour={navigate}
        actions={
          <>
            <Button variant="secondary">Valider une compétence</Button>
            <Button variant="primary">Proposer un entretien</Button>
          </>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
        <section className="rounded-card border border-border bg-card p-5 sm:p-6">
          <p className="label-eyebrow">E4 — Fiabilité projet</p>
          <div className="mt-4">
            <ScoreRing valeur={score.global} libelle="sur 100" />
          </div>

          {/* Le cadrage l'exige : indicateur d'engagement, pas d'intelligence.
              Le détail est affiché systématiquement, sinon le chiffre global
              devient un jugement opaque sur une personne. */}
          <p className="mt-4 rounded-sm bg-surface p-3 text-caption text-ink-muted">
            Indicateur d'<strong className="text-ink">engagement</strong>, pas
            d'intelligence ni de niveau technique. Il mesure la façon de mener un
            travail, rien d'autre.
          </p>

          <div className="mt-5 flex flex-col gap-4">
            {COMPOSANTES.map((c) => (
              <Progress
                key={c.cle}
                valeur={score[c.cle] as number}
                libelle={c.libelle}
                origine={c.quoi}
              />
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat valeur={termines.length} libelle="Terminés" ton="success" />
            <Stat valeur={arretes.length} libelle="Impasses documentées" />
            <Stat valeur={entrees} libelle="Décisions écrites" />
            <Stat valeur={etudiant.technos.length} libelle="Technologies" />
          </div>

          <section className="rounded-card border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-heading text-ink">Compétences</h2>
            <div className="mt-4 flex flex-col gap-4">
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
                      Validé par {t.valideePar} — E9
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {termines.length > 0 && (
            <section className="rounded-card border border-border bg-card p-5 sm:p-6">
              <h2 className="font-heading text-heading text-ink">Projets livrés</h2>
              <ul className="mt-4 flex flex-col gap-4">
                {termines.map((p) => (
                  <li key={p.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <p className="text-body font-medium text-ink">{p.nom}</p>
                    <p className="mt-1 text-caption text-ink-muted">{p.objectif}</p>
                    <ChipRow className="mt-2">
                      {p.technos.map((t) => (
                        <Chip key={t}>{t}</Chip>
                      ))}
                    </ChipRow>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {arretes.length > 0 && (
            <section className="rounded-card border border-border bg-card p-5 sm:p-6">
              <h2 className="font-heading text-heading text-ink">
                Projets arrêtés, et pourquoi
              </h2>
              <p className="mt-2 text-caption text-ink-muted">
                Ce que dit une impasse documentée : la personne sait reconnaître un
                mur, l'écrire, et le laisser exploitable. C'est rarement dans un CV.
              </p>
              <ul className="mt-4 flex flex-col gap-4">
                {arretes.map((p) => (
                  <li key={p.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <p className="text-body font-medium text-ink">{p.nom}</p>
                    <p className="mt-1 text-body text-ink-muted">{p.raisonAbandon}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </WideScreen>
  );
}

/* ── E2 — Opportunités publiées ─────────────────────────────────────────── */

export function CompanyOpportunitiesScreen({
  navigate,
}: {
  navigate: (to: Route) => void;
}) {
  const miennes = OPPORTUNITIES.filter((o) => o.companyId === ENTREPRISE_COURANTE.id);
  const autres = OPPORTUNITIES.filter((o) => o.companyId !== ENTREPRISE_COURANTE.id);

  return (
    <WideScreen>
      <ScreenHead
        eyebrow="E2"
        titre="Opportunités"
        lede="Des projets réels, pas seulement des offres d'emploi. C'est la distinction que pose le cadrage."
        retour={{ name: "ent-accueil" }}
        onRetour={navigate}
        actions={<Button variant="primary">Publier une offre</Button>}
      />

      <Block titre="Vos offres">
        <div className="flex flex-col gap-3">
          {miennes.map((o) => (
            <article key={o.id} className="rounded-card border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-title font-semibold text-ink">{o.titre}</h3>
                <Chip tone="primary">{o.nature}</Chip>
              </div>
              <p className="prose-measure mt-2 text-body text-ink-muted">{o.description}</p>
              <ChipRow className="mt-4">
                {o.technos.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
                <Chip>{o.dureeMois} mois</Chip>
              </ChipRow>
            </article>
          ))}
          {miennes.length === 0 && (
            <EmptyState title="Aucune offre publiée" body="Publier une offre la rend visible aux étudiants ayant un projet terminé." />
          )}
        </div>
      </Block>

      <Block titre="Autres offres de la plateforme">
        <div className="flex flex-col gap-3">
          {autres.map((o) => {
            const e = COMPANIES.find((c) => c.id === o.companyId);
            return (
              <div
                key={o.id}
                className="flex items-start justify-between gap-4 rounded-card border border-border bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="text-body font-medium text-ink">{o.titre}</p>
                  <p className="text-caption text-ink-muted">{e?.nom}</p>
                </div>
                <Chip>{o.nature}</Chip>
              </div>
            );
          })}
        </div>
      </Block>
    </WideScreen>
  );
}

/* ── E6 + E7 — Challenges sponsorisés ───────────────────────────────────── */

export function CompanyChallengesScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { challenges } = useSoa();
  const sponsorises = challenges.filter((c) => c.sponsorId);
  const libres = challenges.filter((c) => !c.sponsorId);

  return (
    <WideScreen>
      <ScreenHead
        eyebrow="E6 · E7"
        titre="Challenges"
        lede="Sponsoriser un challenge encadré par vos développeurs seniors, et observer les profils émerger sur un travail réel."
        retour={{ name: "ent-accueil" }}
        onRetour={navigate}
        actions={<Button variant="primary">Sponsoriser un challenge</Button>}
      />

      <Block titre="Sponsorisés">
        <div className="flex flex-col gap-3">
          {sponsorises.map((c) => {
            const sponsor = COMPANIES.find((e) => e.id === c.sponsorId);
            return (
              <article key={c.id} className="rounded-card border border-accent bg-accent-soft p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-title font-semibold text-on-accent">{c.titre}</h3>
                  <Chip tone="accent">{sponsor?.nom}</Chip>
                </div>
                <p className="prose-measure mt-2 text-body text-on-accent/80">
                  {c.description}
                </p>
                {c.recompense && (
                  <p className="mt-3 text-caption font-medium text-on-accent">
                    À la clé : {c.recompense}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-accent/40 pt-4">
                  <span className="text-caption text-on-accent">
                    {c.participants.length} participant{c.participants.length > 1 ? "s" : ""}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate({ name: "ent-talents" })}
                  >
                    Voir les profils
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </Block>

      <Block titre="Challenges libres">
        <div className="flex flex-col gap-3">
          {libres.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between gap-4 rounded-card border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="text-body font-medium text-ink">{c.titre}</p>
                <p className="text-caption text-ink-muted">
                  {c.dureeJours} jours · {c.participants.length} participants
                </p>
              </div>
              <Button variant="secondary" size="sm">
                Sponsoriser
              </Button>
            </div>
          ))}
        </div>
      </Block>
    </WideScreen>
  );
}

/* ── E10 — Marketplace de prototypes ────────────────────────────────────── */

export function MarketplaceScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { projects, journalFor } = useSoa();
  const prototypes = projects.filter((p) => p.public && p.status === "Terminé");

  return (
    <WideScreen>
      <ScreenHead
        eyebrow="E10"
        titre="Prototypes étudiants"
        lede="Des projets livrés, avec leur architecture et leurs décisions. Testables, finançables — ou une raison de recruter leur auteur."
        retour={{ name: "ent-accueil" }}
        onRetour={navigate}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {prototypes.map((p) => {
          const auteur = studentById(p.ownerId);
          const entrees = journalFor(p.id);
          return (
            <article key={p.id} className="rounded-card border border-border bg-card p-5 sm:p-6">
              <h3 className="text-title font-semibold text-ink">{p.nom}</h3>
              <p className="prose-measure mt-2 text-body text-ink-muted">{p.description}</p>

              <div className="mt-4 rounded-sm bg-surface p-4">
                <p className="label-eyebrow">Objectif atteint</p>
                <p className="mt-1 text-body text-ink">{p.objectif}</p>
              </div>

              <ChipRow className="mt-4">
                {p.technos.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
                <Chip>{entrees.length} décisions écrites</Chip>
              </ChipRow>

              {auteur && (
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <a
                    href={hrefFor({ name: "ent-talent", id: auteur.id })}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate({ name: "ent-talent", id: auteur.id });
                    }}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <Avatar initiales={auteur.initiales} nom={auteur.nom} taille="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-caption font-medium text-ink">
                        {auteur.nom}
                      </span>
                      <span className="block text-caption text-ink-muted">
                        {auteur.niveau} · {auteur.filiere}
                      </span>
                    </span>
                  </a>
                  <Button variant="secondary" size="sm">
                    Contacter
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {prototypes.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Aucun prototype livré"
            body="Les projets apparaissent ici quand leur auteur les passe en « Terminé » et les rend publics."
          />
        </div>
      )}
    </WideScreen>
  );
}
