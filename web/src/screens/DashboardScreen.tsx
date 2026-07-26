import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Clock, Plus, Sparkles } from "lucide-react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import { joursDepuis, type Project } from "@/domain/soa";
import { cn } from "@/lib/cn";
import { rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Progress, Rhythm, Stat } from "@/ui/data";
import { CardLink, Screen, ScreenHead } from "@/ui/layout";

/**
 * Tableau de bord — M19, mobile d'abord.
 *
 * Ordre de lecture décidé par le contenu, pas par la symétrie
 * (`content-priority` : sur mobile, ce qui compte passe en premier) :
 *
 *   1. **La reprise**, s'il y a un projet en sommeil. C'est la seule chose qui
 *      répond au premier échec de la lettre, donc elle passe avant tout — y
 *      compris avant les chiffres.
 *   2. Les projets actifs, avec leur avancement.
 *   3. Le rythme des douze dernières semaines.
 *   4. Les chiffres du cadrage (M19 : commencés / terminés / techno principale).
 *
 * Ce qui n'est **pas** ici, et c'est délibéré : aucun score, aucune série,
 * aucun classement (SPEC.md §2bis). Le tableau de bord est un chemin de
 * reprise ; les mécaniques de reconnaissance vivent dans le profil.
 *
 * **Premier lancement.** Un compte neuf n'a ni projet, ni journal, ni capsule.
 * Le rythme et les chiffres n'affichent alors que des zéros : douze colonnes
 * vides, « 0 sur 0 », une techno principale à « — ». Ce n'est pas une mesure,
 * c'est du bruit — et sur un écran de 375px il occupe tout ce qu'on voit en
 * premier. Ces deux sections sont donc **retirées** tant qu'aucun projet
 * n'existe, au profit des deux seuls gestes qui ont un sens à ce moment :
 * en commencer un, ou en reprendre un qu'un autre a arrêté.
 */

function heureDuJour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function CarteReprise({ navigate }: { navigate: (to: Route) => void }) {
  const { capsule } = useSoa();
  if (!capsule) return null;

  const jours = joursDepuis(capsule.lastActivity);

  return (
    <motion.section
      variants={rise}
      className="rounded-card border border-primary/25 bg-primary-wash p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Clock aria-hidden className="size-4 text-primary" />
        {/* Le nombre de jours est un fait, pas un reproche : pas de gros
            caractères, pas de « déjà », pas de point d'exclamation
            (SPEC.md §2bis). */}
        <span className="text-caption font-medium text-primary">
          En sommeil depuis {jours} jour{jours > 1 ? "s" : ""}
        </span>
      </div>

      <h2 className="mt-3 font-heading text-heading text-ink">{capsule.projectTitle}</h2>

      <div className="mt-4 flex flex-col gap-3">
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
          Chercher ce blocage
        </Button>
      </div>
    </motion.section>
  );
}

function LigneProjet({
  projet,
  navigate,
}: {
  projet: Project;
  navigate: (to: Route) => void;
}) {
  const { progressOf } = useSoa();
  const avance = progressOf(projet.id);
  const jours = joursDepuis(projet.derniereActivite);

  return (
    <CardLink
      href={hrefFor({ name: "projet", id: projet.id })}
      onClick={() => navigate({ name: "projet", id: projet.id })}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-body font-semibold text-ink">{projet.nom}</h3>
        <ArrowRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-ink-muted transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </div>

      <ChipRow className="mt-3">
        <Chip tone={projet.status === "En cours" ? "primary" : "neutral"}>
          {projet.status}
        </Chip>
        <Chip>{projet.technos[0]}</Chip>
      </ChipRow>

      <Progress
        className="mt-4"
        valeur={avance}
        libelle="Avancement"
        origine={`Déduit du journal · dernière entrée il y a ${jours} jour${jours > 1 ? "s" : ""}`}
      />
    </CardLink>
  );
}

export function DashboardScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { myProjects, analytics, capsule, me } = useSoa();
  const reduced = useReducedMotion() ?? false;

  const actifs = myProjects.filter(
    (p) => p.status === "En cours" || p.status === "En pause",
  );
  /* Le prénom vient de la session, pas du corpus : modifier son nom dans son
     profil — ou se connecter avec un autre compte — doit changer qui l'écran
     salue. Avec la persistance, une salutation figée survivrait au
     rechargement et deviendrait un défaut permanent. */
  const prenom = me.nom.split(" ")[0] ?? me.nom;

  /* Aucun projet du tout — compte neuf, ou tous archivés. L'état se lit sur
     `myProjects` et non sur `actifs` : quelqu'un dont les projets sont tous
     terminés a bien un rythme et des chiffres à montrer. */
  const debutant = myProjects.length === 0;

  return (
    <Screen>
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
          <Button variant="primary" onClick={() => navigate({ name: "projet-nouveau" })}>
            <Plus aria-hidden className="size-4" />
            Nouveau projet
          </Button>
        }
      />

      <motion.div
        variants={sequence(reduced ? 0 : 0.05)}
        initial="hidden"
        animate="visible"
        className="mt-8 flex flex-col gap-10"
      >
        <CarteReprise navigate={navigate} />

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
                  {debutant ? "Ton premier projet t'attend." : "Aucun projet en cours."}
                </p>
                <p className="mt-1 text-body text-ink-muted">
                  Reprendre un projet arrêté coûte moins cher que d'en commencer un.
                </p>
                {/* Les deux sorties sont côte à côte sur un compte neuf : le
                    bouton « Nouveau projet » de l'en-tête est loin du pouce sur
                    un téléphone, et c'est ici que la question se pose. */}
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
          <motion.section variants={rise}>
            <div className="rounded-card border border-border bg-card p-5 sm:p-6">
              <Rhythm valeurs={analytics.rythme} libelle="Ton rythme d'écriture" />
              <p className="mt-4 text-caption text-ink-muted">
                Une colonne par semaine — une entrée de journal, une décision, une
                erreur documentée. Une semaine vide est une information, pas une faute.
              </p>
            </div>
          </motion.section>
        )}

        {!debutant && (
          <motion.section variants={rise}>
            <h2 className="font-heading text-heading text-ink">Où tu en es</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat valeur={analytics.projetsCommences} libelle="Projets commencés" />
              <Stat
                valeur={analytics.projetsTermines}
                libelle="Terminés"
                ton="success"
                detail={`sur ${analytics.projetsCommences}`}
              />
              <Stat valeur={analytics.entreesJournal} libelle="Entrées de journal" />
              <Stat
                valeur={
                  <span className="text-title font-semibold">
                    {analytics.technoPrincipale}
                  </span>
                }
                libelle="Techno principale"
              />
            </div>
          </motion.section>
        )}

        <motion.section variants={rise}>
          <CardLink
            href={hrefFor({ name: "renaissance" })}
            onClick={() => navigate({ name: "renaissance" })}
            className={cn("border-accent bg-accent-soft")}
          >
            <div className="flex items-start gap-3">
              <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-on-accent" />
              <div className="min-w-0">
                <h3 className="font-heading text-heading text-on-accent">Renaissance</h3>
                <p className="mt-1 text-body text-on-accent/80">
                  Des projets arrêtés par d'autres attendent. Leur journal et leur
                  raison d'abandon sont déjà écrits — tu ne repars pas de zéro.
                </p>
              </div>
            </div>
          </CardLink>
        </motion.section>
      </motion.div>
    </Screen>
  );
}
