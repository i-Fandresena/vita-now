import {
  BellRing,
  BrainCircuit,
  Building2,
  CalendarDays,
  FileText,
  FolderKanban,
  Handshake,
  KeyRound,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  LogOut,
  Medal,
  Megaphone,
  MessageSquare,
  NotebookPen,
  Pencil,
  Reply,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { estSurHoteAdmin, type Route, urlAdmin } from "@/app/router";
import {
  api,
  type AdminChamp,
  type AdminCollection,
  type AdminCollectionPage,
  type AdminDossierEntreprise,
  type AdminDossierEtudiant,
  type AdminOverview,
  type ReglagesPlateforme,
} from "@/data/api";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Field";
import { Pagination } from "@/ui/Pagination";
import { Screen } from "@/ui/layout";

/**
 * AdminScreens.tsx — la console d'administration.
 *
 * **Un seul écran générique, décrit par des tables.** Le serveur expose quinze
 * collections par un même point d'entrée ; les décrire ici par des données
 * (`COLONNES`, `SECTIONS`) plutôt que par quinze blocs de JSX évite qu'une
 * seizième arrive sans recherche, sans pagination ou sans confirmation de
 * suppression.
 *
 * **Les champs modifiables viennent du serveur, pas d'ici.** Le formulaire
 * d'édition est construit à partir de `page.champs` : la liste blanche
 * n'existe qu'à un seul endroit, et le front ne peut pas proposer d'éditer un
 * champ que le serveur refusera.
 */

const TAILLE_PAGE = 25;

type SectionAdmin = "vue" | AdminCollection;

const SECTIONS: Array<{
  id: SectionAdmin;
  libelle: string;
  Icone: typeof LayoutDashboard;
  compteur?: AdminCollection;
}> = [
  { id: "vue", libelle: "Vue d’ensemble", Icone: LayoutDashboard },
  { id: "etudiants", libelle: "Étudiants", Icone: Users, compteur: "etudiants" },
  { id: "entreprises", libelle: "Entreprises", Icone: Building2, compteur: "entreprises" },
  { id: "projets", libelle: "Projets", Icone: FolderKanban, compteur: "projets" },
  { id: "journal", libelle: "Journal de bord", Icone: NotebookPen, compteur: "journal" },
  { id: "discussions", libelle: "Discussions", Icone: MessageSquare, compteur: "discussions" },
  { id: "reponses", libelle: "Réponses", Icone: Reply, compteur: "reponses" },
  { id: "fiches", libelle: "Fiches", Icone: FileText, compteur: "fiches" },
  { id: "idees", libelle: "Idées", Icone: Lightbulb, compteur: "idees" },
  { id: "defis", libelle: "Défis", Icone: Sparkles, compteur: "defis" },
  { id: "mentorat", libelle: "Mentorat", Icone: Handshake, compteur: "mentorat" },
  { id: "annonces", libelle: "Annonces", Icone: Megaphone, compteur: "annonces" },
  { id: "evenements", libelle: "Événements", Icone: CalendarDays, compteur: "evenements" },
  { id: "conversations", libelle: "Copilote IA", Icone: BrainCircuit, compteur: "conversations" },
  { id: "points", libelle: "Points", Icone: Medal, compteur: "points" },
  { id: "notifications", libelle: "Notifications", Icone: BellRing, compteur: "notifications" },
];

interface Colonne {
  cle: string;
  libelle: string;
  /** `date` formate, `bool` rend Oui/Non, `liste` joint par virgules. */
  type?: "date" | "bool" | "liste";
  /** Colonne secondaire : masquée sous `lg`, où la largeur manque. */
  secondaire?: boolean;
}

const COLONNES: Record<AdminCollection, Colonne[]> = {
  etudiants: [
    { cle: "nom", libelle: "Nom" },
    { cle: "email", libelle: "E-mail", secondaire: true },
    { cle: "niveau", libelle: "Niveau" },
    { cle: "filiere", libelle: "Filière", secondaire: true },
    { cle: "promo", libelle: "Promo", secondaire: true },
    { cle: "projectCount", libelle: "Projets" },
    { cle: "pointCount", libelle: "Points", secondaire: true },
    { cle: "deactivatedAt", libelle: "Suspendu le", type: "date" },
  ],
  entreprises: [
    { cle: "nom", libelle: "Nom" },
    { cle: "secteur", libelle: "Secteur" },
    { cle: "email", libelle: "E-mail", secondaire: true },
    { cle: "opportunityCount", libelle: "Annonces" },
  ],
  projets: [
    { cle: "nom", libelle: "Projet" },
    { cle: "ownerName", libelle: "Porteur" },
    { cle: "statut", libelle: "Statut" },
    { cle: "difficulte", libelle: "Difficulté", secondaire: true },
    { cle: "public", libelle: "Public", type: "bool", secondaire: true },
    { cle: "updatedAt", libelle: "Activité", type: "date" },
  ],
  journal: [
    { cle: "titre", libelle: "Entrée" },
    { cle: "nature", libelle: "Nature" },
    { cle: "projectName", libelle: "Projet", secondaire: true },
    { cle: "ownerName", libelle: "Auteur", secondaire: true },
    { cle: "date", libelle: "Date", type: "date" },
  ],
  discussions: [
    { cle: "titre", libelle: "Sujet" },
    { cle: "categorie", libelle: "Catégorie" },
    { cle: "authorName", libelle: "Auteur", secondaire: true },
    { cle: "replyCount", libelle: "Réponses" },
    { cle: "date", libelle: "Date", type: "date" },
  ],
  reponses: [
    { cle: "corps", libelle: "Réponse" },
    { cle: "threadTitle", libelle: "Sujet", secondaire: true },
    { cle: "authorName", libelle: "Auteur" },
    { cle: "deMentor", libelle: "Mentor", type: "bool", secondaire: true },
    { cle: "date", libelle: "Date", type: "date" },
  ],
  fiches: [
    { cle: "titre", libelle: "Fiche" },
    { cle: "authorName", libelle: "Auteur", secondaire: true },
    { cle: "nature", libelle: "Nature" },
    { cle: "domaine", libelle: "Domaine", secondaire: true },
    { cle: "etat", libelle: "État" },
    { cle: "useCount", libelle: "Usages" },
  ],
  idees: [
    { cle: "titre", libelle: "Idée" },
    { cle: "authorName", libelle: "Auteur", secondaire: true },
    { cle: "votes", libelle: "Pour" },
    { cle: "commentCount", libelle: "Commentaires", secondaire: true },
    { cle: "date", libelle: "Date", type: "date" },
  ],
  defis: [
    { cle: "titre", libelle: "Défi" },
    { cle: "techno", libelle: "Techno" },
    { cle: "sponsorName", libelle: "Sponsor", secondaire: true },
    { cle: "participantCount", libelle: "Participants" },
    { cle: "debut", libelle: "Début", type: "date" },
  ],
  mentorat: [
    { cle: "blocage", libelle: "Blocage" },
    { cle: "studentName", libelle: "Étudiant" },
    { cle: "mentorName", libelle: "Mentor", secondaire: true },
    { cle: "statut", libelle: "Statut" },
    { cle: "date", libelle: "Date", type: "date" },
  ],
  annonces: [
    { cle: "titre", libelle: "Annonce" },
    { cle: "ownerName", libelle: "Émetteur" },
    { cle: "nature", libelle: "Nature" },
    { cle: "dureeMois", libelle: "Mois", secondaire: true },
    { cle: "publishedAt", libelle: "Publiée", type: "date" },
  ],
  evenements: [
    { cle: "titre", libelle: "Événement" },
    { cle: "studentName", libelle: "Étudiant", secondaire: true },
    { cle: "type", libelle: "Type" },
    { cle: "date", libelle: "Date", type: "date" },
    { cle: "heure", libelle: "Heure", secondaire: true },
  ],
  conversations: [
    { cle: "title", libelle: "Discussion" },
    { cle: "studentName", libelle: "Étudiant" },
    { cle: "role", libelle: "Rôle", secondaire: true },
    { cle: "messageCount", libelle: "Messages" },
    { cle: "updatedAt", libelle: "Activité", type: "date" },
  ],
  points: [
    { cle: "studentName", libelle: "Étudiant" },
    { cle: "motif", libelle: "Geste" },
    { cle: "detail", libelle: "Détail", secondaire: true },
    { cle: "date", libelle: "Date", type: "date" },
  ],
  notifications: [
    { cle: "titre", libelle: "Notification" },
    { cle: "studentName", libelle: "Étudiant", secondaire: true },
    { cle: "nature", libelle: "Nature" },
    { cle: "lu", libelle: "Lue", type: "bool" },
    { cle: "date", libelle: "Date", type: "date" },
  ],
};

/** Clé portant le libellé d'une ligne — utilisée dans les confirmations. */
const CLE_TITRE: Record<AdminCollection, string> = {
  etudiants: "nom",
  entreprises: "nom",
  projets: "nom",
  journal: "titre",
  discussions: "titre",
  reponses: "corps",
  fiches: "titre",
  idees: "titre",
  defis: "titre",
  mentorat: "blocage",
  annonces: "titre",
  evenements: "titre",
  conversations: "title",
  points: "detail",
  notifications: "titre",
};

/** Champs assez longs pour mériter plusieurs lignes dans le formulaire. */
const CHAMPS_LONGS = new Set([
  "corps",
  "description",
  "presentation",
  "objectifs",
  "objectif",
  "promesse",
  "blocage",
  "raisonAbandon",
]);

const controle = [
  "w-full rounded-sm border border-border bg-card px-3 py-2 text-body text-ink",
  "transition-[border-color] duration-150 hover:border-border-strong",
  "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-wash",
].join(" ");

function erreurTexte(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : "Une erreur est survenue.";
}

function dateCourte(valeur: unknown): string {
  if (typeof valeur !== "string" || !valeur) return "—";
  const date = new Date(valeur);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Rend une date au format attendu par `<input type="date">`.
 *
 * En composantes locales et non via `toISOString()` : une date PostgreSQL
 * arrive à minuit local, et la convertir en UTC la ferait reculer d'un jour
 * dans tout fuseau à l'est de Greenwich.
 */
function pourChampDate(valeur: unknown): string {
  if (typeof valeur !== "string" || !valeur) return "";
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return "";
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

function cellule(valeur: unknown, type: Colonne["type"]): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  if (type === "date") return dateCourte(valeur);
  if (type === "bool") return valeur ? "Oui" : "Non";
  if (type === "liste") return Array.isArray(valeur) ? valeur.join(", ") || "—" : String(valeur);
  const texte = String(valeur);
  return texte.length > 90 ? `${texte.slice(0, 88)}…` : texte;
}

function titreDe(nom: AdminCollection, ligne: Record<string, unknown>): string {
  const brut = ligne[CLE_TITRE[nom]];
  const texte = typeof brut === "string" ? brut : String(brut ?? "cet élément");
  return texte.length > 60 ? `${texte.slice(0, 58)}…` : texte;
}

function Zone({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="font-heading text-heading text-ink">{title}</h2>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

/** Feuille latérale : tout ce qui demande de la place sans quitter la liste. */
function Tiroir({ titre, onClose, children }: { titre: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const auClavier = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") onClose();
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" role="dialog" aria-modal="true" aria-label={titre}>
      <button type="button" className="flex-1 cursor-default" aria-label="Fermer" onClick={onClose} />
      <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-card shadow-lift">
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
          <h2 className="font-heading text-heading text-ink">{titre}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} aria-hidden /> Fermer
          </Button>
        </div>
        <div className="flex-1 px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function AdminLoginScreen({ navigate: _navigate }: { navigate: (to: Route) => void }) {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!estSurHoteAdmin()) window.location.replace(urlAdmin({ name: "admin-connexion" }));
  }, []);

  const connecter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      await api.connexionAdmin(email, motDePasse);
      window.location.hash = "#/admin";
    } catch (cause) {
      setErreur(erreurTexte(cause));
    } finally {
      setEnvoi(false);
    }
  };

  if (!estSurHoteAdmin()) return null;

  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4 py-8">
      <form
        onSubmit={(event) => void connecter(event)}
        className="w-full max-w-md rounded-card border border-border bg-card p-6 shadow-lift sm:p-8"
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-on-primary">
          <ShieldCheck size={24} aria-hidden />
        </span>
        <p className="mt-5 label-eyebrow">Administration sécurisée</p>
        <h1 className="mt-2 font-display text-display-3 text-ink">Centre de gestion</h1>
        <p className="mt-2 text-body text-ink-muted">Accès réservé à l’administration de VITA’NOW.</p>
        <p className="mt-2 text-caption text-ink-muted">Portail : manage.aura-plus.site</p>
        <div className="mt-6 flex flex-col gap-4">
          <Input
            label="E-mail administrateur"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            value={motDePasse}
            onChange={(event) => setMotDePasse(event.target.value)}
            required
            error={erreur ?? undefined}
          />
          <Button type="submit" variant="primary" size="lg" disabled={envoi}>
            {envoi ? "Vérification…" : "Ouvrir l’administration"}
          </Button>
        </div>
      </form>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Formulaire d'édition — construit depuis les descripteurs du serveur */
/* ------------------------------------------------------------------ */

function ChampEdition({
  cle,
  champ,
  valeur,
  onChange,
}: {
  cle: string;
  champ: AdminChamp;
  valeur: unknown;
  onChange: (valeur: unknown) => void;
}) {
  const libelle = cle.charAt(0).toUpperCase() + cle.slice(1).replace(/([A-Z])/g, " $1").toLowerCase();

  if (champ.genre === "booleen") {
    return (
      <label className="flex items-center gap-3 text-body text-ink">
        <input
          type="checkbox"
          checked={Boolean(valeur)}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 accent-[var(--color-primary)]"
        />
        {libelle}
      </label>
    );
  }

  const commun = { id: `champ-${cle}`, className: controle };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={commun.id} className="text-caption font-medium text-ink-muted">
        {libelle}
      </label>
      {champ.valeurs ? (
        <select
          {...commun}
          value={typeof valeur === "string" ? valeur : ""}
          onChange={(event) => onChange(event.target.value)}
        >
          {champ.valeurs.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : champ.genre === "liste" ? (
        <input
          {...commun}
          value={Array.isArray(valeur) ? valeur.join(", ") : ""}
          placeholder="Séparés par des virgules"
          onChange={(event) =>
            onChange(
              event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            )
          }
        />
      ) : champ.genre === "entier" ? (
        <input
          {...commun}
          type="number"
          value={typeof valeur === "number" ? valeur : ""}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      ) : champ.genre === "date" ? (
        <input
          {...commun}
          type="date"
          value={pourChampDate(valeur)}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : CHAMPS_LONGS.has(cle) ? (
        <textarea
          {...commun}
          rows={4}
          value={typeof valeur === "string" ? valeur : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          {...commun}
          value={typeof valeur === "string" ? valeur : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function EditeurLigne({
  nom,
  ligne,
  champs,
  onClose,
  onEnregistre,
}: {
  nom: AdminCollection;
  ligne: Record<string, unknown>;
  champs: Record<string, AdminChamp>;
  onClose: () => void;
  onEnregistre: () => void;
}) {
  const initial = useMemo(() => {
    const valeurs: Record<string, unknown> = {};
    for (const [cle, champ] of Object.entries(champs)) {
      const brut = ligne[cle];
      valeurs[cle] =
        champ.genre === "liste"
          ? Array.isArray(brut)
            ? brut
            : []
          : champ.genre === "booleen"
            ? Boolean(brut)
            : champ.genre === "entier"
              ? typeof brut === "number"
                ? brut
                : 0
              : champ.genre === "date"
                ? pourChampDate(brut)
                : typeof brut === "string"
                  ? brut
                  : "";
    }
    return valeurs;
  }, [champs, ligne]);

  const [valeurs, setValeurs] = useState(initial);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const enregistrer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      /* Seuls les champs réellement touchés partent : envoyer tout le
         formulaire réécrirait des colonnes que personne n'a modifiées, et
         ferait échouer l'enregistrement sur une validation sans rapport avec
         l'intention de l'administrateur. */
      const diff: Record<string, unknown> = {};
      for (const cle of Object.keys(champs)) {
        if (JSON.stringify(valeurs[cle]) !== JSON.stringify(initial[cle])) diff[cle] = valeurs[cle];
      }
      if (Object.keys(diff).length === 0) {
        onClose();
        return;
      }
      await api.modifierAdmin(nom, String(ligne["id"]), diff);
      onEnregistre();
    } catch (cause) {
      setErreur(erreurTexte(cause));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form onSubmit={(event) => void enregistrer(event)} className="flex flex-col gap-4">
      {Object.entries(champs).map(([cle, champ]) => (
        <ChampEdition
          key={cle}
          cle={cle}
          champ={champ}
          valeur={valeurs[cle]}
          onChange={(valeur) => setValeurs((courant) => ({ ...courant, [cle]: valeur }))}
        />
      ))}
      {erreur && (
        <p role="alert" className="rounded-sm bg-destructive/10 px-4 py-3 text-body text-destructive">
          {erreur}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={envoi}>
          {envoi ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Dossiers                                                            */
/* ------------------------------------------------------------------ */

function ListeDossier({ titre, items }: { titre: string; items: Array<{ id: string; principal: string; secondaire?: string }> }) {
  return (
    <section className="mt-5">
      <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
        {titre} · {items.length}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-body text-ink-muted">Aucun.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.id} className="rounded-sm border border-border px-3 py-2 text-caption">
              <span className="text-ink">{item.principal}</span>
              {item.secondaire && <span className="mt-0.5 block text-ink-muted">{item.secondaire}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DossierEtudiant({
  dossier,
  onAction,
  onErreur,
}: {
  dossier: AdminDossierEtudiant;
  onAction: () => void;
  onErreur: (message: string) => void;
}) {
  const { etudiant } = dossier;
  const [motDePasse, setMotDePasse] = useState("");
  const [motif, setMotif] = useState("projet-termine");
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const executer = async (action: () => Promise<string>) => {
    setMessage(null);
    try {
      setMessage(await action());
      onAction();
    } catch (cause) {
      onErreur(erreurTexte(cause));
    }
  };

  return (
    <div>
      <p className="text-body text-ink">
        {etudiant.niveau} · {etudiant.filiere || "Filière non précisée"} · {etudiant.promo}
      </p>
      <p className="mt-1 text-caption text-ink-muted">
        {etudiant.universite} · inscrit le {dateCourte(etudiant.createdAt)}
        {etudiant.mentor && " · mentor"}
      </p>
      {etudiant.deactivatedAt && (
        <p className="mt-2 rounded-sm bg-destructive/10 px-3 py-2 text-caption text-destructive">
          Compte suspendu depuis le {dateCourte(etudiant.deactivatedAt)} — toutes ses sessions sont fermées.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-4 rounded-card border border-border p-4">
        <h3 className="font-heading text-heading text-ink">Actions sur le compte</h3>
        <Button
          variant={etudiant.deactivatedAt ? "primary" : "secondary"}
          size="sm"
          onClick={() =>
            void executer(async () => {
              await api.activationEtudiantAdmin(etudiant.id, Boolean(etudiant.deactivatedAt));
              return etudiant.deactivatedAt ? "Compte rétabli." : "Compte suspendu.";
            })
          }
        >
          <UserCog size={16} aria-hidden />
          {etudiant.deactivatedAt ? "Rétablir le compte" : "Suspendre le compte"}
        </Button>

        <div className="flex flex-col gap-2">
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={motDePasse}
            hint="12 caractères minimum. Il est à transmettre hors plateforme."
            onChange={(event) => setMotDePasse(event.target.value)}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={motDePasse.length < 12}
            onClick={() =>
              void executer(async () => {
                const resultat = await api.motDePasseEtudiantAdmin(etudiant.id, motDePasse);
                setMotDePasse("");
                return `Mot de passe réinitialisé pour ${resultat.email ?? "ce compte"}.`;
              })
            }
          >
            <KeyRound size={16} aria-hidden /> Réinitialiser
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="admin-motif" className="text-caption font-medium text-ink-muted">
            Attribuer un point
          </label>
          <select
            id="admin-motif"
            className={controle}
            value={motif}
            onChange={(event) => setMotif(event.target.value)}
          >
            {["projet-termine", "pair-aide", "solution-partagee", "erreur-documentee"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            className={controle}
            value={detail}
            placeholder="Détail (ce qui justifie le point)"
            onChange={(event) => setDetail(event.target.value)}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={!detail.trim()}
            onClick={() =>
              void executer(async () => {
                await api.attribuerPointAdmin(etudiant.id, motif, detail.trim());
                setDetail("");
                return "Point attribué.";
              })
            }
          >
            <Medal size={16} aria-hidden /> Attribuer
          </Button>
          <p className="text-caption text-ink-muted">
            Les quatre gestes restent ceux du cadrage : l’administration corrige un oubli, elle n’ajoute pas
            de source de points.
          </p>
        </div>

        {message && <p className="text-caption text-primary">{message}</p>}
      </div>

      <ListeDossier
        titre="Comptes d’accès"
        items={dossier.comptes.map((compte) => ({
          id: compte.id,
          principal: compte.email ?? "sans adresse",
          secondaire: compte.provider,
        }))}
      />
      <ListeDossier
        titre="Projets"
        items={dossier.projets.map((projet) => ({
          id: projet.id,
          principal: projet.nom,
          secondaire: `${projet.statut} · ${projet.public ? "public" : "privé"} · ${dateCourte(projet.updatedAt)}`,
        }))}
      />
      <ListeDossier
        titre="Points"
        items={dossier.points.map((point) => ({
          id: point.id,
          principal: point.detail,
          secondaire: `${point.motif} · ${dateCourte(point.date)}`,
        }))}
      />
      <ListeDossier
        titre="Discussions"
        items={dossier.discussions.map((sujet) => ({
          id: sujet.id,
          principal: sujet.titre,
          secondaire: `${sujet.categorie} · ${dateCourte(sujet.date)}`,
        }))}
      />
      <ListeDossier
        titre="Fiches"
        items={dossier.fiches.map((fiche) => ({
          id: fiche.id,
          principal: fiche.titre,
          secondaire: `${fiche.etat} · ${dateCourte(fiche.createdAt)}`,
        }))}
      />
      <ListeDossier
        titre="Événements"
        items={dossier.evenements.map((evenement) => ({
          id: evenement.id,
          principal: evenement.titre,
          secondaire: `${evenement.type} · ${dateCourte(evenement.date)}`,
        }))}
      />
      <ListeDossier
        titre="Conversations Copilote (titres seuls)"
        items={dossier.conversations.map((fil) => ({
          id: fil.id,
          principal: fil.title,
          secondaire: `${fil.role} · ${fil.messageCount} messages · ${dateCourte(fil.updatedAt)}`,
        }))}
      />
      <ListeDossier
        titre="Notifications"
        items={dossier.notifications.map((notification) => ({
          id: notification.id,
          principal: notification.titre,
          secondaire: `${notification.nature} · ${notification.lu ? "lue" : "non lue"} · ${dateCourte(notification.date)}`,
        }))}
      />
    </div>
  );
}

function DossierEntreprise({
  dossier,
  onErreur,
}: {
  dossier: AdminDossierEntreprise;
  onErreur: (message: string) => void;
}) {
  const { entreprise } = dossier;
  const [motDePasse, setMotDePasse] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <p className="text-body text-ink">{entreprise.secteur}</p>
      {entreprise.presentation && <p className="mt-2 text-body text-ink-muted">{entreprise.presentation}</p>}
      <p className="mt-2 text-caption text-ink-muted">
        Technos recherchées : {entreprise.technosRecherchees.join(", ") || "—"}
      </p>
      <p className="text-caption text-ink-muted">
        Profils recherchés : {entreprise.profilsRecherches.join(", ") || "—"}
      </p>

      <div className="mt-5 flex flex-col gap-2 rounded-card border border-border p-4">
        <h3 className="font-heading text-heading text-ink">Accès</h3>
        <Input
          label="Nouveau mot de passe"
          type="password"
          value={motDePasse}
          hint="12 caractères minimum."
          onChange={(event) => setMotDePasse(event.target.value)}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={motDePasse.length < 12}
          onClick={() => {
            setMessage(null);
            void api
              .motDePasseEntrepriseAdmin(entreprise.id, motDePasse)
              .then((resultat) => {
                setMotDePasse("");
                setMessage(`Mot de passe réinitialisé pour ${resultat.email}.`);
              })
              .catch((cause: unknown) => onErreur(erreurTexte(cause)));
          }}
        >
          <KeyRound size={16} aria-hidden /> Réinitialiser
        </Button>
        {message && <p className="text-caption text-primary">{message}</p>}
      </div>

      <ListeDossier
        titre="Comptes d’accès"
        items={dossier.comptes.map((compte) => ({ id: compte.id, principal: compte.email }))}
      />
      <ListeDossier
        titre="Annonces"
        items={dossier.annonces.map((annonce) => ({
          id: annonce.id,
          principal: annonce.titre,
          secondaire: `${annonce.nature} · ${dateCourte(annonce.publishedAt)}`,
        }))}
      />
      <ListeDossier
        titre="Défis sponsorisés"
        items={dossier.defis.map((defi) => ({
          id: defi.id,
          principal: defi.titre,
          secondaire: `${defi.techno} · ${dateCourte(defi.debut)}`,
        }))}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Réglages de la plateforme                                           */
/* ------------------------------------------------------------------ */

const LEVIERS: Array<{ cle: keyof ReglagesPlateforme; libelle: string; explication: string }> = [
  {
    cle: "inscriptionsOuvertes",
    libelle: "Inscriptions étudiantes",
    explication: "Fermées, la création de compte répond « momentanément fermées ». Les comptes existants ne changent pas.",
  },
  {
    cle: "inscriptionsEntrepriseOuvertes",
    libelle: "Inscriptions entreprises",
    explication: "Même règle, côté comptes entreprise.",
  },
  {
    cle: "copiloteActif",
    libelle: "Copilote IA",
    explication: "Coupé, l’envoi de message est refusé ; l’historique déjà écrit reste lisible.",
  },
  {
    cle: "maintenance",
    libelle: "Maintenance",
    explication:
      "Toutes les écritures étudiantes et entreprise sont suspendues. La lecture reste ouverte, et l’administration continue de fonctionner.",
  },
];

function PanneauReglages({
  reglages,
  onChange,
  onErreur,
}: {
  reglages: ReglagesPlateforme;
  onChange: (reglages: ReglagesPlateforme) => void;
  onErreur: (message: string) => void;
}) {
  const [titre, setTitre] = useState(reglages.annonce?.titre ?? "");
  const [corps, setCorps] = useState(reglages.annonce?.corps ?? "");
  const [ton, setTon] = useState<"info" | "alerte">(reglages.annonce?.ton ?? "info");
  const [envoi, setEnvoi] = useState(false);

  const appliquer = async (partiel: Partial<ReglagesPlateforme>) => {
    setEnvoi(true);
    try {
      onChange((await api.majReglagesAdmin(partiel)).reglages);
    } catch (cause) {
      onErreur(erreurTexte(cause));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="rounded-card border border-border bg-card p-5 sm:p-6">
      <h2 className="font-heading text-heading text-ink">Leviers de la plateforme</h2>
      <p className="mt-2 text-body text-ink-muted">
        Chaque bascule prend effet en quelques secondes, sans redémarrage.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {LEVIERS.map(({ cle, libelle, explication }) => {
          const actif = Boolean(reglages[cle]);
          const dangereux = cle === "maintenance";
          return (
            <li key={cle} className="flex items-start justify-between gap-4 rounded-sm border border-border p-3">
              <div className="min-w-0">
                <p className="text-body text-ink">{libelle}</p>
                <p className="mt-1 text-caption text-ink-muted">{explication}</p>
              </div>
              <Button
                variant={actif === dangereux ? "secondary" : "primary"}
                size="sm"
                disabled={envoi}
                onClick={() => void appliquer({ [cle]: !actif } as Partial<ReglagesPlateforme>)}
              >
                {dangereux ? (actif ? "Désactiver" : "Activer") : actif ? "Fermer" : "Ouvrir"}
              </Button>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-6 font-heading text-heading text-ink">Bandeau d’annonce</h3>
      <p className="mt-1 text-body text-ink-muted">
        Affiché en haut de l’application tant qu’il est posé. Vider le titre et le corps le retire.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <input
          className={controle}
          value={titre}
          placeholder="Titre"
          onChange={(event) => setTitre(event.target.value)}
        />
        <textarea
          className={controle}
          rows={3}
          value={corps}
          placeholder="Message"
          onChange={(event) => setCorps(event.target.value)}
        />
        <select className={controle} value={ton} onChange={(event) => setTon(event.target.value as "info" | "alerte")}>
          <option value="info">Information</option>
          <option value="alerte">Alerte</option>
        </select>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="sm"
            disabled={envoi}
            onClick={() =>
              void appliquer({
                annonce: titre.trim() || corps.trim() ? { titre: titre.trim(), corps: corps.trim(), ton } : null,
              })
            }
          >
            Publier le bandeau
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={envoi || !reglages.annonce}
            onClick={() => {
              setTitre("");
              setCorps("");
              void appliquer({ annonce: null });
            }}
          >
            Retirer
          </Button>
        </div>
      </div>
    </section>
  );
}

function PanneauNotification({ onErreur }: { onErreur: (message: string) => void }) {
  const [titre, setTitre] = useState("");
  const [corps, setCorps] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="rounded-card border border-border bg-card p-5 sm:p-6">
      <h2 className="font-heading text-heading text-ink">Notification à toute la promotion</h2>
      <p className="mt-2 text-body text-ink-muted">
        Écrit une notification datée dans le fil de chaque compte actif. À la différence du bandeau, chacun la
        lit puis l’archive.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <input
          className={controle}
          value={titre}
          placeholder="Titre"
          onChange={(event) => setTitre(event.target.value)}
        />
        <textarea
          className={controle}
          rows={3}
          value={corps}
          placeholder="Message"
          onChange={(event) => setCorps(event.target.value)}
        />
        <div>
          <Button
            variant="primary"
            size="sm"
            disabled={envoi || !titre.trim()}
            onClick={() => {
              setEnvoi(true);
              setMessage(null);
              void api
                .notifierAdmin(titre.trim(), corps.trim())
                .then((resultat) => {
                  setTitre("");
                  setCorps("");
                  setMessage(`Envoyée à ${resultat.envoyees} compte${resultat.envoyees > 1 ? "s" : ""}.`);
                })
                .catch((cause: unknown) => onErreur(erreurTexte(cause)))
                .finally(() => setEnvoi(false));
            }}
          >
            <BellRing size={16} aria-hidden /> Envoyer
          </Button>
        </div>
        {message && <p className="text-caption text-primary">{message}</p>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Écran principal                                                     */
/* ------------------------------------------------------------------ */

type EtatTiroir =
  | { genre: "edition"; nom: AdminCollection; ligne: Record<string, unknown> }
  | { genre: "etudiant"; dossier: AdminDossierEtudiant }
  | { genre: "entreprise"; dossier: AdminDossierEntreprise };

export function AdminScreen({ navigate: _navigate }: { navigate: (to: Route) => void }) {
  const [apercu, setApercu] = useState<AdminOverview | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [section, setSection] = useState<SectionAdmin>("vue");
  const [saisie, setSaisie] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [collection, setCollection] = useState<AdminCollectionPage | null>(null);
  const [chargementListe, setChargementListe] = useState(false);
  const [tiroir, setTiroir] = useState<EtatTiroir | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!estSurHoteAdmin()) window.location.replace(urlAdmin({ name: "admin-connexion" }));
  }, []);

  const chargerApercu = useCallback(async () => {
    try {
      const session = await api.sessionAdmin();
      if (!session.admin) {
        window.location.hash = "#/admin/connexion";
        return;
      }
      setApercu(await api.apercuAdmin());
    } catch (cause) {
      setErreur(erreurTexte(cause));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (estSurHoteAdmin()) void chargerApercu();
  }, [chargerApercu, revision]);

  /* La frappe ne déclenche pas une requête par caractère : 300 ms de silence
     valent une intention de chercher. */
  useEffect(() => {
    const minuteur = window.setTimeout(() => {
      setRecherche(saisie.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(minuteur);
  }, [saisie]);

  useEffect(() => {
    setSaisie("");
    setRecherche("");
    setPage(1);
  }, [section]);

  useEffect(() => {
    if (section === "vue" || !estSurHoteAdmin()) return;
    const controleur = new AbortController();
    setChargementListe(true);
    api
      .collectionAdmin(section, { q: recherche, page, taille: TAILLE_PAGE }, controleur.signal)
      .then(setCollection)
      .catch((cause: unknown) => {
        if (controleur.signal.aborted) return;
        setErreur(erreurTexte(cause));
      })
      .finally(() => {
        if (!controleur.signal.aborted) setChargementListe(false);
      });
    return () => controleur.abort();
  }, [section, recherche, page, revision]);

  const rafraichir = () => setRevision((valeur) => valeur + 1);

  const supprimer = async (nom: AdminCollection, ligne: Record<string, unknown>) => {
    if (
      !window.confirm(
        `Supprimer définitivement « ${titreDe(nom, ligne)} » ? Cette action est irréversible et retire tout ce qui en dépend.`,
      )
    ) {
      return;
    }
    try {
      await api.supprimerAdmin(nom, String(ligne["id"]));
      rafraichir();
    } catch (cause) {
      setErreur(erreurTexte(cause));
    }
  };

  const ouvrirDossier = async (nom: AdminCollection, id: string) => {
    try {
      if (nom === "etudiants") {
        setTiroir({ genre: "etudiant", dossier: await api.dossierEtudiantAdmin(id) });
      } else if (nom === "entreprises") {
        setTiroir({ genre: "entreprise", dossier: await api.dossierEntrepriseAdmin(id) });
      }
    } catch (cause) {
      setErreur(erreurTexte(cause));
    }
  };

  const deconnecter = async () => {
    await api.deconnexionAdmin();
    window.location.hash = "#/admin/connexion";
  };

  if (!estSurHoteAdmin()) return null;
  if (chargement && !apercu) {
    return (
      <Screen className="grid min-h-dvh place-items-center">
        <LoaderCircle className="animate-spin text-primary" size={28} />
      </Screen>
    );
  }
  if (!apercu) {
    return (
      <Screen>
        <p role="alert" className="rounded-sm bg-destructive/10 px-4 py-3 text-body text-destructive">
          {erreur ?? "Administration indisponible."}
        </p>
      </Screen>
    );
  }

  const colonnes = section === "vue" ? [] : COLONNES[section];
  const titreSection = SECTIONS.find((item) => item.id === section)?.libelle ?? "";

  return (
    <Screen className="max-w-none">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="label-eyebrow">Administration</span>
          <h1 className="mt-2 font-display text-display-2 text-ink">Centre de gestion</h1>
          <p className="mt-2 text-body text-ink-muted">
            Lecture, correction et suppression sur l’ensemble de la plateforme et de chaque espace.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void deconnecter()}>
          <LogOut size={16} aria-hidden /> Se déconnecter
        </Button>
      </header>

      {apercu.reglages.maintenance && (
        <p className="mt-5 rounded-sm bg-destructive/10 px-4 py-3 text-body text-destructive">
          Maintenance active : les écritures étudiantes et entreprise sont suspendues.
        </p>
      )}
      {erreur && (
        <p role="alert" className="mt-5 rounded-sm bg-destructive/10 px-4 py-3 text-body text-destructive">
          {erreur}
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <nav
          aria-label="Navigation de l'administration"
          className="flex gap-2 overflow-x-auto pb-1 xl:sticky xl:top-6 xl:h-fit xl:flex-col xl:overflow-visible"
        >
          {SECTIONS.map(({ id, libelle, Icone, compteur }) => (
            <button
              key={id}
              type="button"
              aria-current={section === id ? "page" : undefined}
              onClick={() => setSection(id)}
              className={`flex shrink-0 items-center gap-3 rounded-card border px-4 py-3 text-left text-body transition-colors ${
                section === id
                  ? "border-primary bg-primary-wash text-primary"
                  : "border-border bg-card text-ink-muted hover:border-border-strong hover:text-ink"
              }`}
            >
              <Icone size={17} aria-hidden />
              <span className="flex-1 whitespace-nowrap">{libelle}</span>
              {compteur && <span className="text-caption tabular-nums">{apercu.stats[compteur]}</span>}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {section === "vue" ? (
            <div className="flex flex-col gap-6">
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {(
                  [
                    { label: "Étudiants actifs", valeur: apercu.stats.etudiantsActifs, Icone: Users },
                    { label: "Entreprises", valeur: apercu.stats.entreprises, Icone: Building2 },
                    { label: "Projets en cours", valeur: apercu.stats.projetsEnCours, Icone: FolderKanban },
                    { label: "Historiques IA", valeur: apercu.stats.conversations, Icone: BrainCircuit },
                  ] as Array<{ label: string; valeur: number; Icone: typeof Users }>
                ).map(({ label, valeur, Icone }) => (
                  <div key={label} className="rounded-card border border-border bg-card p-5">
                    <Icone size={18} className="text-primary" aria-hidden />
                    <p className="mt-4 text-caption text-ink-muted">{label}</p>
                    <p className="mt-1 font-display text-display-2 text-ink">{valeur}</p>
                  </div>
                ))}
              </div>
              <PanneauReglages
                reglages={apercu.reglages}
                onChange={(reglages) => setApercu((courant) => (courant ? { ...courant, reglages } : courant))}
                onErreur={setErreur}
              />
              <PanneauNotification onErreur={setErreur} />
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 rounded-card border border-border bg-card px-3">
                <Search size={16} className="text-ink-muted" aria-hidden />
                <input
                  type="search"
                  value={saisie}
                  onChange={(event) => setSaisie(event.target.value)}
                  placeholder={`Rechercher dans « ${titreSection} »`}
                  aria-label={`Rechercher dans ${titreSection}`}
                  className="h-11 w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
                />
                {chargementListe && <LoaderCircle className="animate-spin text-primary" size={16} aria-hidden />}
              </div>

              <Zone title={`${titreSection} · ${collection?.total ?? 0}`}>
                <table className="w-full min-w-[42rem] text-left text-caption">
                  <thead>
                    <tr className="border-b border-border text-ink-muted">
                      {colonnes.map((colonne) => (
                        <th
                          key={colonne.cle}
                          scope="col"
                          className={`px-4 py-3 font-medium ${colonne.secondaire ? "hidden lg:table-cell" : ""}`}
                        >
                          {colonne.libelle}
                        </th>
                      ))}
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(collection?.lignes ?? []).map((ligne) => (
                      <tr key={String(ligne["id"])} className="border-b border-border last:border-0">
                        {colonnes.map((colonne) => (
                          <td
                            key={colonne.cle}
                            className={`px-4 py-3 align-top ${colonne.secondaire ? "hidden lg:table-cell" : ""} ${
                              colonne.cle === colonnes[0]?.cle ? "font-medium text-ink" : "text-ink-muted"
                            }`}
                          >
                            {cellule(ligne[colonne.cle], colonne.type)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right align-top">
                          <div className="flex justify-end gap-1">
                            {(section === "etudiants" || section === "entreprises") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void ouvrirDossier(section, String(ligne["id"]))}
                              >
                                <UserCog size={15} aria-hidden /> Dossier
                              </Button>
                            )}
                            {collection && Object.keys(collection.champs).length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTiroir({ genre: "edition", nom: section, ligne })}
                              >
                                <Pencil size={15} aria-hidden /> Modifier
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void supprimer(section, ligne)}
                            >
                              <Trash2 size={15} aria-hidden /> Supprimer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(collection?.lignes.length ?? 0) === 0 && !chargementListe && (
                      <tr>
                        <td colSpan={colonnes.length + 1} className="px-4 py-8 text-center text-ink-muted">
                          {recherche ? "Aucun résultat pour cette recherche." : "Rien à afficher."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Zone>

              <Pagination
                page={page}
                total={collection?.total ?? 0}
                pageSize={TAILLE_PAGE}
                onChange={setPage}
                itemLabel="élément"
              />
            </>
          )}
        </div>
      </div>

      {tiroir?.genre === "edition" && collection && (
        <Tiroir titre={`Modifier — ${titreDe(tiroir.nom, tiroir.ligne)}`} onClose={() => setTiroir(null)}>
          <EditeurLigne
            nom={tiroir.nom}
            ligne={tiroir.ligne}
            champs={collection.champs}
            onClose={() => setTiroir(null)}
            onEnregistre={() => {
              setTiroir(null);
              rafraichir();
            }}
          />
        </Tiroir>
      )}
      {tiroir?.genre === "etudiant" && (
        <Tiroir titre={tiroir.dossier.etudiant.nom} onClose={() => setTiroir(null)}>
          <DossierEtudiant
            dossier={tiroir.dossier}
            onAction={() => {
              setTiroir(null);
              rafraichir();
            }}
            onErreur={setErreur}
          />
        </Tiroir>
      )}
      {tiroir?.genre === "entreprise" && (
        <Tiroir titre={tiroir.dossier.entreprise.nom} onClose={() => setTiroir(null)}>
          <DossierEntreprise dossier={tiroir.dossier} onErreur={setErreur} />
        </Tiroir>
      )}
    </Screen>
  );
}
