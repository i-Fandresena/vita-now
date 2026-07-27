import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowUpRight,
  Brain,
  Calendar,
  Flame,
  MessageCircle,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

import type { Route } from "@/app/router";
import { cn } from "@/lib/cn";
import { EASE, REVEAL_VIEWPORT, reveal, rise, sequence, staggerItem } from "@/lib/motion";
import { Magnetic } from "@/features/landing/Magnetic";
import { Button } from "@/ui/Button";
import { Chip, ChipRow, Section, SectionHead } from "@/ui/Editorial";
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

/** Trois cartes lues de gauche à droite : un pas court suffit. */
const CARTE_PILIER = staggerItem(0.07);

const PILIERS = [
  {
    icon: Brain,
    titre: "Mémoire de projet",
    corps:
      "Chaque décision, chaque impasse, chaque raison d'un choix reste attachée au projet. Tu reprends sans relire trois semaines de code.",
    mascotte: "/mascotte1.png",
  },
  {
    icon: RotateCcw,
    titre: "Reprise guidée",
    corps:
      "Après une pause, VITA'NOW te rend où tu en étais, ce qui bloquait, et une seule action de dix minutes pour repartir.",
    mascotte: "/mascotte2.png",
  },
  {
    icon: MessageCircle,
    titre: "Communauté vivante",
    corps:
      "Les mémoires et les projets de l'école deviennent consultables. Quelqu'un a déjà résolu ce sur quoi tu bloques.",
    mascotte: "/mascotte3.png",
  },
] as const;


/**
 * Le pas le plus long de la page — 130 ms contre 70 pour les piliers.
 *
 * C'est le seul endroit où l'ordre d'arrivée **veut dire quelque chose** : ces
 * trois cartes sont une séquence, et les voir se poser une à une dit la même
 * chose que leurs numéros.
 */
const CARTE_ETAPE = staggerItem(0.13, 16);

const ETAPES = [
  {
    titre: "Décris ton projet",
    corps:
      "En une phrase. VITA'NOW structure un objectif, des étapes et une échéance réaliste.",
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
    q: "VITA'NOW est-il gratuit pour les étudiants ?",
    r: "Oui. L'accès étudiant est gratuit — c'est la condition pour que les fiches de l'école se remplissent.",
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
    q: "Sur quels outils VITA'NOW se connecte-t-il ?",
    r: "GitHub et GitLab sont prévus au cadrage pour synchroniser commits et branches. Cette intégration n'est pas encore développée.",
  },
] as const;

/* ── Héros ──────────────────────────────────────────────────────────────── */

/**
 * Les mots frappés au clavier dans le titre, dans l'ordre.
 *
 * Ils se lisent tous à la suite de « Termine ce que tu » et disent trois états
 * du même échec : ce qu'on a commencé, ce qu'on a seulement imaginé, ce qu'on a
 * lancé. La longueur de chacun pilote le nombre de pas de sa frappe.
 */
const MOTS_TAPES = ["Commences", "Imagines", "Lances"] as const;

function Hero({ navigate, reduced }: { navigate: (to: Route) => void; reduced: boolean }) {
  /* Sous `prefers-reduced-motion`, l'animation ne tourne pas, donc
     `onAnimationIteration` ne se déclenche jamais : le titre reste sur le
     premier mot. C'est le comportement voulu — un mot qui change tout seul est
     exactement ce que ce réglage demande d'éviter. */
  const [motIndex, setMotIndex] = useState(0);
  const mot = MOTS_TAPES[motIndex]!;

  /* La hauteur du héros est commandée par son contenu, pas par l'écran.
     La référence est dense : le collage borde le titre, rien ne flotte au
     milieu d'un vide. Une hauteur d'écran imposée à un contenu court produit
     exactement l'inverse — deux bandes vides au-dessus et en dessous. Le
     plancher `lg:min-h-[36rem]` garantit un premier écran habité sans jamais
     étirer le contenu pour le remplir. */
  return (
    <section className="relative flex items-center overflow-hidden bg-canvas pt-12 pb-16 md:pt-16 md:pb-20 lg:min-h-[40rem] lg:py-16">
      {/* La trame de carrés du modèle. Décorative de bout en bout : aucun
          contenu, aucune interaction, `aria-hidden`. */}
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0" />

      {/* Colonne d'image à largeur **fixe**, pas en fraction.
          En fraction, la colonne recevait 356px pour une image de 385 : l'image
          se centrait dedans et le reliquat s'ajoutait au vide central. En la
          fixant à 26rem — la taille à laquelle l'illustration s'affiche sans
          être agrandie — il ne reste plus un seul pixel de jeu de ce côté, et
          tout l'espace disponible revient au texte, qui sait le remplir. */}
      <div className="page-measure relative grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-12">
        <motion.div
          variants={sequence(0.06)}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-start gap-7"
        >
          {/* L'étiquette du modèle — « THIS IS DASH ». Elle nomme le produit
              avant que le titre ne parle, ce qui autorise le titre à ne parler
              que du problème. En indigo et non en gris : c'est le seul endroit
              où la couleur d'action sert à autre chose qu'un clic, et le modèle
              en fait son point d'entrée. */}
          <motion.p variants={rise} className="label-eyebrow text-primary">
            Voici VITA'NOW
          </motion.p>

          {/* Titre capitale massif, trois lignes, interlignage serré.
              Le mot « COMMENCES » est posé sur un bloc plein plutôt que
              surligné : c'est le geste du modèle, et il porte le verbe du
              problème — commencer est facile, c'est finir qui ne l'est pas.
              L'astérisque flotte au coin du bloc, comme dans le modèle, et
              n'appelle aucune note : c'est une ponctuation graphique. */}
          {/* Les lignes ne sont plus forcées. Trois lignes courtes — « Termine »,
              « ce que tu », « Commences » — ne mesuraient que 450px de large
              dans une colonne qui en fait le double : c'est de là que venait le
              vide central, pas de la mise en page. Laissé libre, le titre
              remplit sa ligne et se replie tout seul là où la place manque. */}
          <motion.h1
            variants={rise}
            className="font-display text-display-hero uppercase text-ink"
          >
            Termine ce que tu{" "}
            {/* L'astérisque est dimensionné et positionné en `em`, jamais en
                pixels : le titre est fluide entre 48 et 104px, et des décalages
                fixes le feraient toucher le bloc au petit bout de l'échelle et
                flotter au loin au grand. En `em`, il garde le même rapport à
                toutes les tailles. */}
            {/* Le mot se tape, lettre par lettre, puis s'efface et le suivant
                prend sa place. Le nombre de pas est le nombre de lettres du mot
                courant : il est passé en variable CSS plutôt qu'écrit dans la
                feuille de style, parce que les trois mots n'ont pas la même
                longueur — un compte figé donnerait une frappe qui saute sur le
                mot court et qui s'arrête avant la fin sur le long.

                Le cycle dure 6,5 s dont un peu plus de la moitié en pause, mot
                écrit. C'est le rapport qui décide si l'on lit une phrase qu'on
                écrit ou un mot qui clignote. */}
            <span
              className="relative inline-block"
              style={
                {
                  "--type-steps": mot.length,
                  "--type-cycle": "6.5s",
                  "--type-delay": "0.5s",
                } as CSSProperties
              }
            >
              {/* Le mot change à la **fin** du cycle, jamais pendant.
                  À cet instant l'effacement est terminé : le bloc est
                  entièrement découpé, la substitution est donc invisible, et la
                  première lettre du mot suivant n'apparaît qu'une seconde et
                  demie plus tard. Aucune clé React ici — en changer une
                  relancerait l'animation depuis zéro et produirait un à-coup. */}
              <span
                className="mark-block type-in"
                onAnimationIteration={() =>
                  setMotIndex((index) => (index + 1) % MOTS_TAPES.length)
                }
              >
                {mot}
              </span>

              {/* Le curseur, posé sur le bord du texte révélé. */}
              <span
                aria-hidden
                className="type-caret absolute top-[0.06em] bottom-[0.06em] w-[0.05em] bg-[#FFD633]"
              />

              <span
                aria-hidden
                className="absolute -top-[0.08em] -right-[0.42em] font-sans text-[0.26em] leading-none text-[#FFD633]"              >
                *
              </span>
            </span>
          </motion.h1>

          {/* 48 caractères, entre les 34 d'une colonne étroite et les 68 de la
              mesure de prose. Le chapô doit rester nettement plus court que le
              titre au-dessus, sinon les deux blocs se confondent — mais dans une
              colonne large, 34 caractères produisaient une bande de texte trop
              maigre sous un titre devenu massif. */}
          <motion.p
            variants={rise}
            className="max-w-[58ch] text-body-lg text-ink-muted"
          >
            VITA'NOW garde la mémoire de tes projets
            — les décisions, les blocages, les raisons.
            Tu reprends là où tu t'étais arrêté, au lieu
            de recommencer de zéro.
          </motion.p>

          <motion.div variants={rise} className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              className="bg-[#FFD633] text-black hover:bg-[#E6C200]"
              onClick={() => navigate({ name: "tableau" })}
            >
              Entrer dans VITA'NOW
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate({ name: "memoire" })}>
              Explorer le corpus
              <ArrowUpRight aria-hidden className="size-4" />
            </Button>
          </motion.div>
        </motion.div>

        <HeroCollage reduced={reduced} />
      </div>
    </section>
  );
}

/**
 * Le collage du héros — l'illustration de l'équipe.
 *
 * Elle est bornée à sa largeur native (385px, plus une marge de manœuvre) et
 * non étirée sur sa colonne. Un PNG agrandi au-delà de sa taille d'export perd
 * ses arêtes, et celle-ci est faite d'arêtes : des touches de clavier en
 * isométrie, dont les biseaux sont ce qui rend le relief lisible.
 *
 * `width` et `height` sont les dimensions réelles du fichier : sans elles, le
 * navigateur ne connaît pas le rapport avant le chargement et le texte du héros
 * saute au moment où l'image arrive.
 */
function HeroCollage({ reduced }: { reduced: boolean }) {
  return (
    <div
      className={cn(
        /* Plus de `max-w` au-delà de `lg` : la colonne fait exactement 26rem,
           l'image la remplit. En dessous, la borne redevient utile — sur une
           seule colonne, rien ne limiterait sa largeur. */
        "mx-auto w-full max-w-[26rem] lg:max-w-none lg:-mt-6",
        !reduced && "motion-safe:animate-floaty",
      )}
    >
      <img
        src="/hero-section.png"
        width={385}
        height={506}
        alt="Des touches de clavier en relief composent le mot VITA'NOW, entourées d'icônes de code, de message et de curseur."
        className="h-auto w-full"
      />
    </div>
  );
}

/* ── Bandeau ────────────────────────────────────────────────────────────── */

/**
 * Police de glyphes de la grille — 5 lignes de haut, largeur libre.
 *
 * `1` = case pleine, `0` = case vide. Écrire le mot déjà assemblé serait
 * intenable : une matrice de 47 colonnes se relit à la case près, et le mot a
 * déjà changé une fois. On pose donc les lettres, et la grille se compose.
 */
const GLYPHES: Record<string, readonly string[]> = {
  V: ["10001", "10001", "10001", "01010", "00100"],
  I: ["111", "010", "010", "010", "111"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  A: ["01110", "10001", "11111", "10001", "10001"],
  "-": ["000", "000", "111", "000", "000"],
  /* Une seule colonne, deux cases hautes : à deux colonnes l'apostrophe pèse
     autant qu'une lettre et coupe le mot en deux. */
  "'": ["1", "1", "0", "0", "0"],
  /* L'espace de mot. Deux colonnes vides, plus les deux séparateurs que
     `tracerMot` ajoute de part et d'autre : quatre colonnes en tout, soit
     presque une lettre. En dessous, « NOW 2026 » se lit « NOW2026 ». */
  " ": ["00", "00", "00", "00", "00"],
  "0": ["11111", "10001", "10001", "10001", "11111"],
  "2": ["11111", "00001", "11111", "10000", "11111"],
  "6": ["11111", "10000", "11111", "10001", "11111"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  W: ["10001", "10001", "10101", "10101", "01010"],
};

const MOT = "VITA'NOW";

/**
 * Assemble les glyphes : une colonne vide entre deux lettres, deux de marge aux
 * extrémités — la grille se lit comme un rectangle, pas comme un logo détouré.
 */
function tracerMot(mot: string): string[] {
  return [0, 1, 2, 3, 4].map(
    (y) => `00${[...mot].map((lettre) => GLYPHES[lettre]![y]).join("0")}00`,
  );
}

const MOT_TRACE = tracerMot(MOT);

/**
 * Bandeau — la grille façon graphe de contributions.
 *
 * **Ce que cette grille ne fait pas, et pourquoi.** La référence visuelle
 * apportée par l'équipe est un graphe de contributions GitHub. Le geste
 * graphique est repris ; sa sémantique ne l'est pas. La lettre source du
 * hackathon écarte nommément cette classe de produits — « tu penses peut-être à
 * me refaire un nouveau GitHub ou un Notion revisité : j'en ai déjà testé des
 * centaines. Ils dorment tous, eux aussi. » (AURA_cadrage.md, Contexte du
 * sujet) — et pose l'absence de streak comme partie du problème vécu, pas comme
 * un manque à combler.
 *
 * Les cases ne mesurent donc **rien** : elles dessinent le nom du produit.
 * Aucune régularité quotidienne n'est affichée, aucune assiduité n'est notée, et
 * surtout aucun chiffre de corpus n'est inventé — le corpus de démonstration
 * compte 5 mémoires et 10 projets, une grille dense « remplie » mentirait sur
 * son volume.
 *
 * Les domaines, eux, restent écrits : c'est l'information que le bandeau
 * portait, et la note manuscrite du héros pointe vers eux.
 */
function Bandeau() {
  /* Trois intensités, choisies par une fonction de la position : le moucheté de
     la référence sans `Math.random`, qui redistribuerait les cases à chaque
     rendu et casserait le déterminisme de la démonstration. */
  const intensites = ["bg-primary", "bg-primary/70", "bg-primary/45"] as const;
  const reduced = useReducedMotion() ?? false;

  return (
    /* Le bandeau n'est pas une `Section` — il n'a ni la mesure de page ni les
       marges verticales des autres — mais il est pris entre deux blocs qui
       arrivent au défilement. Sans le même geste, sa fixité se lirait comme un
       défaut plutôt que comme un choix. */
    <div className="border-y border-border bg-surface py-10">
      <motion.div
        className="page-measure flex flex-col items-center gap-6"
        {...(reduced
          ? {}
          : {
              variants: reveal,
              initial: "hidden" as const,
              whileInView: "visible" as const,
              viewport: REVEAL_VIEWPORT,
            })}
      >
        <div
          role="img"
          aria-label={MOT}
          className="grid w-full max-w-xl gap-[2px] sm:max-w-3xl sm:gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${MOT_TRACE[0]!.length}, minmax(0, 1fr))` }}
        >
          {MOT_TRACE.map((ligne, y) =>
            [...ligne].map((cellule, x) => (
              <span
                key={`${y}-${x}`}
                aria-hidden
                className={cn(
                  "aspect-square rounded-[2px] sm:rounded-[3px]",
                  cellule === "1" ? intensites[(y * 5 + x * 3) % 3] : "bg-primary/[0.07]",
                )}
              />
            )),
          )}
        </div>

        {/* Défilé centré des domaines — animation CSS fluide & continue (GPU-accelerated) */}
        <div
          aria-hidden
          className="relative flex w-full overflow-hidden justify-center py-2 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
        >
          <div
            className="flex shrink-0 items-center gap-10 whitespace-nowrap"
            style={{
              animation: reduced ? "none" : "marquee 20s linear infinite",
              willChange: "transform",
            }}
          >
            {[...DOMAINES, ...DOMAINES, ...DOMAINES, ...DOMAINES].map((domaine, i) => (
              <span
                key={i}
                className="inline-block font-heading text-heading text-ink-muted transition-colors duration-150 hover:text-primary"
              >
                {domaine}
              </span>
            ))}
          </div>
        </div>

        <p className="text-center text-caption text-ink-muted">
          Les domaines du corpus de l'ENI Fianarantsoa.
        </p>
      </motion.div>
    </div>
  );
}

/* ── Sections ───────────────────────────────────────────────────────────── */

function Piliers() {
  return (
    <Section id="probleme" tone="background">
      {/* Le mot sélectionné tombe sur « abandonnées », le mot du problème. La
          sélection désigne, elle ne célèbre pas — ce que le bloc plein du héros
          fait, lui, sur la promesse. Les deux traitements ne se croisent jamais
          sur le même écran de lecture, c'est ce qui les garde lisibles.

          Le titre passe en monospace : c'est la police qui laisse la marque
          être le seul accent de la phrase. Anton, grasse et condensée, se
          disputerait la vedette avec elle. */}
      <SectionHead
        align="center"
        variant="mono"
        eyebrow="Pourquoi VITA'NOW"
        title={
          <>
            Assez d'idées <span className="mark-select">abandonnées</span> au fond
            d'un dossier.
          </>
        }
        lede="Deux échecs reviennent chaque année : le projet qu'on arrête au troisième jour, et le mémoire terminé que personne ne retrouve jamais. VITA'NOW s'attaque aux deux."
      />

      {/* Les trois cartes du modèle : bord franc, ombre pleine, et surtout un
          décalage — la carte du milieu descend, les deux autres s'inclinent en
          sens contraires. C'est ce désalignement qui fait lire un jeu de cartes
          posées à la main plutôt qu'une grille de composants. Les valeurs
          restent minimes : un degré et une demi-hauteur de ligne. Au-delà, on
          ne lit plus des cartes posées mais une grille cassée.

          `md:` uniquement : empilées sur téléphone, des rotations alternées
          donneraient une colonne qui zigzague. */}
      <ul className="mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
        {PILIERS.map(({ icon: Icon, titre, corps, mascotte }, index) => {
          return (
            /* Deux éléments imbriqués, et c'est délibéré : Framer Motion écrit
               la transformation en style en ligne, ce qui écrase toute classe
               `rotate-*` ou `translate-*` posée sur le même nœud. L'arrivée vit
               donc sur le `li`, l'inclinaison et le survol sur le `div` — les
               deux transformations se composent au lieu de se disputer. */
            <motion.li
              key={titre}
              variants={CARTE_PILIER}
              custom={index}
              className={cn(index === 1 && "md:mt-8")}
            >
              <div
                className={cn(
                  "group relative h-full transition-transform duration-150 ease-out",
                  index === 0 && "md:-rotate-1",
                  index === 2 && "md:rotate-1",
                  /* Au survol, la carte se redresse et se soulève : on la
                     ramasse. Bornée à `md` — sur un écran tactile il n'y a pas
                     de survol, et l'état resterait collé après le premier
                     appui. */
                  "md:hover:-translate-y-1 md:hover:rotate-0",
                )}
              >
                {/* La mascotte, derrière la carte.
                    Tout se joue au survol, donc en CSS : ni état, ni
                    `AnimatePresence`, ni rendu conditionnel. L'image est
                    toujours dans le document — elle est donc déjà chargée quand
                    on survole, et sort sans le temps de latence qu'aurait une
                    image montée au dernier moment.

                    Elle monte en se dépliant depuis le bas, donc de derrière la
                    carte, au lieu d'apparaître en fondu sur place : c'est ce
                    qui fait lire « elle était cachée là ». `origin-bottom` est
                    ce qui l'y maintient — avec l'origine au centre,
                    l'agrandissement l'écarterait de sa cachette.

                    Rien ne masque le bas du personnage : c'est la carte
                    elle-même, opaque et au-dessus, qui le cache. */}
                <div className="pointer-events-none absolute inset-x-0 -top-32 z-0 flex justify-center">
                  <img
                    src={mascotte}
                    alt=""
                    aria-hidden
                    className={cn(
                      "w-32 origin-bottom md:w-36",
                      "translate-y-10 scale-90 opacity-0",
                      "transition-[opacity,transform] duration-300 ease-out",
                      "group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100",
                    )}
                  />
                </div>

                <Surface
                  tone="hard"
                  padding="lg"
                  className="relative z-10 flex h-full flex-col items-center gap-4 text-center transition-shadow duration-150 ease-out md:group-hover:shadow-hard-lift"
                >
                  <h3 className="font-heading text-heading text-ink">{titre}</h3>
                  <p className="text-body text-ink-muted">{corps}</p>
                  {/* L'icône passe sous le texte, comme l'illustration du
                      modèle : elle referme la carte au lieu de l'annoncer. */}
                  <span aria-hidden className="mt-auto pt-2 text-primary">
                    <Icon className="size-10" />
                  </span>
                </Surface>

              </div>
            </motion.li>
          );
        })}
      </ul>
    </Section>
  );
}

function Methode() {
  return (
    <Section id="methode" tone="surface">
      <SectionHead
        align="split"
        eyebrow="Comment ça marche"
        title={<>Trois temps, dans cet ordre.</>}
        lede="La numérotation n'est pas décorative : c'est une séquence, et sauter une étape casse la suivante."
      />

      <ol className="mt-14 grid gap-6 md:grid-cols-3">
        {ETAPES.map(({ titre, corps, apercu }, index) => {
          /* Le modèle met sa carte du milieu en vedette. Ici c'est la
             deuxième, comme dans le modèle — arbitrage de l'équipe.

             La réserve qui avait fait choisir la troisième reste valable et
             mérite d'être connue : ces cartes décrivent une séquence, pas trois
             offres au choix. Mettre l'étape 2 en avant peut se lire comme
             « c'est celle qui compte », alors que le chapô de la section dit
             l'inverse — « sauter une étape casse la suivante ». C'est un risque
             de lecture, pas une faute : le numéro reste visible sur chaque
             carte, et c'est lui qui porte l'ordre. */
          const vedette = index === 1;

          return (
            <motion.li key={titre} variants={CARTE_ETAPE} custom={index}>
              {/* L'élément intermédiaire porte le survol, jamais le `li` :
                  Framer Motion y écrit déjà la transformation de l'arrivée en
                  style en ligne, et une classe `translate-*` posée au même
                  endroit serait purement et simplement ignorée. */}
              <div className="group h-full transition-transform duration-150 ease-out md:hover:-translate-y-1">
              <Surface
                tone="hard"
                padding="lg"
                className={cn(
                  "flex h-full flex-col gap-4 transition-shadow duration-150 ease-out md:group-hover:shadow-hard-lift",
                  vedette && "bg-primary text-on-primary",
                )}
              >
                {/* Titre à gauche, pastille ronde à droite : la géométrie du
                    modèle. Sa pastille contient une flèche de lien ; la nôtre
                    porte le numéro de l'étape. Une flèche annoncerait une
                    destination qui n'existe pas — ces cartes ne mènent nulle
                    part, elles décrivent. Le numéro, lui, dit la seule chose
                    que la section demande de retenir : l'ordre. */}
                <div className="flex items-start justify-between gap-4">
                  <h3
                    className={cn(
                      "font-heading text-heading",
                      vedette ? "text-on-primary" : "text-ink",
                    )}
                  >
                    {titre}
                  </h3>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full font-display text-body",
                      vedette ? "bg-on-primary text-primary" : "bg-primary text-on-primary",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <hr
                  className={cn(
                    "h-px w-full border-0",
                    vedette ? "bg-on-primary/30" : "bg-border",
                  )}
                />

                <p className={cn("text-body", vedette ? "text-on-primary/85" : "text-ink-muted")}>
                  {corps}
                </p>

                <ChipRow className="mt-auto pt-2">
                  {apercu.map((item) => (
                    <Chip key={item}>{item}</Chip>
                  ))}
                </ChipRow>
              </Surface>
              </div>
            </motion.li>
          );
        })}
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
  },
  {
    titre: "Mémoire IA",
    corps:
      "Les fiches de l'école, cherchables par problème résolu. Résumé de projet, aide à la reprise, reprise des projets arrêtés.",
  },
  {
    titre: "Communauté",
    corps:
      "Forum par domaine, compagnons de progression, challenges, validation d'idée, mentorat par les alumni.",
  },
  {
    titre: "Reconnaissance",
    corps:
      "Portfolio généré à partir des projets livrés, présentation de projet, badges et classements — volontairement à l'écart du chemin de travail.",
  },
  {
    titre: "Entreprises",
    corps:
      "Recrutement sur preuves, fiabilité projet, talent discovery, challenges sponsorisés, marketplace de prototypes.",
  },
] as const;

/** Six cellules sans ordre de lecture imposé : pas court. */
const CELLULE_DOMAINE = staggerItem(0.05, 12);

/** Une cellule de la grille des domaines. */
function CelluleDomaine({
  rang,
  titre,
  corps,
  regle = false,
}: {
  rang: number;
  titre: string;
  corps: string;
  /**
   * La contrainte du cadrage, pas un domaine. Elle ne se signale plus que par
   * la couleur de sa pastille : les étiquettes ont été retirées de la grille,
   * et en laisser une sur la seule cellule qui en avait encore aurait attiré
   * l'œil sur elle au lieu de la distinguer discrètement.
   */
  regle?: boolean;
}) {
  return (
    /* Le rang sert deux fois : il numérote la cellule et il décale son arrivée.
       Un pas court — l'ordre de lecture d'une grille ne porte aucun sens, on
       veut seulement que les six cellules ne tombent pas d'un bloc. */
    <motion.li
      variants={CELLULE_DOMAINE}
      custom={rang - 1}
      className="flex flex-col gap-3 bg-background p-8"
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 place-items-center rounded-full text-caption font-semibold",
          regle ? "bg-accent text-on-accent" : "bg-primary text-on-primary",
        )}
      >
        {rang}
      </span>
      <h3 className="font-heading text-heading text-ink">{titre}</h3>
      <p className="text-body text-ink-muted">{corps}</p>
    </motion.li>
  );
}

function Perimetre() {
  return (
    <Section tone="background">
      <SectionHead
        align="center"
        eyebrow="Le périmètre"
        title={<>Cinq domaines, trente et un modules.</>}
        lede="VITA'NOW n'est pas un outil de plus à ouvrir le matin. C'est l'endroit où un projet étudiant naît, avance, s'arrête, reprend — et finit par servir à quelqu'un d'autre."
      />

      {/* La grille de filets du modèle : pas de cartes, pas d'ombres, juste des
          traits de 1px entre les cellules.

          Ces traits sont obtenus par `gap-px` sur un fond de couleur de filet —
          les cellules, opaques, laissent passer la couleur dans l'interstice.
          C'est ce qui évite l'écueil des bordures par cellule : à chaque
          intersection, deux bordures se superposent et le filet double
          d'épaisseur. Ici il n'y en a jamais qu'un, et le tracé reste juste à
          tous les points de rupture, sans une seule règle conditionnelle. */}
      <ul className="mt-14 grid gap-px border-y border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {DOMAINES_PRODUIT.map(({ titre, corps }, index) => (
          <CelluleDomaine key={titre} rang={index + 1} titre={titre} corps={corps} />
        ))}

        {/* La sixième cellule n'est pas un module : c'est la contrainte que le
            cadrage pose sur les cinq autres. Elle garde son rang dans la grille,
            et seule sa pastille la distingue — dans une grille de filets, un
            fond coloré la ferait sortir du tableau au lieu d'y appartenir. */}
        <CelluleDomaine
          regle
          rang={DOMAINES_PRODUIT.length + 1}
          titre="L'entreprise arrive après"
          corps="Aucune offre, aucun recruteur, aucun score de fiabilité n'apparaît dans le parcours d'un étudiant tant qu'il n'a pas terminé ou repris un projet."
        />
      </ul>
    </Section>
  );
}

/**
 * La citation de la lettre — la bande sombre du modèle : une marque à gauche,
 * le texte à côté, une frise de pastilles en bas.
 *
 * **Le nom à gauche est celui de Soa, pas la marque du produit.** Le modèle
 * place là le logo de l'émetteur, et c'est exactement la règle qu'on applique :
 * ces mots ne sont pas ceux de VITA'NOW. Poser notre logo devant eux
 * transformerait la phrase en slogan de marque — or c'est une citation, et la
 * distinction est le sujet même de cette section.
 *
 * **Les pastilles de la frise sont vides.** Le modèle y découpe des portraits
 * parce qu'il vend une communauté déjà constituée. VITA'NOW n'en a pas : le
 * corpus de démonstration compte cinq mémoires et huit étudiants fictifs. Y
 * coller des visages de banque d'images afficherait une foule qui n'existe pas,
 * sur la page même qui prend soin de dire qu'elle ne montre pas un témoignage
 * client. C'est le motif pour lequel les « 12k+ étudiants » du template
 * d'origine ont été retirés.
 */
function Lettre() {
  return (
    <Section tone="background">
      <figure className="overflow-hidden rounded-card bg-ink text-background">
        <div className="flex flex-col gap-10 px-8 pt-14 pb-12 md:flex-row md:items-start md:gap-14 md:px-14">
          <figcaption className="flex shrink-0 flex-col gap-1 md:w-48">
            <span className="font-heading text-heading text-accent">Soa</span>
            <span className="text-caption text-background/60">
              Extrait de la lettre fictive qui sert de sujet au hackathon — le
              point de départ du produit, pas un témoignage client.
            </span>
          </figcaption>

          <blockquote className="max-w-[20ch] text-balance font-display text-display-2 uppercase">
            Pas de streak à casser, pas de score, pas de niveau suivant.
          </blockquote>
        </div>

        <FriseSignature />
      </figure>
    </Section>
  );
}

/** Le mot tracé par la frise de la citation. */
const MOT_FRISE = "VITA'NOW 2026";
const FRISE_TRACE = tracerMot(MOT_FRISE);

/**
 * La frise de pastilles qui referme la citation — et qui écrit la signature.
 *
 * Elle remplace le dégradé répété qui occupait cette place : un fond ne se
 * découpe pas en lettres. Chaque point est désormais une cellule, ce qui coûte
 * trois cent soixante-cinq nœuds — le prix à payer pour que la frise dise
 * quelque chose au lieu de meubler.
 *
 * Les points pleins portent déjà une opacité franche **avant** toute animation.
 * L'onde ne fait que les traverser ; elle ne les révèle pas. C'est ce qui rend
 * le mot lisible sans mouvement, et donc sous `prefers-reduced-motion`.
 */
function FriseSignature() {
  const colonnes = FRISE_TRACE[0]!.length;

  return (
    <div
      role="img"
      aria-label={MOT_FRISE}
      className="grid w-full gap-[3px] px-6 pb-8 sm:gap-1 sm:px-10"
      style={{ gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))` }}
    >
      {FRISE_TRACE.map((ligne, y) =>
        [...ligne].map((cellule, x) => {
          const plein = cellule === "1";

          return (
            <span
              key={`${y}-${x}`}
              aria-hidden
              /* Le rang de colonne est passé en variable CSS : c'est lui qui
                 retarde l'onde, et il n'existe qu'ici. Le mettre dans la
                 feuille de style demanderait une règle par colonne. */
              style={{ "--dot-col": x } as CSSProperties}
              className={cn(
                "aspect-square rounded-full",
                plein ? "dot-wave bg-background/80" : "bg-background/15",
              )}
            />
          );
        }),
      )}
    </div>
  );
}

/**
 * Les cartes flottantes du mockup — celles qui annoncent quelque chose.
 *
 * Ressort plutôt que courbe : une notification arrive, elle ne glisse pas. Le
 * ressort est court et bien amorti, donc il se pose sans rebondir deux fois.
 *
 * C'est le seul endroit de la page où l'opacité est animée en plus de la
 * section — et c'est le retard qui l'autorise : quand ces cartes commencent à
 * paraître, la section est opaque depuis longtemps, il n'y a donc aucun fondu
 * qui s'empile sur un autre.
 */
const CARTE_FLOTTANTE: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 10, rotate: 0 },
  visible: ({ rotation, delai }: { rotation: number; delai: number }) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    rotate: rotation,
    transition: { type: "spring", stiffness: 320, damping: 24, delay: delai },
  }),
};

/** La trame du heatmap — 5 rangées, intensités déterministes. */
const HEATMAP_RANGEES = 5;
const HEATMAP_COLONNES = 24;

function Heatmap() {
  const niveaux = ["bg-primary", "bg-primary/70", "bg-primary/40", "bg-primary/15"] as const;

  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: HEATMAP_RANGEES }, (_, y) => (
        <div key={y} className="flex gap-1">
          {Array.from({ length: HEATMAP_COLONNES }, (_, x) => (
            <span
              key={x}
              className={cn(
                "size-2 rounded-[2px]",
                /* Déterministe, jamais aléatoire : la même page doit donner la
                   même image à chaque rendu et à chaque répétition de la
                   démonstration. */
                niveaux[(y * 3 + x * 5) % niveaux.length],
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** L'anneau de progression — un cercle SVG, pas une image. */
function Anneau({ pourcentage }: { pourcentage: number }) {
  const rayon = 26;
  const circonference = 2 * Math.PI * rayon;
  const reduced = useReducedMotion() ?? false;

  return (
    <svg aria-hidden viewBox="0 0 64 64" className="size-16 -rotate-90">
      <circle
        cx="32"
        cy="32"
        r={rayon}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        className="text-primary/15"
      />
      {/* L'arc se trace au lieu d'être posé. `pathLength` est la propriété que
          Framer Motion sait animer sur un tracé SVG : 0 = rien, 1 = le cercle
          entier. Elle évite d'avoir à animer `strokeDashoffset` à la main, et
          surtout de recalculer la circonférence si le rayon change un jour.

          Sous `prefers-reduced-motion`, un cercle nu porte directement les
          72 % : la jauge doit rester juste, c'est une donnée. Seul son tracé
          disparaît, pas sa valeur. */}
      {reduced ? (
        <circle
          cx="32"
          cy="32"
          r={rayon}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(circonference * pourcentage) / 100} ${circonference}`}
          className="text-primary"
        />
      ) : (
        <motion.circle
          cx="32"
          cy="32"
          r={rayon}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          className="text-primary"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: pourcentage / 100 }}
          viewport={REVEAL_VIEWPORT}
          transition={{ duration: 0.9, ease: EASE.outExpo, delay: 0.25 }}
        />
      )}
    </svg>
  );
}

/** Un panneau du mockup — étiquette capitale, contenu libre. */
function PanneauMock({
  titre,
  extra,
  children,
  className,
}: {
  titre: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    /* Colonne flex, et la zone de contenu prend le reste (`flex-1`).
       Les panneaux d'une même rangée s'étirent à la hauteur du plus haut ; sans
       cette chaîne, leur contenu resterait collé en haut et un `mt-auto` posé
       par un enfant n'aurait rien à repousser. */
    <div
      className={cn(
        "flex flex-col rounded-card border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="label-eyebrow">{titre}</span>
        {extra}
      </div>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

const KANBAN = [
  { colonne: "À faire", cartes: ["Wireframe", "Brief"] },
  { colonne: "En cours", cartes: ["API auth"] },
  { colonne: "Fini", cartes: ["Landing", "Logo"] },
] as const;

/**
 * L'aperçu du tableau de bord.
 *
 * Tout ce bloc est une **image**, pas une interface : aucun `button`, aucun
 * `a`, aucun champ. Un mockup qui emploie de vrais éléments interactifs se fait
 * atteindre au clavier et annoncer comme cliquable, puis ne répond pas — c'est
 * la façon la plus sûre de faire échouer une démonstration au moment où
 * quelqu'un tabule dans la page.
 */
function Dashboard() {
  return (
    <Section id="communaute" tone="primary">
      {/* En-tête : titre à gauche, chapô à droite et plus bas, comme la
          maquette. L'étiquette est manuscrite — c'est le seul emploi de la
          cursive sur la page.

          Sur l'aplat indigo, la seconde ligne du titre passe au jaune : elle
          était en indigo sur fond clair, ce qui la rendait ici invisible. Le
          jaune est la seule autre couleur du produit, et c'est le seul endroit
          de la page où il porte autre chose qu'une réussite — un fond d'action
          ne laisse pas d'autre choix. */}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
        <div className="flex flex-col gap-3">
          <p className="font-hand text-title font-semibold text-on-primary/80">
            Le dashboard
          </p>
          <h2 className="font-display text-display-2 leading-[0.88] text-on-primary">
            <span className="block">Ton QG créatif,</span>
            <span className="block text-accent">
              tous les jours<span className="text-on-primary">.</span>
            </span>
          </h2>
        </div>
        <p className="text-body text-on-primary/80">
          Un espace calme et puissant — inspiré de Linear, Notion et Raycast —
          pour piloter tous tes projets sans t'y perdre.
        </p>
      </div>

      <div className="relative mt-14">
        {/* Le liseré seul — plus de halo flouté.
            Le dégradé conique sert de fond au conteneur, et son rembourrage de
            2px est tout ce que le panneau opaque laisse dépasser : le trait
            coloré est donc un reste, pas une bordure. C'est ce qui permet à un
            dégradé de cerner un cadre — `border-image` ne suit pas les coins
            arrondis, et quatre bordures colorées se croiseraient aux angles.

            2px et non 1 : à un pixel, le dégradé se lit comme un défaut
            d'antialiasing sur un écran ordinaire. */}
        <div className="frame-aura relative rounded-card p-0.5">
        {/* `bare` et non `float` : le panneau ne porte plus ni ombre ni bordure.
            L'ombre portée simule une source de lumière venue d'en haut et
            projetterait une zone grise par-dessus le halo, qui rayonne dans
            toutes les directions — les deux se contredisent, et c'est le halo
            qui doit gagner. La bordure grise, elle, doublait le liseré en
            dégradé d'un trait terne juste à l'intérieur. */}
        <Surface tone="bare" padding="none" className="overflow-hidden bg-card">
          {/* Barre de fenêtre : pastilles de trafic et champ de recherche. */}
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span aria-hidden className="flex gap-2">
              <span className="size-3 rounded-full bg-destructive/70" />
              <span className="size-3 rounded-full bg-accent" />
              <span className="size-3 rounded-full bg-success/70" />
            </span>
            <span className="mx-auto flex items-center gap-2 rounded-full border border-border px-4 py-1.5">
              <Search aria-hidden className="size-3.5 text-ink-muted" />
              <span className="text-caption text-ink-muted">
                Rechercher un projet, une tâche…
              </span>
              <span className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-micro text-ink-muted">
                ⌘K
              </span>
            </span>
          </div>

          <div className="grid md:grid-cols-[15rem_1fr]">
            {/* Rail latéral */}
            <div className="flex flex-col gap-2 border-b border-border p-4 md:border-r md:border-b-0">
              <span aria-hidden className="h-9 rounded-full bg-primary-wash" />
              <span aria-hidden className="h-9" />

              {[
                { icone: Calendar, label: "Planning" },
                { icone: MessageCircle, label: "Communauté" },
                { icone: Trophy, label: "Réussites" },
              ].map(({ icone: Icone, label }) => (
                <span key={label} className="flex items-center gap-3 px-2 py-2">
                  <Icone aria-hidden className="size-4 text-ink-muted" />
                  <span className="text-body text-ink">{label}</span>
                </span>
              ))}

              <span className="mt-4 flex flex-col gap-1 rounded-card border border-accent bg-accent-soft p-4">
                <span className="flex items-center gap-2 text-body font-semibold text-on-accent">
                  <Flame aria-hidden className="size-4" />
                  Série 12 jours
                </span>
                <span className="text-caption text-on-accent/80">
                  Continue demain pour battre ton record.
                </span>
              </span>
            </div>

            {/* Zone principale */}
            <div className="flex flex-col gap-4 bg-surface p-4">
              <div className="grid gap-4 lg:grid-cols-[1.9fr_1fr]">
                <div className="flex flex-col items-start gap-4 rounded-card bg-primary p-6 text-on-primary">
                  <span className="flex items-center gap-2 text-caption text-on-primary/80">
                    <Sparkles aria-hidden className="size-4" />
                    Résumé du jour
                  </span>
                  <p className="text-balance font-display text-display-3">
                    3 tâches, 45 min pour finir ta page d'accueil.
                  </p>
                  <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-caption font-semibold text-on-accent">
                    Démarrer
                    <Zap aria-hidden className="size-3.5" />
                  </span>
                </div>

                <PanneauMock titre="Progression">
                  <div className="flex items-center gap-4">
                    <Anneau pourcentage={72} />
                    <span className="flex flex-col">
                      <span className="font-display text-display-3 text-ink">72%</span>
                      <span className="text-caption text-ink-muted">Objectifs semaine</span>
                    </span>
                  </div>
                </PanneauMock>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <PanneauMock
                  titre="Heatmap"
                  extra={<span className="text-caption text-ink-muted">Cette année</span>}
                >
                  <Heatmap />

                  {/* Le vide de ce panneau ne venait pas d'un manque de
                      contenu mais d'une contrainte de grille : la trame ne fait
                      que cinq rangées de 8px, alors que le panneau s'étire à la
                      hauteur du kanban voisin, qui a deux cartes empilées. Il
                      restait donc une bande blanche d'une centaine de pixels
                      sous les points.

                      La mascotte l'occupe en s'appuyant sur le bord bas, comme
                      un personnage accoudé au panneau. `mt-auto` la pousse
                      contre ce bord quelle que soit la hauteur finale — un
                      décalage fixe se serait décollé dès que le kanban change
                      d'une carte. */}
                  <img
                    src="/mascotte2.png"
                    alt=""
                    aria-hidden
                    className="mt-auto -mb-4 ml-auto h-24 w-auto self-end"
                  />
                </PanneauMock>

                <PanneauMock
                  titre="Kanban"
                  extra={<span className="text-caption text-primary">+ Nouvelle</span>}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {KANBAN.map(({ colonne, cartes }) => (
                      <div key={colonne} className="flex flex-col gap-2">
                        <span className="text-caption text-ink-muted">{colonne}</span>
                        {cartes.map((carte) => (
                          <span
                            key={carte}
                            className="rounded-sm border border-border bg-card px-3 py-2 text-caption text-ink"
                          >
                            {carte}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </PanneauMock>
              </div>
            </div>
          </div>
        </Surface>
        </div>

        {/* Les deux cartes flottantes de la maquette, posées à cheval sur le
            cadre. Masquées sous `md` : à cette largeur elles couvriraient le
            contenu qu'elles sont censées commenter.

            Elles surgissent après le panneau, pas avec lui. Ce sont des
            notifications : elles doivent arriver *sur* une interface déjà
            posée, sinon elles n'ont rien à annoncer. D'où les retards de 0,5 s
            et 0,8 s, qui les font aussi se succéder au lieu de tomber ensemble.

            L'inclinaison est dans la variante, jamais en classe `rotate-*` :
            Framer écrit la transformation en style en ligne et l'écraserait —
            les cartes arriveraient bien droites. Elle part de zéro et se pose
            sur sa valeur, ce qui donne le petit basculement d'une carte qu'on
            lâche. */}
        <motion.span
          variants={CARTE_FLOTTANTE}
          custom={{ rotation: -3, delai: 0.5 }}
          className="absolute -top-6 left-4 z-10 hidden max-w-[16rem] flex-col gap-1 rounded-card border border-border bg-card p-4 shadow-float md:flex"
        >
          <span className="label-eyebrow">Notifications</span>
          <span className="text-body text-ink">Marc a commenté ton projet ✨</span>
        </motion.span>

        <motion.span
          variants={CARTE_FLOTTANTE}
          custom={{ rotation: 2, delai: 0.8 }}
          className="absolute -bottom-6 right-4 z-10 hidden max-w-[18rem] flex-col gap-1 rounded-card border border-border bg-card p-4 shadow-float md:flex"
        >
          <span className="flex items-center gap-2 text-body font-semibold text-ink">
            <Trophy aria-hidden className="size-4 text-accent" />
            Badge débloqué
          </span>
          <span className="text-caption text-ink-muted">
            « Finisher » — 5 projets livrés
          </span>
        </motion.span>
      </div>
    </Section>
  );
}

/** Une pile de questions : pas très court, sinon la liste ondule. */
const QUESTION_FAQ = staggerItem(0.04, 10);

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
            <motion.li key={q} variants={QUESTION_FAQ} custom={index}>
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
            </motion.li>
          );
        })}
      </ul>
    </Section>
  );
}

function AppelFinal({ navigate }: { navigate: (to: Route) => void }) {
  return (
    <Section tone="background">
      {/* Le panneau plein du modèle. Le jaune y remplace le vert acide : c'est
          la seule couleur vive du produit, et elle tient le même rôle — un
          aplat franc qui arrête la page avant le pied. Le bouton, lui, reste
          un contour et non un aplat : un bouton jaune viderait le jaune de son
          sens, qui est de dire « c'est acquis », jamais « c'est cliquable ». */}
      <div className="rounded-card bg-accent px-8 py-12 text-on-accent md:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_auto] lg:items-center lg:gap-12">
          <h2 className="max-w-[14ch] text-balance font-display text-display-2">
            Ce projet que tu repousses ? Finis-le.
          </h2>

          {/* Le bloc secondaire du modèle : une ligne grasse, un paragraphe
              court. Il porte ce que le titre ne peut pas dire — par où
              commencer, concrètement. */}
          <div className="flex flex-col gap-2">
            <p className="text-body font-semibold">Rejoins l'aventure</p>
            <p className="text-caption text-on-accent/80">
              Commence par chercher ton blocage dans ce que l'école a déjà
              produit. Quelqu'un est probablement déjà passé par là.
            </p>
          </div>

          {/* Le grand carré fléché. `aria-label` est obligatoire : sans lui, un
              lecteur d'écran annonce « bouton » et rien d'autre — une flèche
              n'a pas de nom accessible. */}
          <Magnetic force={9}>
            <button
              type="button"
              aria-label="Ouvrir la recherche dans les fiches"
              onClick={() => navigate({ name: "memoire" })}
              className={cn(
                "grid size-24 shrink-0 place-items-center rounded-card md:size-28",
                "border-2 border-on-accent text-on-accent",
                "transition-colors duration-150 ease-out",
                "hover:bg-on-accent hover:text-accent",
                "active:translate-y-px",
              )}
            >
              <ArrowUpRight aria-hidden className="size-10" />
            </button>
          </Magnetic>
        </div>
      </div>
    </Section>
  );
}

function PiedDePage() {
  return (
    <footer className="border-t border-border bg-surface py-14">
      <div className="page-measure flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          {/* Emblème et nom sur une même ligne, comme dans la barre du haut :
              le pied de page referme la lecture sur la marque qui l'a ouverte.
              L'emblème est contraint en hauteur et non en carré — la source
              fait 755×699, un `size-*` l'écraserait de 8 %. */}
          <span className="flex items-center gap-2.5">
            <img src="/logo-vita-now.png" alt="" className="h-9 w-auto shrink-0" />
            <span className="font-display text-heading text-ink">VITA'NOW</span>
          </span>
          <p className="text-caption text-ink-muted">
            Pour que les efforts des étudiants ne disparaissent pas dans le
            silence. ENI Fianarantsoa.
          </p>
        </div>
        <p className="text-caption text-ink-muted">
          © 2026 VITA'NOW — prototype de hackathon, sans backend.
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
      <Dashboard />
      <Faq />
      <AppelFinal navigate={navigate} />
      <PiedDePage />
    </>
  );
}
