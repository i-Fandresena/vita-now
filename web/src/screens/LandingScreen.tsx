import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Bell,
  Brain,
  Check,
  MessageCircle,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import type { Route } from "@/app/router";
import { cn } from "@/lib/cn";
import { rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Chip, ChipRow, Eyebrow, Section, SectionHead } from "@/ui/Editorial";
import { Surface } from "@/ui/Surface";

/**
 * Écran 0 — la landing publique.
 *
 * Structure relevée sur le template de l'équipe (DESIGN.md) : onze sections,
 * dans cet ordre. Ce qui a été **délibérément changé**, et pourquoi :
 *
 *   · Les chiffres du template (12k+ étudiants, 38k projets finis, 4,9/5,
 *     150+ écoles) et son témoignage signé sont inventés. Les publier sur un
 *     site en ligne les présente comme réels. Ils sont remplacés par ce que le
 *     produit promet, qui est vérifiable, et par un extrait de la lettre de Soa
 *     — le sujet du hackathon — attribué comme tel.
 *   · Le bandeau d'écoles (EPITECH, 42, HEC…) devient un bandeau de domaines
 *     techniques : ce sont les catégories réelles du cadrage.
 *   · Les intégrations annoncées (Notion, Drive, Figma, Slack) n'existent pas
 *     au cadrage. Seul GitHub/GitLab y figure, et en mock.
 *
 * Ces trois écarts sont consignés dans DESIGN.md et attendent l'arbitrage de
 * l'équipe (BACKLOG.md P1.1).
 */

const DOMAINES = ["Java", "PHP", "React", "IA", "Base de données", "Réseau"];

const PILIERS = [
  {
    icon: Brain,
    titre: "Mémoire de projet",
    corps:
      "Chaque décision, chaque impasse, chaque raison d'un choix reste attachée au projet. Tu reprends sans relire trois semaines de code.",
  },
  {
    icon: RotateCcw,
    titre: "Reprise guidée",
    corps:
      "Après une pause, SOA te rend où tu en étais, ce qui bloquait, et une seule action de dix minutes pour repartir.",
  },
  {
    icon: MessageCircle,
    titre: "Communauté vivante",
    corps:
      "Les mémoires et les projets de l'école deviennent consultables. Quelqu'un a déjà résolu ce sur quoi tu bloques.",
  },
] as const;

const ETAPES = [
  {
    titre: "Décris ton projet",
    corps:
      "En une phrase. SOA structure un objectif, des étapes et une échéance réaliste.",
    apercu: ["Idée", "MVP", "Design", "Dev", "Livraison"],
  },
  {
    titre: "Avance chaque jour",
    corps:
      "Ton journal se remplit à mesure. Les décisions et les erreurs sont conservées, pas seulement les tâches cochées.",
    apercu: ["Décision", "Erreur", "Solution", "Architecture"],
  },
  {
    titre: "Transmets",
    corps:
      "Ton projet terminé — ou arrêté — devient une ressource pour l'étudiant qui butera au même endroit l'année prochaine.",
    apercu: ["Portfolio", "Renaissance", "Retour à l'auteur"],
  },
] as const;

const FAQ = [
  {
    q: "SOA est-il gratuit pour les étudiants ?",
    r: "Oui. L'accès étudiant est gratuit — c'est la condition pour que le corpus de l'école se remplisse.",
  },
  {
    q: "Mes projets sont-ils privés ?",
    r: "Par défaut, oui. Tu choisis ce que tu rends consultable, et quand. Un projet arrêté ne devient visible que si tu le décides.",
  },
  {
    q: "Que se passe-t-il si j'abandonne un projet ?",
    r: "Rien de négatif. Un projet arrêté garde sa valeur : il documente une impasse, ce qui fait gagner du temps à quelqu'un d'autre. Un autre étudiant peut le reprendre.",
  },
  {
    q: "Sur quels outils SOA se connecte-t-il ?",
    r: "GitHub et GitLab sont prévus au cadrage pour synchroniser commits et branches. Cette intégration n'est pas encore développée.",
  },
] as const;

/* ── Héros ──────────────────────────────────────────────────────────────── */

function Hero({ navigate, reduced }: { navigate: (to: Route) => void; reduced: boolean }) {
  return (
    <section className="relative overflow-hidden bg-background pt-16 pb-20 md:pt-24 md:pb-28">
      {/* Lavis indigo très pâle, borné en haut à droite : il donne de la
          profondeur au héros sans devenir le dégradé de fond générique que
          DESIGN.md écarte. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[38rem] rounded-full bg-primary-wash blur-3xl"
      />

      <div className="page-measure relative grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          variants={sequence(0.06)}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-start gap-7"
        >
          <motion.div variants={rise}>
            <Chip tone="primary">
              <Sparkles aria-hidden className="size-3.5" />
              Ton compagnon de projets étudiants
            </Chip>
          </motion.div>

          <motion.h1
            variants={rise}
            className="text-balance font-display text-display-1 text-ink"
          >
            Termine ce que tu <span className="mark-accent">commences</span>.
          </motion.h1>

          <motion.p variants={rise} className="prose-measure text-body-lg text-ink-muted">
            SOA garde la mémoire de tes projets — les décisions, les blocages, les
            raisons. Tu reprends là où tu t'étais arrêté, au lieu de recommencer
            de zéro.
          </motion.p>

          <motion.div variants={rise} className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate({ name: "tableau" })}
            >
              Entrer dans SOA
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate({ name: "memoire" })}>
              Explorer le corpus
              <ArrowUpRight aria-hidden className="size-4" />
            </Button>
          </motion.div>

          {/* Le template pose ici trois statistiques inventées. On pose trois
              promesses : elles disent la même chose sans affirmer un chiffre
              que personne ne peut vérifier. */}
          <motion.ul variants={rise} className="grid w-full gap-4 pt-4 sm:grid-cols-3">
            {[
              ["Reprise", "en une page, pas en trois semaines"],
              ["Corpus", "les mémoires de l'école, consultables"],
              ["Retour", "l'auteur apprend que son travail a servi"],
            ].map(([titre, corps]) => (
              <li key={titre} className="flex flex-col gap-1 border-l-2 border-accent pl-4">
                <span className="font-heading text-heading text-ink">{titre}</span>
                <span className="text-caption text-ink-muted">{corps}</span>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <HeroDemo reduced={reduced} />
      </div>
    </section>
  );
}

/** La carte de démonstration flottante du template. */
function HeroDemo({ reduced }: { reduced: boolean }) {
  return (
    <div className={cn("relative", !reduced && "motion-safe:animate-floaty")}>
      <Surface tone="float" padding="none" className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <span aria-hidden className="size-2.5 rounded-full bg-destructive/40" />
          <span aria-hidden className="size-2.5 rounded-full bg-accent" />
          <span aria-hidden className="size-2.5 rounded-full bg-success/40" />
          <span className="ml-2 text-caption text-ink-muted">Reprise</span>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-2">
            <Eyebrow>Projet en sommeil</Eyebrow>
            <p className="font-heading text-heading text-ink">
              Synchronisation hors-ligne
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-card bg-surface p-4">
            <p className="text-caption text-ink-muted">Où tu en étais</p>
            <p className="text-body text-ink">
              Deux terminaux modifient la même parcelle. La règle d'arbitrage
              n'est pas écrite.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-card border border-accent bg-accent-soft p-4">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-on-accent" />
            <p className="text-body text-on-accent">
              Un mémoire de 2022 a résolu exactement ce problème.
            </p>
          </div>

          <p className="hand-note">reprends ici →</p>
        </div>
      </Surface>
    </div>
  );
}

/* ── Bandeau ────────────────────────────────────────────────────────────── */

function Bandeau() {
  return (
    <div className="border-y border-border bg-surface py-6">
      <div
        aria-hidden
        className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
      >
        {/* La liste est dupliquée : le keyframe `marquee` translate de -50%,
            ce qui ramène exactement au point de départ sans saut visible. */}
        {[0, 1].map((copie) => (
          <ul
            key={copie}
            className="flex shrink-0 items-center gap-12 pr-12 motion-safe:animate-marquee"
          >
            {DOMAINES.map((domaine) => (
              <li
                key={domaine}
                className="font-heading text-heading whitespace-nowrap text-ink-muted"
              >
                {domaine}
              </li>
            ))}
          </ul>
        ))}
      </div>
      <p className="page-measure pt-6 text-center text-caption text-ink-muted">
        Les domaines du corpus de l'ENI Fianarantsoa.
      </p>
    </div>
  );
}

/* ── Sections ───────────────────────────────────────────────────────────── */

function Piliers() {
  return (
    <Section id="probleme" tone="background">
      <SectionHead
        eyebrow="Pourquoi SOA"
        title={<>Assez d'idées abandonnées au fond d'un dossier.</>}
        lede="Deux échecs reviennent chaque année : le projet qu'on arrête au troisième jour, et le mémoire terminé que personne ne retrouve jamais. SOA s'attaque aux deux."
      />

      <ul className="mt-14 grid gap-6 md:grid-cols-3">
        {PILIERS.map(({ icon: Icon, titre, corps }) => (
          <li key={titre}>
            <Surface tone="card" padding="lg" className="flex h-full flex-col gap-4">
              <span
                aria-hidden
                className="grid size-11 place-items-center rounded-sm bg-primary-wash text-primary"
              >
                <Icon className="size-5" />
              </span>
              <h3 className="font-heading text-heading text-ink">{titre}</h3>
              <p className="text-body text-ink-muted">{corps}</p>
            </Surface>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Methode() {
  return (
    <Section id="methode" tone="surface">
      <SectionHead
        eyebrow="Comment ça marche"
        title={<>Trois temps, dans cet ordre.</>}
        lede="La numérotation n'est pas décorative : c'est une séquence, et sauter une étape casse la suivante."
      />

      <ol className="mt-14 grid gap-6 md:grid-cols-3">
        {ETAPES.map(({ titre, corps, apercu }, index) => (
          <li key={titre}>
            <Surface tone="card" padding="lg" className="flex h-full flex-col gap-5">
              <span className="font-display text-display-3 text-primary-soft">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="font-heading text-heading text-ink">{titre}</h3>
                <p className="text-body text-ink-muted">{corps}</p>
              </div>
              <ChipRow className="mt-auto pt-2">
                {apercu.map((item) => (
                  <Chip key={item}>{item}</Chip>
                ))}
              </ChipRow>
            </Surface>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/**
 * Le périmètre réel du produit.
 *
 * Le template de référence n'avait pas cette section, et c'est précisément ce
 * qui lui manquait : il vendait « un copilote » sans jamais dire ce qu'on
 * trouve dedans. Les cinq domaines ci-dessous sont ceux de AURA_cadrage.md,
 * dans son ordre, avec le nombre de modules réels. Un visiteur doit pouvoir
 * mesurer l'étendue du produit avant d'entrer.
 */
const DOMAINES_PRODUIT = [
  {
    titre: "Projets",
    corps:
      "Idée, en cours, en pause, abandonné, terminé. Avec le journal horodaté des décisions, des erreurs et des solutions.",
    modules: "M1 – M3 · M19",
  },
  {
    titre: "Mémoire IA",
    corps:
      "Le corpus de l'école, cherchable par problème résolu. Résumé de projet, capsule de reprise, renaissance des projets arrêtés.",
    modules: "M4 – M7 · M15",
  },
  {
    titre: "Communauté",
    corps:
      "Forum par domaine, compagnons de progression, challenges, validation d'idée, mentorat par les alumni.",
    modules: "M8 – M10 · M14 · M18",
  },
  {
    titre: "Reconnaissance",
    corps:
      "Portfolio généré à partir des projets livrés, présentation de projet, badges et classements — volontairement à l'écart du chemin de travail.",
    modules: "M11 · M12 · M16 · M17 · M20",
  },
  {
    titre: "Entreprises",
    corps:
      "Recrutement sur preuves, fiabilité projet, talent discovery, challenges sponsorisés, marketplace de prototypes.",
    modules: "M13 · E1 – E10",
  },
] as const;

function Perimetre() {
  return (
    <Section tone="background">
      <SectionHead
        eyebrow="Le périmètre"
        title={<>Cinq domaines, trente et un modules.</>}
        lede="SOA n'est pas un outil de plus à ouvrir le matin. C'est l'endroit où un projet étudiant naît, avance, s'arrête, reprend — et finit par servir à quelqu'un d'autre."
      />

      <ul className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DOMAINES_PRODUIT.map(({ titre, corps, modules }) => (
          <li key={titre}>
            <Surface tone="card" padding="lg" className="flex h-full flex-col gap-3">
              <span className="label-eyebrow">{modules}</span>
              <h3 className="font-heading text-heading text-ink">{titre}</h3>
              <p className="text-body text-ink-muted">{corps}</p>
            </Surface>
          </li>
        ))}

        {/* La sixième carte n'est pas un module : c'est la contrainte que le
            cadrage pose sur les cinq autres. Elle mérite le même rang. */}
        <li>
          <Surface
            tone="card"
            padding="lg"
            className="flex h-full flex-col gap-3 border-accent bg-accent-soft"
          >
            <span className="label-eyebrow text-on-accent">La règle</span>
            <h3 className="font-heading text-heading text-on-accent">
              L'entreprise arrive après
            </h3>
            <p className="text-body text-on-accent/80">
              Aucune offre, aucun recruteur, aucun score de fiabilité n'apparaît
              dans le parcours d'un étudiant tant qu'il n'a pas terminé ou repris
              un projet. C'est écrit dans le cadrage, et c'est appliqué.
            </p>
          </Surface>
        </li>
      </ul>
    </Section>
  );
}

function Lettre() {
  return (
    <Section tone="ink">
      <figure className="flex flex-col gap-8">
        <blockquote className="max-w-[24ch] text-balance font-display text-display-2">
          Pas de streak à casser, pas de score, pas de niveau suivant.
        </blockquote>
        <figcaption className="flex flex-col gap-1 text-body text-background/70">
          <span className="font-heading text-heading text-accent">Soa</span>
          <span>
            Extrait de la lettre fictive qui sert de sujet au hackathon — le
            point de départ du produit, pas un témoignage client.
          </span>
        </figcaption>
      </figure>
    </Section>
  );
}

function Dashboard({ navigate }: { navigate: (to: Route) => void }) {
  return (
    <Section id="communaute" tone="background">
      <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col items-start gap-6">
          <SectionHead
            eyebrow="Le corpus"
            title={<>Ce qui a déjà été compris, ici.</>}
            lede="Les mémoires et les projets de l'école — terminés comme arrêtés — deviennent consultables. Pas le code brut : le raisonnement, les choix, les impasses."
          />
          <Button variant="primary" onClick={() => navigate({ name: "memoire" })}>
            <Search aria-hidden className="size-4" />
            Ouvrir la recherche
          </Button>
        </div>

        <Surface tone="float" padding="none" className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Search aria-hidden className="size-4 text-ink-muted" />
            <span className="flex-1 text-body text-ink-muted">
              Deux terminaux modifient la même donnée…
            </span>
            <Chip tone="primary">3 résultats</Chip>
          </div>

          <ul className="divide-y divide-border">
            {[
              ["Arbitrage de conflits hors-ligne", "Mémoire · 2022 · Terminé"],
              ["File d'attente de synchronisation", "Projet · 2023 · Arrêté"],
              ["Horloges vectorielles en pratique", "Mémoire · 2021 · Terminé"],
            ].map(([titre, meta]) => (
              <li key={titre} className="flex items-center gap-4 px-5 py-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-ink">
                    {titre}
                  </span>
                  <span className="block text-caption text-ink-muted">{meta}</span>
                </span>
                <ArrowUpRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 border-t border-border bg-surface px-5 py-4">
            <Bell aria-hidden className="size-4 text-primary" />
            <p className="text-caption text-ink-muted">
              L'auteur du premier résultat apprendra que son travail a servi.
            </p>
          </div>
        </Surface>
      </div>
    </Section>
  );
}

function Faq() {
  const [ouvert, setOuvert] = useState<number | null>(0);

  return (
    <Section id="faq" tone="surface">
      <SectionHead
        eyebrow="FAQ"
        title={<>Les questions qu'on nous pose.</>}
      />

      <ul className="mt-12 flex flex-col gap-3">
        {FAQ.map(({ q, r }, index) => {
          const actif = ouvert === index;
          return (
            <li key={q}>
              <Surface tone="card" padding="none">
                <h3>
                  <button
                    aria-expanded={actif}
                    aria-controls={`faq-${index}`}
                    onClick={() => setOuvert(actif ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-title font-semibold text-ink">{q}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full border border-border text-ink-muted",
                        "transition-transform duration-150 ease-out",
                        actif && "rotate-45",
                      )}
                    >
                      +
                    </span>
                  </button>
                </h3>
                {actif && (
                  <p id={`faq-${index}`} className="prose-measure px-6 pb-6 text-body text-ink-muted">
                    {r}
                  </p>
                )}
              </Surface>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function AppelFinal({ navigate }: { navigate: (to: Route) => void }) {
  return (
    <Section tone="background">
      <Surface
        tone="card"
        padding="none"
        className="flex flex-col items-start gap-8 overflow-hidden bg-primary px-8 py-16 text-on-primary md:px-16"
      >
        <Eyebrow className="text-on-primary/70">Rejoins l'aventure</Eyebrow>
        <h2 className="max-w-[16ch] text-balance font-display text-display-2">
          Ce projet que tu repousses ? Finis-le.
        </h2>
        <p className="prose-measure text-body-lg text-on-primary/80">
          Commence par chercher ton blocage dans ce que l'école a déjà produit.
          Quelqu'un est probablement déjà passé par là.
        </p>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate({ name: "memoire" })}
        >
          Commencer
          <ArrowUpRight aria-hidden className="size-4" />
        </Button>
      </Surface>
    </Section>
  );
}

function PiedDePage() {
  return (
    <footer className="border-t border-border bg-surface py-14">
      <div className="page-measure flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <span className="font-display text-heading text-ink">SOA</span>
          <p className="text-caption text-ink-muted">
            Pour que les efforts des étudiants ne disparaissent pas dans le
            silence. ENI Fianarantsoa.
          </p>
        </div>
        <p className="text-caption text-ink-muted">
          © 2026 SOA — prototype de hackathon, sans backend.
        </p>
      </div>
    </footer>
  );
}

/* ── Écran ──────────────────────────────────────────────────────────────── */

export function LandingScreen({ navigate }: { navigate: (to: Route) => void }) {
  const reduced = useReducedMotion() ?? false;

  return (
    <>
      <Hero navigate={navigate} reduced={reduced} />
      <Bandeau />
      <Piliers />
      <Methode />
      <Perimetre />
      <Lettre />
      <Dashboard navigate={navigate} />
      <Faq />
      <AppelFinal navigate={navigate} />
      <PiedDePage />
    </>
  );
}
