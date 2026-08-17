import { motion } from "framer-motion";
import { Handshake, Lightbulb, Link2, MessageCircle, TrendingUp } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import { COMPANIES, MENTORS, STUDENTS, studentById } from "@/data/soa-corpus";
import {
  FORUM_CATEGORIES,
  joursDepuis,
  type Companion,
  type ForumCategory,
  type ForumThread,
  type Student,
} from "@/domain/soa";
import { cn } from "@/lib/cn";
import { rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Input, Textarea } from "@/ui/Field";
import { Avatar, Progress } from "@/ui/data";
import { Icon } from "@/ui/Icon";
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

/**
 * Les quatre aiguillages de l'onglet. Sortis du composant : ce sont des
 * constantes de navigation, pas un état — les recréer à chaque rendu ne sert
 * qu'à donner de nouvelles références à React.
 */
const RACCOURCIS = [
  {
    titre: "Compagnons",
    corps: "Trouver quelqu'un qui avance sur les mêmes choses que toi.",
    icone: (props: { className?: string }) => <Icon name="user" size={20} {...props} />,
    route: { name: "compagnons" } as Route,
  },
  {
    titre: "Challenges",
    corps: "Un objectif borné dans le temps, tenu à plusieurs.",
    icone: (props: { className?: string }) => <Icon name="trophy" size={20} {...props} />,
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

/**
 * L'écran se lit en deux colonnes au-delà de 1024px : le fil à gauche, les
 * indicateurs à droite. En dessous, la colonne de droite passe **sous** le fil
 * et non au-dessus — l'ordre du DOM est celui de la lecture, et ce qu'on vient
 * chercher ici est le fil, pas le classement.
 */
export function CommunityScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { threads, projects, students, me } = useSoa();
  const [categorie, setCategorie] = useState<ForumCategory | "Tout">("Tout");
  const [brouillon, setBrouillon] = useState("");
  const [redige, setRedige] = useState(false);

  const visibles =
    categorie === "Tout" ? threads : threads.filter((t) => t.categorie === categorie);

  const reponses = threads.reduce((total, t) => total + t.reponses.length, 0);

  /* Les technos qui reviennent le plus, comptées sur les projets réellement
     présents. Ce n'est pas une tendance de la semaine : le corpus n'a pas
     l'historique qu'il faudrait pour en calculer une, et l'annoncer comme
     telle serait un chiffre inventé. La légende du bloc le dit. */
  const technos = useMemo(() => {
    const compte = new Map<string, number>();
    for (const p of projects) {
      for (const t of p.technos) compte.set(t, (compte.get(t) ?? 0) + 1);
    }
    return [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [projects]);

  /* « Ceux qui livrent » : le classement porte sur les projets terminés, pas
     sur une activité ou un nombre de messages. C'est la seule mesure que le
     cadrage assume — un projet livré est un fait vérifiable. */
  const livreurs = useMemo(
    () =>
      students
        .map((e) => ({
          etudiant: e,
          livres: projects.filter((p) => p.ownerId === e.id && p.status === "Terminé")
            .length,
        }))
        .filter((x) => x.livres > 0)
        .sort((a, b) => b.livres - a.livres)
        .slice(0, 4),
    [students, projects],
  );

  return (
    <Screen>
      {/* La bascule est à `xl`, pas à `lg`. À 1024px, le rail latéral prend
          déjà 240px : une colonne de droite de 19rem laisserait au fil moins de
          400px, soit une carte plus étroite que sur un téléphone. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {/* Le cadre d'accueil. L'emblème remplace la forme jaune dans
              l'angle : il porte déjà les deux couleurs de la marque, donc rien
              n'est perdu du contraste, et le jaune redevient disponible pour ce
              qu'il signifie ailleurs — la réussite.

              Il est décoratif : `alt=""`, aucun texte à annoncer. La marque est
              déjà nommée dans le rail, la répéter à un lecteur d'écran ne dit
              rien de plus. Il n'est pas rogné par le cadre, contrairement à la
              forme qu'il remplace : une tache se coupe, un logo non.

              Masqué sous 640px, où la largeur revient au texte. */}
          <header className="relative overflow-hidden rounded-card border border-border bg-card p-6 shadow-card sm:p-8">
            <img
              src="/logo-vita-now.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute top-5 right-5 hidden h-24 w-auto sm:block sm:h-28"
            />

            <div className="relative max-w-[44ch]">
              {/* `.hand-note` — une par écran, c'est la règle du fichier de
                  styles. Elle est dépensée ici, pas dans les blocs de droite. */}
              <span className="hand-note">La cour de récré</span>
              <h1 className="mt-1 font-display text-display-3 text-ink sm:text-display-2">
                Communauté
              </h1>
              <p className="mt-3 text-body text-ink-muted">
                {students.length} étudiants, {threads.length} sujets ouverts,{" "}
                {reponses} réponses. La plupart des blocages de l'école ont déjà été
                résolus par quelqu'un de l'école.
              </p>
            </div>

            {/* Le composeur ouvre le formulaire complet plutôt que de publier
                directement : un sujet sans catégorie ne se retrouve pas, et
                sans contexte il ne reçoit pas de réponse. Ce qui est tapé ici
                est repris tel quel dans le champ du dessous — rien n'est
                perdu, et c'est ce qui rend l'étape acceptable. */}
            <div className="relative mt-6 flex items-center gap-3 rounded-full border border-border bg-surface py-2 pr-2 pl-3">
              <Avatar initiales={me.initiales} nom={me.nom} taille="sm" />
              <input
                value={brouillon}
                onChange={(e) => setBrouillon(e.target.value)}
                onFocus={() => setRedige(true)}
                aria-label="Poser une question à la communauté"
                placeholder="Un blocage, une question, une solution trouvée…"
                className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
              />
              <Button
                variant="primary"
                size="sm"
                className="shrink-0"
                onClick={() => setRedige(true)}
              >
                <Icon name="sparkle" size={16} aria-hidden />
                Publier
              </Button>
            </div>
          </header>

          {redige && (
            <NouveauSujet
              titre={brouillon}
              setTitre={setBrouillon}
              onFerme={() => setRedige(false)}
              navigate={navigate}
            />
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {RACCOURCIS.map(({ titre, corps, icone: Icone, route }) => (
              <CardLink key={titre} href={hrefFor(route)} onClick={() => navigate(route)}>
                <span
                  aria-hidden
                  className="grid size-10 place-items-center rounded-sm bg-primary-wash text-primary"
                >
                  <Icone className="size-5" />
                </span>
                <h2 className="mt-3 text-body font-semibold text-ink">{titre}</h2>
                <p className="mt-0.5 line-clamp-2 text-caption text-ink-muted">{corps}</p>
              </CardLink>
            ))}
          </div>

          <Tabs
            valeurs={["Tout", ...FORUM_CATEGORIES] as const}
            actif={categorie}
            onChange={setCategorie}
            className="mt-6"
          />

          <motion.div
            variants={sequence(0.04)}
            initial="hidden"
            animate="visible"
            className="mt-4 flex flex-col gap-4"
          >
            {visibles.map((t) => (
              <motion.div key={t.id} variants={rise}>
                <PostCard thread={t} navigate={navigate} />
              </motion.div>
            ))}
          </motion.div>

          {visibles.length === 0 && (
            <EmptyState
              title={`Aucun sujet en ${categorie}`}
              body="Sois le premier à poser la question. Un blocage écrit est déjà à moitié résolu."
            />
          )}
        </div>

        {/* Les deux indicateurs. Ils collent au défilement sur grand écran :
            ils accompagnent la lecture du fil, ils ne s'en éloignent pas. */}
        <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-card border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2">
              <TrendingUp aria-hidden className="size-4 shrink-0 text-primary" />
              <h2 className="font-heading text-heading text-ink">Ce qui revient</h2>
            </div>

            <ul className="mt-4 flex flex-col gap-3">
              {technos.map(([nom, n]) => (
                <li key={nom} className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-body font-medium text-ink">#{nom}</span>
                  <span className="shrink-0 text-caption tabular-nums text-ink-muted">
                    {n} projet{n > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 border-t border-border pt-3 text-caption text-ink-muted">
              Compté sur les {projects.length} projets publiés. Ce n'est pas une
              tendance de la semaine : il n'y a pas d'historique pour en calculer une.
            </p>
          </section>

          {livreurs.length > 0 && (
            <section className="rounded-card border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Icon name="trophy" size={16} aria-hidden className="shrink-0 text-primary" />
                <h2 className="font-heading text-heading text-ink">Ceux qui livrent</h2>
              </div>

              <ul className="mt-4 flex flex-col gap-1">
                {livreurs.map(({ etudiant, livres }) => (
                  <li key={etudiant.id}>
                    <a
                      href={hrefFor({ name: "profil", id: etudiant.id })}
                      onClick={(event) => {
                        event.preventDefault();
                        navigate({ name: "profil", id: etudiant.id });
                      }}
                      className="-mx-2 flex items-center gap-3 rounded-sm px-2 py-2 transition-colors duration-150 hover:bg-surface"
                    >
                      <Avatar
                        initiales={etudiant.initiales}
                        nom={etudiant.nom}
                        taille="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium text-ink">
                          {etudiant.nom}
                        </span>
                        <span className="block truncate text-caption text-ink-muted">
                          {etudiant.niveau} · {etudiant.filiere}
                        </span>
                      </span>
                      <span className="shrink-0 text-caption font-medium tabular-nums text-primary">
                        {livres} livré{livres > 1 ? "s" : ""}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <p className="mt-4 border-t border-border pt-3 text-caption text-ink-muted">
                Classés sur les projets terminés — pas sur le nombre de messages.
              </p>
            </section>
          )}
        </aside>
      </div>
    </Screen>
  );
}

/**
 * Une carte du fil.
 *
 * L'auteur passe en tête, avant le titre : dans un forum d'école, savoir qui
 * parle change la façon dont on lit la question — un M1 et un mentor ne
 * décrivent pas le même blocage.
 *
 * Il n'y a **ni compteur de likes ni bouton de partage**. Le domaine n'a pas de
 * likes, et la maquette les montre ; les afficher voudrait dire écrire un
 * chiffre décoratif sous chaque sujet. Le pied de carte ne porte donc que ce
 * qui est vrai : les réponses, le passage d'un mentor, la résolution.
 */
function PostCard({
  thread,
  navigate,
}: {
  thread: ForumThread;
  navigate: (to: Route) => void;
}) {
  const auteur = studentById(thread.auteurId);
  const resolu = Boolean(thread.resoluPar);
  const parMentor = thread.reponses.some((r) => r.deMentor);

  return (
    <CardLink
      href={hrefFor({ name: "sujet", id: thread.id })}
      onClick={() => navigate({ name: "sujet", id: thread.id })}
      className="p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            initiales={auteur?.initiales ?? "??"}
            nom={auteur?.nom ?? "Anonyme"}
          />
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-ink">
              {auteur?.nom ?? "Anonyme"}
            </p>
            <p className="truncate text-caption text-ink-muted">
              {auteur ? `${auteur.niveau} · ${auteur.filiere} · ` : ""}
              {dateCourte(thread.date)}
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 font-heading text-micro text-ink-muted">
          {thread.categorie}
        </span>
      </div>

      <h3 className="mt-4 font-heading text-heading text-ink">{thread.titre}</h3>
      <p className="mt-2 line-clamp-3 text-body text-ink-muted">{thread.corps}</p>

      {thread.ressource && (
        <span className="mt-3 inline-flex max-w-full items-center gap-2 text-caption text-primary">
          <Link2 aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{thread.ressource.libelle}</span>
        </span>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4">
        <span className="flex items-center gap-1.5 text-caption text-ink-muted">
          <MessageCircle aria-hidden className="size-4" />
          {thread.reponses.length} réponse{thread.reponses.length > 1 ? "s" : ""}
        </span>

        {parMentor && (
          <span className="flex items-center gap-1.5 text-caption text-ink">
            <Handshake aria-hidden className="size-4" />
            Un mentor a répondu
          </span>
        )}

        {resolu && (
          <Chip tone="success" className="ml-auto">
            <Icon name="check" size={14} aria-hidden />
            Résolu
          </Chip>
        )}
      </div>
    </CardLink>
  );
}

/**
 * Le formulaire complet, ouvert par le composeur.
 *
 * Le titre est piloté par l'écran : c'est la phrase déjà tapée dans la barre du
 * haut. Le reste — catégorie, contexte — lui appartient.
 */
function NouveauSujet({
  titre,
  setTitre,
  onFerme,
  navigate,
}: {
  titre: string;
  setTitre: (v: string) => void;
  onFerme: () => void;
  navigate: (to: Route) => void;
}) {
  const { createThread } = useSoa();
  const [categorie, setCategorie] = useState<ForumCategory>("Java");
  const [corps, setCorps] = useState("");

  function soumettre(event: FormEvent) {
    event.preventDefault();
    if (!titre.trim()) return;
    const sujet = createThread({ categorie, titre: titre.trim(), corps: corps.trim() });
    setTitre("");
    setCorps("");
    onFerme();
    navigate({ name: "sujet", id: sujet.id });
  }

  return (
    <form
      onSubmit={soumettre}
      className="mt-4 flex flex-col gap-5 rounded-card border border-border bg-card p-5 shadow-card sm:p-6"
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
        <Button variant="ghost" onClick={onFerme}>
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
            <Icon name="sparkle" size={16} aria-hidden className="shrink-0" />
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
                      <Icon name="check" size={14} aria-hidden />
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
            <Icon name="send" size={16} aria-hidden />
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
function calculerCompagnons(moi: Student): Companion[] {
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
  /* Le matching part de la session vivante, pas de la constante du corpus :
     modifier ses technos dans son profil doit changer ses correspondances. */
  const { me } = useSoa();
  const compagnons = useMemo(() => calculerCompagnons(me), [me]);

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
                      <Icon name="check" size={14} aria-hidden className="mt-0.5 shrink-0 text-primary" />
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
  const { challenges, me } = useSoa();

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
          const inscrit = c.participants.some((p) => p.studentId === me.id);
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
  const { challenges, joinChallenge, checkChallengeWeek, me } = useSoa();
  const challenge = challenges.find((c) => c.id === id);

  if (!challenge) {
    return (
      <Screen>
        <EmptyState title="Challenge introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const sponsor = COMPANIES.find((e) => e.id === challenge.sponsorId);
  const moi = challenge.participants.find((p) => p.studentId === me.id);
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
                    {fait ? <Icon name="check" size={16} aria-hidden /> : i + 1}
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

function CommentaireIdee({ ideaId }: { ideaId: string }) {
  const { commentIdea } = useSoa();
  const [corps, setCorps] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!corps.trim()) return;
        commentIdea(ideaId, corps.trim());
        setCorps("");
      }}
      className="mt-4 flex flex-col gap-3"
    >
      <Textarea
        label="Commenter"
        rows={2}
        value={corps}
        onChange={(e) => setCorps(e.target.value)}
        hint="L'obstacle que l'auteur n'a pas vu vaut mieux qu'un encouragement."
      />
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={!corps.trim()}>
          Publier le commentaire
        </Button>
      </div>
    </form>
  );
}

export function IdeasScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { ideas, voteIdea, me } = useSoa();

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
          const aVotePour = idee.votesPour.includes(me.id);
          const aVoteReserve = idee.votesReserve.includes(me.id);
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

              <div className="mt-5 border-t border-border pt-5">
                {idee.commentaires.length > 0 && (
                <div className="flex flex-col gap-3">
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
                <CommentaireIdee ideaId={idee.id} />
              </div>
            </article>
          );
        })}
      </div>
    </Screen>
  );
}

/* ── M18 — Mentorat ─────────────────────────────────────────────────────── */

function DemandeMentor({ mentorId, nom }: { mentorId: string; nom: string }) {
  const { askMentor } = useSoa();
  const [ouvert, setOuvert] = useState(false);
  const [blocage, setBlocage] = useState("");
  const [envoye, setEnvoye] = useState(false);

  if (envoye) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-sm bg-success/10 p-3 text-caption text-success">
        <Icon name="check" size={16} aria-hidden className="shrink-0" />
        Demande envoyée à {nom.split(" ")[0]}.
      </p>
    );
  }

  if (!ouvert) {
    return (
      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={() => setOuvert(true)}>
          Demander de l'aide
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!blocage.trim()) return;
        askMentor(mentorId, blocage.trim());
        setEnvoye(true);
      }}
      className="mt-4 flex flex-col gap-3"
    >
      <Textarea
        label="Ton blocage"
        rows={3}
        value={blocage}
        onChange={(e) => setBlocage(e.target.value)}
        hint="Un blocage précis, pas « je suis perdu ». Dis ce que tu as déjà essayé — c'est ce qui permet une réponse utile du premier coup."
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={!blocage.trim()}>
          Envoyer
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOuvert(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

/** Le fil des demandes — un annuaire sans suite ne « guide » personne. */
function MesDemandes() {
  const { mentorRequests, answerMentorRequest } = useSoa();
  const [reponses, setReponses] = useState<Record<string, string>>({});

  if (mentorRequests.length === 0) return null;

  return (
    <Block titre="Les demandes en cours">
      <div className="flex flex-col gap-3">
        {mentorRequests.map((d) => {
          const mentor = studentById(d.mentorId);
          const demandeur = studentById(d.studentId);
          return (
            <article key={d.id} className="rounded-card border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-caption text-ink-muted">
                  {demandeur?.nom} → {mentor?.nom}
                </p>
                <Chip tone={d.statut === "résolu" ? "success" : "primary"}>{d.statut}</Chip>
              </div>

              <p className="prose-measure mt-3 text-body text-ink">{d.blocage}</p>

              {d.reponses.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                  {d.reponses.map((r, i) => {
                    const a = studentById(r.auteurId);
                    return (
                      <div key={i} className="flex gap-3">
                        <Avatar
                          initiales={a?.initiales ?? "??"}
                          nom={a?.nom ?? ""}
                          taille="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-caption font-medium text-ink">{a?.nom}</p>
                          <p className="mt-0.5 text-body text-ink-muted">{r.corps}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {d.statut !== "résolu" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const corps = (reponses[d.id] ?? "").trim();
                    if (!corps) return;
                    answerMentorRequest(d.id, corps);
                    setReponses({ ...reponses, [d.id]: "" });
                  }}
                  className="mt-4 flex flex-col gap-3 border-t border-border pt-4"
                >
                  <Textarea
                    label="Répondre"
                    rows={2}
                    value={reponses[d.id] ?? ""}
                    onChange={(e) => setReponses({ ...reponses, [d.id]: e.target.value })}
                  />
                  <div>
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      disabled={!(reponses[d.id] ?? "").trim()}
                    >
                      <Icon name="send" size={16} aria-hidden />
                      Envoyer
                    </Button>
                  </div>
                </form>
              )}
            </article>
          );
        })}
      </div>
    </Block>
  );
}

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
            <div
              key={m.studentId}
              className="rounded-card border border-border bg-card p-4 sm:p-5"
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

                  {m.disponible && <DemandeMentor mentorId={s.id} nom={s.nom} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <MesDemandes />
    </Screen>
  );
}
