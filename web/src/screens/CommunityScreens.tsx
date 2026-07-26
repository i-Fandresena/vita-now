import { motion } from "framer-motion";
import {
  Check,
  Handshake,
  Lightbulb,
  MessageCircle,
  Send,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import {
  COMPANIES,
  CURRENT_STUDENT,
  CURRENT_STUDENT_ID,
  MENTORS,
  STUDENTS,
  studentById,
} from "@/data/soa-corpus";
import {
  FORUM_CATEGORIES,
  joursDepuis,
  type Companion,
  type ForumCategory,
  type ForumThread,
} from "@/domain/soa";
import { cn } from "@/lib/cn";
import { rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Input, Textarea } from "@/ui/Field";
import { Avatar, Progress } from "@/ui/data";
import { Block, CardLink, Screen, ScreenHead, Tabs } from "@/ui/layout";
import { EmptyState } from "@/ui/states";

/**
 * CommunityScreens.tsx — le collectif : M8, M9, M10, M14, M18.
 *
 * Le cadrage place ces cinq modules côte à côte, et ils partagent une même
 * mécanique : quelqu'un d'autre sait ce que tu ne sais pas encore. L'écran
 * d'accueil de l'onglet est donc un aiguillage, pas une liste de plus.
 */

function dateCourte(iso: string): string {
  const j = joursDepuis(iso);
  if (j === 0) return "aujourd'hui";
  if (j === 1) return "hier";
  if (j < 30) return `il y a ${j} j`;
  return `il y a ${Math.round(j / 30)} mois`;
}

/* ── M8 — Accueil communauté ────────────────────────────────────────────── */

export function CommunityScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { threads } = useSoa();
  const [categorie, setCategorie] = useState<ForumCategory | "Tout">("Tout");

  const visibles =
    categorie === "Tout" ? threads : threads.filter((t) => t.categorie === categorie);

  const raccourcis = [
    {
      titre: "Compagnons",
      corps: "Trouver quelqu'un qui avance sur les mêmes choses que toi.",
      icone: UsersRound,
      route: { name: "compagnons" } as Route,
    },
    {
      titre: "Challenges",
      corps: "Un objectif borné dans le temps, tenu à plusieurs.",
      icone: Trophy,
      route: { name: "challenges" } as Route,
    },
    {
      titre: "Idées",
      corps: "Faire valider une idée avant d'y passer trois mois.",
      icone: Lightbulb,
      route: { name: "idees" } as Route,
    },
    {
      titre: "Mentorat",
      corps: "Demander à quelqu'un qui est déjà passé par là.",
      icone: Handshake,
      route: { name: "mentorat" } as Route,
    },
  ];

  return (
    <Screen>
      <ScreenHead
        titre="Communauté"
        lede="La plupart des blocages de l'école ont déjà été résolus par quelqu'un de l'école."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {raccourcis.map(({ titre, corps, icone: Icone, route }) => (
          <CardLink key={titre} href={hrefFor(route)} onClick={() => navigate(route)}>
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-sm bg-primary-wash text-primary"
              >
                <Icone className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-body font-semibold text-ink">{titre}</h2>
                <p className="mt-0.5 text-caption text-ink-muted">{corps}</p>
              </div>
            </div>
          </CardLink>
        ))}
      </div>

      <Block titre="Forum">
        <Tabs
          valeurs={["Tout", ...FORUM_CATEGORIES] as const}
          actif={categorie}
          onChange={setCategorie}
        />

        <div className="mt-4 flex flex-col gap-3">
          {visibles.map((t) => (
            <ThreadRow key={t.id} thread={t} navigate={navigate} />
          ))}
          {visibles.length === 0 && (
            <EmptyState
              title={`Aucun sujet en ${categorie}`}
              body="Sois le premier à poser la question. Un blocage écrit est déjà à moitié résolu."
            />
          )}
        </div>
      </Block>

      <NouveauSujet navigate={navigate} />
    </Screen>
  );
}

function ThreadRow({
  thread,
  navigate,
}: {
  thread: ForumThread;
  navigate: (to: Route) => void;
}) {
  const auteur = studentById(thread.auteurId);
  const resolu = Boolean(thread.resoluPar);

  return (
    <CardLink
      href={hrefFor({ name: "sujet", id: thread.id })}
      onClick={() => navigate({ name: "sujet", id: thread.id })}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-body font-semibold text-ink">{thread.titre}</h3>
        {resolu && (
          <Chip tone="success">
            <Check aria-hidden className="size-3.5" />
            Résolu
          </Chip>
        )}
      </div>

      <p className="line-clamp-2 mt-2 text-caption text-ink-muted">{thread.corps}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
        <Chip tone="primary">{thread.categorie}</Chip>
        <span className="flex items-center gap-1.5 text-caption text-ink-muted">
          <MessageCircle aria-hidden className="size-3.5" />
          {thread.reponses.length}
        </span>
        <span className="text-caption text-ink-muted">
          {auteur?.nom ?? "Anonyme"} · {dateCourte(thread.date)}
        </span>
      </div>
    </CardLink>
  );
}

function NouveauSujet({ navigate }: { navigate: (to: Route) => void }) {
  const { createThread } = useSoa();
  const [ouvert, setOuvert] = useState(false);
  const [categorie, setCategorie] = useState<ForumCategory>("Java");
  const [titre, setTitre] = useState("");
  const [corps, setCorps] = useState("");

  function soumettre(event: FormEvent) {
    event.preventDefault();
    if (!titre.trim()) return;
    const sujet = createThread({ categorie, titre: titre.trim(), corps: corps.trim() });
    setOuvert(false);
    setTitre("");
    setCorps("");
    navigate({ name: "sujet", id: sujet.id });
  }

  if (!ouvert) {
    return (
      <div className="mt-8">
        <Button variant="secondary" onClick={() => setOuvert(true)}>
          Poser une question
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="mt-8 flex flex-col gap-5 rounded-card border border-border bg-card p-5 sm:p-6"
    >
      <h2 className="font-heading text-heading text-ink">Poser une question</h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="label-eyebrow mb-2">Catégorie</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Catégorie">
          {FORUM_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === categorie}
              onClick={() => setCategorie(c)}
              className={cn(
                "h-11 rounded-full border px-4 text-body transition-colors duration-150",
                c === categorie
                  ? "border-primary bg-primary-wash font-medium text-primary"
                  : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <Input
        label="La question"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder="Arbitrer deux écritures concurrentes sans horloge fiable"
      />

      <Textarea
        label="Le contexte"
        rows={4}
        value={corps}
        onChange={(e) => setCorps(e.target.value)}
        hint="Ce que tu as déjà essayé compte autant que le problème. Sans ça, on te proposera ce que tu as déjà écarté."
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={!titre.trim()}>
          Publier
        </Button>
        <Button variant="ghost" onClick={() => setOuvert(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

/* ── M8 — Un sujet ──────────────────────────────────────────────────────── */

export function ThreadScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const { threadById, replyToThread } = useSoa();
  const thread = threadById(id);
  const [reponse, setReponse] = useState("");

  if (!thread) {
    return (
      <Screen>
        <EmptyState title="Sujet introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const auteur = studentById(thread.auteurId);

  function envoyer(event: FormEvent) {
    event.preventDefault();
    if (!reponse.trim()) return;
    replyToThread(thread!.id, reponse.trim());
    setReponse("");
  }

  return (
    <Screen>
      <ScreenHead
        eyebrow={thread.categorie}
        titre={thread.titre}
        retour={{ name: "communaute" }}
        onRetour={navigate}
      />

      <article className="mt-6 rounded-card border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Avatar
            initiales={auteur?.initiales ?? "??"}
            nom={auteur?.nom ?? "Anonyme"}
            taille="sm"
          />
          <div className="min-w-0">
            <p className="text-caption font-medium text-ink">{auteur?.nom}</p>
            <p className="text-caption text-ink-muted">
              {auteur?.niveau} · {dateCourte(thread.date)}
            </p>
          </div>
        </div>
        <p className="prose-measure mt-4 text-body text-ink">{thread.corps}</p>

        {thread.ressource && (
          <a
            href={thread.ressource.url}
            className="mt-5 flex items-center gap-2 rounded-sm border border-primary/25 bg-primary-wash p-3 text-caption font-medium text-primary"
          >
            <Sparkles aria-hidden className="size-4 shrink-0" />
            {thread.ressource.libelle}
          </a>
        )}
      </article>

      <Block titre={`${thread.reponses.length} réponse${thread.reponses.length > 1 ? "s" : ""}`}>
        <motion.div
          variants={sequence()}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3"
        >
          {thread.reponses.map((r) => {
            const a = studentById(r.auteurId);
            const accepte = thread.resoluPar === r.id;
            return (
              <motion.article
                key={r.id}
                variants={rise}
                className={cn(
                  "rounded-card border p-5",
                  accepte ? "border-success/40 bg-success/5" : "border-border bg-card",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      initiales={a?.initiales ?? "??"}
                      nom={a?.nom ?? "Anonyme"}
                      taille="sm"
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-caption font-medium text-ink">
                        {a?.nom}
                        {r.deMentor && <Chip tone="primary">Mentor</Chip>}
                      </p>
                      <p className="text-caption text-ink-muted">{dateCourte(r.date)}</p>
                    </div>
                  </div>
                  {accepte && (
                    <Chip tone="success">
                      <Check aria-hidden className="size-3.5" />
                      A résolu
                    </Chip>
                  )}
                </div>
                <p className="prose-measure mt-3 text-body text-ink">{r.corps}</p>
              </motion.article>
            );
          })}
        </motion.div>

        {thread.reponses.length === 0 && (
          <EmptyState
            title="Pas encore de réponse"
            body="Les questions les mieux écrites obtiennent des réponses les premières. Ajoute ce que tu as déjà essayé."
          />
        )}
      </Block>

      <form onSubmit={envoyer} className="mt-8 flex flex-col gap-4">
        <Textarea
          label="Répondre"
          rows={4}
          value={reponse}
          onChange={(e) => setReponse(e.target.value)}
          hint="Dis pourquoi ça marche, pas seulement quoi taper."
        />
        <div>
          <Button type="submit" variant="primary" disabled={!reponse.trim()}>
            <Send aria-hidden className="size-4" />
            Envoyer
          </Button>
        </div>
      </form>
    </Screen>
  );
}

/* ── M9 — Compagnons ────────────────────────────────────────────────────── */

/**
 * Le matching du cadrage (« recherche par niveau/techno/objectif/disponibilité »).
 *
 * Le pourcentage n'est **jamais** affiché seul : chaque correspondance porte
 * les raisons qui l'ont produite. Un chiffre nu ne se vérifie pas, et un
 * matching qu'on ne peut pas vérifier ne se croit pas.
 */
function calculerCompagnons(): Companion[] {
  const moi = CURRENT_STUDENT;
  const mesTechnos = new Set(moi.technos.map((t) => t.nom));
  const mesInterets = new Set(moi.interets);
  const mesDispos = new Set(moi.disponibilites);

  return STUDENTS.filter((s) => s.id !== moi.id)
    .map((s) => {
      const raisons: string[] = [];
      let points = 0;

      const technosCommunes = s.technos.filter((t) => mesTechnos.has(t.nom));
      if (technosCommunes.length > 0) {
        points += technosCommunes.length * 18;
        raisons.push(`${technosCommunes.map((t) => t.nom).join(", ")} en commun`);
      }

      const interetsCommuns = s.interets.filter((i) => mesInterets.has(i));
      if (interetsCommuns.length > 0) {
        points += interetsCommuns.length * 16;
        raisons.push(`Même centre d'intérêt : ${interetsCommuns.join(", ")}`);
      }

      const disposCommunes = s.disponibilites.filter((d) => mesDispos.has(d));
      if (disposCommunes.length > 0) {
        points += disposCommunes.length * 10;
        raisons.push(`Disponible ${disposCommunes.join(" et ").toLowerCase()}`);
      }

      // Un niveau au-dessus est un atout, pas un obstacle : c'est la logique
      // du mentorat (M18) appliquée à l'équipe.
      const ordre = ["L1", "L2", "L3", "M1", "M2"];
      const ecart = ordre.indexOf(s.niveau) - ordre.indexOf(moi.niveau);
      if (ecart > 0) {
        points += 12;
        raisons.push(`${s.niveau} — a déjà passé l'année que tu fais`);
      } else if (ecart === 0) {
        points += 8;
        raisons.push(`Même niveau (${s.niveau})`);
      }

      return {
        student: s,
        correspondance: Math.min(97, points),
        raisons,
      };
    })
    .filter((c) => c.correspondance > 0)
    .sort((a, b) => b.correspondance - a.correspondance);
}

export function CompanionsScreen({ navigate }: { navigate: (to: Route) => void }) {
  const compagnons = useMemo(calculerCompagnons, []);

  return (
    <Screen>
      <ScreenHead
        eyebrow="M9"
        titre="Trouver des compagnons"
        lede="Le cycle d'abandon commence souvent seul. Quelqu'un qui avance sur les mêmes choses que toi change la donne."
        retour={{ name: "communaute" }}
        onRetour={navigate}
      />

      <div className="mt-8 flex flex-col gap-3">
        {compagnons.map(({ student, correspondance, raisons }) => (
          <CardLink
            key={student.id}
            href={hrefFor({ name: "profil", id: student.id })}
            onClick={() => navigate({ name: "profil", id: student.id })}
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

                {/* Les raisons ne sont pas un détail : elles sont ce qui rend
                    le pourcentage vérifiable. */}
                <ul className="mt-3 flex flex-col gap-1">
                  {raisons.map((r) => (
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
    </Screen>
  );
}

/* ── M10 — Challenges ───────────────────────────────────────────────────── */

export function ChallengesScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { challenges } = useSoa();

  return (
    <Screen>
      <ScreenHead
        eyebrow="M10"
        titre="Challenges"
        lede="Un objectif borné dans le temps, et des gens qui avancent en même temps que toi."
        retour={{ name: "communaute" }}
        onRetour={navigate}
      />

      <div className="mt-8 flex flex-col gap-3">
        {challenges.map((c) => {
          const sponsor = COMPANIES.find((e) => e.id === c.sponsorId);
          const inscrit = c.participants.some((p) => p.studentId === CURRENT_STUDENT_ID);
          return (
            <CardLink
              key={c.id}
              href={hrefFor({ name: "challenge", id: c.id })}
              onClick={() => navigate({ name: "challenge", id: c.id })}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 text-body font-semibold text-ink">{c.titre}</h3>
                {inscrit && <Chip tone="primary">Inscrit</Chip>}
              </div>
              <p className="mt-2 text-caption text-ink-muted">{c.description}</p>
              <ChipRow className="mt-4">
                <Chip>{c.dureeJours} jours</Chip>
                <Chip>{c.techno}</Chip>
                <Chip>
                  {c.participants.length} participant{c.participants.length > 1 ? "s" : ""}
                </Chip>
                {sponsor && <Chip tone="accent">{sponsor.nom}</Chip>}
              </ChipRow>
            </CardLink>
          );
        })}
      </div>
    </Screen>
  );
}

export function ChallengeScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const { challenges, joinChallenge, checkChallengeWeek } = useSoa();
  const challenge = challenges.find((c) => c.id === id);

  if (!challenge) {
    return (
      <Screen>
        <EmptyState title="Challenge introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const sponsor = COMPANIES.find((e) => e.id === challenge.sponsorId);
  const moi = challenge.participants.find((p) => p.studentId === CURRENT_STUDENT_ID);
  const semainesEcoulees = Math.max(
    1,
    Math.min(Math.ceil(challenge.dureeJours / 7), Math.ceil(joursDepuis(challenge.debut) / 7)),
  );

  return (
    <Screen>
      <ScreenHead
        eyebrow="Challenge"
        titre={challenge.titre}
        lede={challenge.description}
        retour={{ name: "challenges" }}
        onRetour={navigate}
        actions={
          !moi && (
            <Button variant="primary" onClick={() => joinChallenge(challenge.id)}>
              Rejoindre
            </Button>
          )
        }
      />

      <ChipRow className="mt-5">
        <Chip>{challenge.dureeJours} jours</Chip>
        <Chip>{challenge.techno}</Chip>
        {sponsor && <Chip tone="accent">Sponsorisé par {sponsor.nom}</Chip>}
      </ChipRow>

      {challenge.recompense && (
        <div className="mt-6 rounded-card border border-accent bg-accent-soft p-5">
          <p className="label-eyebrow text-on-accent">À la clé</p>
          <p className="mt-1 text-body text-on-accent">{challenge.recompense}</p>
        </div>
      )}

      {moi && (
        <Block titre="Ton suivi hebdomadaire">
          <div className="rounded-card border border-border bg-card p-5">
            {/* Une case par semaine. Ce n'est pas une série à ne pas casser :
                on peut cocher, décocher, sauter une semaine et revenir
                (SPEC.md §2bis). */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: semainesEcoulees }, (_, i) => {
                const fait = moi.semaines[i] ?? false;
                return (
                  <button
                    key={i}
                    onClick={() => checkChallengeWeek(challenge.id, i)}
                    aria-pressed={fait}
                    aria-label={`Semaine ${i + 1}${fait ? ", point posé" : ", pas de point"}`}
                    className={cn(
                      "flex size-12 flex-col items-center justify-center rounded-sm border text-caption font-medium transition-colors duration-150",
                      fait
                        ? "border-primary bg-primary text-on-primary"
                        : "border-border text-ink-muted hover:border-border-strong",
                    )}
                  >
                    {fait ? <Check aria-hidden className="size-4" /> : i + 1}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-caption text-ink-muted">
              Une semaine sans point n'annule rien. Le suivi sert à voir où tu en
              es, pas à te faire tenir une série.
            </p>
          </div>
        </Block>
      )}

      <Block titre={`${challenge.participants.length} participants`}>
        <div className="flex flex-col gap-3">
          {challenge.participants.map((p) => {
            const s = studentById(p.studentId);
            if (!s) return null;
            const faits = p.semaines.filter(Boolean).length;
            return (
              <div
                key={p.studentId}
                className="flex items-center gap-4 rounded-card border border-border bg-card p-4"
              >
                <Avatar initiales={s.initiales} nom={s.nom} />
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-ink">{s.nom}</p>
                  <p className="text-caption text-ink-muted">
                    {s.niveau} · {s.filiere}
                  </p>
                </div>
                <span className="shrink-0 text-caption tabular-nums text-ink-muted">
                  {faits}/{semainesEcoulees} sem.
                </span>
              </div>
            );
          })}
        </div>
      </Block>
    </Screen>
  );
}

/* ── M14 — Validation d'idée ────────────────────────────────────────────── */

export function IdeasScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { ideas, voteIdea } = useSoa();

  return (
    <Screen>
      <ScreenHead
        eyebrow="M14"
        titre="Idées à valider"
        lede="Faire lire son idée avant de commencer coûte une journée. Découvrir l'obstacle au troisième mois en coûte trois."
        retour={{ name: "communaute" }}
        onRetour={navigate}
      />

      <div className="mt-8 flex flex-col gap-4">
        {ideas.map((idee) => {
          const auteur = studentById(idee.auteurId);
          const aVotePour = idee.votesPour.includes(CURRENT_STUDENT_ID);
          const aVoteReserve = idee.votesReserve.includes(CURRENT_STUDENT_ID);
          const total = idee.votesPour.length + idee.votesReserve.length;

          return (
            <article
              key={idee.id}
              className="rounded-card border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  initiales={auteur?.initiales ?? "??"}
                  nom={auteur?.nom ?? ""}
                  taille="sm"
                />
                <div className="min-w-0">
                  <p className="text-caption font-medium text-ink">{auteur?.nom}</p>
                  <p className="text-caption text-ink-muted">{dateCourte(idee.date)}</p>
                </div>
              </div>

              <h3 className="mt-4 text-title font-semibold text-ink">{idee.titre}</h3>
              <p className="prose-measure mt-2 text-body text-ink-muted">{idee.corps}</p>

              {total > 0 && (
                <div className="mt-5">
                  <Progress
                    valeur={(idee.votesPour.length / total) * 100}
                    libelle="Avis favorables"
                    origine={`${idee.votesPour.length} pour · ${idee.votesReserve.length} avec réserve`}
                  />
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant={aVotePour ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => voteIdea(idee.id, "pour")}
                >
                  {aVotePour ? "Tu es pour" : "Ça vaut le coup"}
                </Button>
                <Button
                  variant={aVoteReserve ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => voteIdea(idee.id, "reserve")}
                >
                  {aVoteReserve ? "Tu as émis une réserve" : "J'ai une réserve"}
                </Button>
              </div>

              {idee.commentaires.length > 0 && (
                <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
                  {idee.commentaires.map((c, i) => {
                    const a = studentById(c.auteurId);
                    return (
                      <div key={i} className="flex gap-3">
                        <Avatar
                          initiales={a?.initiales ?? "??"}
                          nom={a?.nom ?? ""}
                          taille="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-caption font-medium text-ink">{a?.nom}</p>
                          <p className="mt-0.5 text-body text-ink-muted">{c.corps}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </Screen>
  );
}

/* ── M18 — Mentorat ─────────────────────────────────────────────────────── */

export function MentorsScreen({ navigate }: { navigate: (to: Route) => void }) {
  return (
    <Screen>
      <ScreenHead
        eyebrow="M18"
        titre="Mentorat"
        lede="Des étudiants avancés et des alumni qui ont déjà buté là où tu butes. Viens avec un blocage précis, pas avec « je suis perdu »."
        retour={{ name: "communaute" }}
        onRetour={navigate}
      />

      <div className="mt-8 flex flex-col gap-3">
        {MENTORS.map((m) => {
          const s = studentById(m.studentId);
          if (!s) return null;
          return (
            <CardLink
              key={m.studentId}
              href={hrefFor({ name: "profil", id: s.id })}
              onClick={() => navigate({ name: "profil", id: s.id })}
            >
              <div className="flex items-start gap-4">
                <Avatar initiales={s.initiales} nom={s.nom} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-body font-semibold text-ink">{s.nom}</h3>
                      <p className="text-caption text-ink-muted">
                        {m.statut} · {s.filiere}
                      </p>
                    </div>
                    <Chip tone={m.disponible ? "success" : "neutral"}>
                      {m.disponible ? "Disponible" : "Complet"}
                    </Chip>
                  </div>

                  <p className="prose-measure mt-3 text-caption text-ink-muted">
                    {m.presentation}
                  </p>

                  <ChipRow className="mt-3">
                    {m.domaines.map((d) => (
                      <Chip key={d}>{d}</Chip>
                    ))}
                  </ChipRow>
                </div>
              </div>
            </CardLink>
          );
        })}
      </div>
    </Screen>
  );
}
