import {
  Brain,
  Code2,
  History,
  LoaderCircle,
  MessageSquarePlus,
  Presentation,
  Send,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import {
  API_ACTIVE,
  api,
  type CopilotConversation,
  type CopilotMessage,
  type CopilotRole,
} from "@/data/api";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/Button";
import { Screen, ScreenHead } from "@/ui/layout";

type RoleDefinition = {
  id: CopilotRole;
  label: string;
  description: string;
  suggestion: string;
  icon: typeof Brain;
};

const ROLES: RoleDefinition[] = [
  {
    id: "pilotage",
    label: "Pilotage",
    description: "Priorités, prochaines étapes et rythme de travail.",
    suggestion: "Quelle est la prochaine action la plus utile sur mon projet ?",
    icon: Brain,
  },
  {
    id: "technique",
    label: "Déblocage technique",
    description: "Hypothèses, diagnostic et démarche de résolution.",
    suggestion: "J'ai un blocage technique : aide-moi à le diagnostiquer pas à pas.",
    icon: Code2,
  },
  {
    id: "soutenance",
    label: "Soutenance",
    description: "Pitch, démonstration et questions du jury.",
    suggestion: "Comment préparer une réponse convaincante à une question du jury ?",
    icon: Presentation,
  },
];

function texteErreur(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : "Une erreur est survenue.";
}

function formatDate(date: string): string {
  const rendu = new Date(date);
  if (Number.isNaN(rendu.getTime())) return "";
  const aujourdHui = new Date();
  const estAujourdHui = rendu.toDateString() === aujourdHui.toDateString();
  return estAujourdHui
    ? rendu.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : rendu.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Horaire({ date }: { date: string }) {
  const rendu = new Date(date);
  if (Number.isNaN(rendu.getTime())) return null;
  return (
    <time className="mt-1.5 block text-[0.6875rem] opacity-65" dateTime={date}>
      {rendu.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
    </time>
  );
}

export function CopilotScreen() {
  /* À chaque montage de l'onglet, ces états repartent volontairement sur une
     discussion vierge. L'historique reste accessible dans le panneau latéral,
     sans que l'étudiant continue un fil par mégarde. */
  const [role, setRole] = useState<CopilotRole>("pilotage");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [brouillon, setBrouillon] = useState("");
  const [historiqueCharge, setHistoriqueCharge] = useState(API_ACTIVE);
  const [discussionChargee, setDiscussionChargee] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const finConversation = useRef<HTMLDivElement>(null);

  const roleActif = ROLES.find((item) => item.id === role) ?? ROLES[0]!;
  const RoleIcon = roleActif.icon;
  const conversationActive = conversations.find((item) => item.id === conversationId);

  const chargerHistorique = useCallback(async () => {
    if (!API_ACTIVE) {
      setHistoriqueCharge(false);
      return;
    }
    setHistoriqueCharge(true);
    try {
      const { conversations: recues } = await api.conversationsCopilote();
      setConversations(recues);
    } catch (cause) {
      setErreur(texteErreur(cause));
    } finally {
      setHistoriqueCharge(false);
    }
  }, []);

  useEffect(() => {
    void chargerHistorique();
  }, [chargerHistorique]);

  useEffect(() => {
    finConversation.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, envoi, conversationId]);

  const nouvelleDiscussion = (prochainRole = role) => {
    setRole(prochainRole);
    setConversationId(null);
    setMessages([]);
    setBrouillon("");
    setErreur(null);
    setDiscussionChargee(false);
  };

  const ouvrirDiscussion = async (conversation: CopilotConversation) => {
    if (envoi || discussionChargee) return;
    setConversationId(conversation.id);
    setRole(conversation.role);
    setMessages([]);
    setBrouillon("");
    setErreur(null);
    setDiscussionChargee(true);
    try {
      const recu = await api.messagesConversationCopilote(conversation.id);
      setMessages(recu.messages);
    } catch (cause) {
      setConversationId(null);
      setErreur(texteErreur(cause));
    } finally {
      setDiscussionChargee(false);
    }
  };

  const envoyer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const contenu = brouillon.trim();
    if (!contenu || envoi || !API_ACTIVE || discussionChargee) return;

    const provisoire: CopilotMessage = {
      id: `local-${Date.now()}`,
      role,
      author: "user",
      content: contenu,
      createdAt: new Date().toISOString(),
    };
    setMessages((avant) => [...avant, provisoire]);
    setBrouillon("");
    setEnvoi(true);
    setErreur(null);

    try {
      const resultat = await api.envoyerMessageCopilote(role, contenu, conversationId ?? undefined);
      setConversationId(resultat.conversation.id);
      setMessages((avant) => [...avant, resultat.assistant]);
      await chargerHistorique();
    } catch (cause) {
      setMessages((avant) => avant.filter((message) => message.id !== provisoire.id));
      setBrouillon(contenu);
      setErreur(texteErreur(cause));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Screen className="max-w-none">
      <ScreenHead
        eyebrow="Copilote IA · Gemini"
        titre="Une idée à la fois."
        lede="Commence un nouveau fil quand tu arrives ; retrouve ensuite chaque échange au moment où il redevient utile."
        actions={
          <Button variant="secondary" size="sm" onClick={() => nouvelleDiscussion()} disabled={envoi}>
            <MessageSquarePlus size={16} aria-hidden />
            Nouvelle discussion
          </Button>
        }
      />

      <div className="mt-4 rounded-card border border-primary/20 bg-primary-wash p-3 text-caption text-primary flex items-center gap-2">
        <Brain size={16} className="shrink-0" />
        <span>
          <strong>Cadre pédagogique & professionnel :</strong> Le Copilote IA est configuré pour répondre exclusivement aux sujets liés à vos projets académiques, compétences informatiques et monde professionnel.
        </span>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="rounded-card border border-border bg-card p-3 shadow-card lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto" aria-label="Historique des discussions">
          <div className="flex items-center justify-between gap-3 px-2 pb-3">
            <span className="flex items-center gap-2 text-caption font-semibold text-ink">
              <History size={16} aria-hidden className="text-primary" />
              Discussions
            </span>
            <span className="text-caption text-ink-muted">{conversations.length}</span>
          </div>
          <Button className="w-full" variant="secondary" size="sm" onClick={() => nouvelleDiscussion()} disabled={envoi}>
            <MessageSquarePlus size={16} aria-hidden />
            Nouveau fil
          </Button>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {historiqueCharge && (
              <span className="flex items-center gap-2 px-2 py-3 text-caption text-ink-muted">
                <LoaderCircle size={15} className="animate-spin" aria-hidden /> Chargement…
              </span>
            )}
            {!historiqueCharge && conversations.length === 0 && (
              <p className="px-2 py-3 text-caption leading-relaxed text-ink-muted">
                Tes prochaines discussions apparaîtront ici.
              </p>
            )}
            {conversations.map((conversation) => {
              const definition = ROLES.find((item) => item.id === conversation.role) ?? ROLES[0]!;
              const Icone = definition.icon;
              const actif = conversation.id === conversationId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  aria-current={actif ? "page" : undefined}
                  onClick={() => void ouvrirDiscussion(conversation)}
                  className={cn(
                    "min-w-52 rounded-sm p-3 text-left transition-colors duration-150 lg:min-w-0",
                    actif ? "bg-primary-wash text-ink" : "hover:bg-surface text-ink",
                  )}
                >
                  <span className="flex items-center gap-2 text-caption font-medium">
                    <Icone size={14} aria-hidden className="shrink-0 text-primary" />
                    <span className="min-w-0 truncate">{conversation.title}</span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-caption text-ink-muted">
                    {conversation.preview ?? definition.label}
                  </span>
                  <span className="mt-1.5 block text-[0.6875rem] text-ink-muted">
                    {definition.label} · {formatDate(conversation.updatedAt)}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="overflow-hidden rounded-card border border-border bg-card shadow-card" aria-label="Discussion avec le Copilote">
          <div className="border-b border-border bg-surface/80 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-on-primary shadow-card">
                  <RoleIcon size={18} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold text-ink">
                    {conversationActive?.title ?? "Nouvelle discussion"}
                  </span>
                  <span className="block text-caption text-ink-muted">Copilote · {roleActif.label}</span>
                </span>
              </div>
              <div className="flex gap-1 overflow-x-auto" aria-label="Choisir une expertise">
                {ROLES.map((option) => {
                  const Icone = option.icon;
                  const actif = option.id === role;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      title={option.label}
                      aria-label={`Nouveau fil : ${option.label}`}
                      aria-pressed={actif && conversationId === null}
                      onClick={() => nouvelleDiscussion(option.id)}
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-150",
                        actif && conversationId === null ? "bg-primary text-on-primary" : "text-ink-muted hover:bg-card hover:text-ink",
                      )}
                    >
                      <Icone size={16} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-h-[25rem] space-y-5 bg-background/45 p-4 sm:min-h-[32rem] sm:p-6">
            {!API_ACTIVE && (
              <div className="rounded-sm border border-border bg-surface p-4 text-body text-ink-muted">
                Le Copilote nécessite la connexion à l'API. Il sera disponible dans l'environnement en ligne.
              </div>
            )}
            {discussionChargee && (
              <div className="flex items-center gap-2 text-body text-ink-muted" role="status">
                <LoaderCircle size={18} className="animate-spin" aria-hidden /> Chargement de la discussion…
              </div>
            )}
            {API_ACTIVE && !discussionChargee && messages.length === 0 && (
              <div className="mx-auto flex max-w-xl flex-col items-start gap-4 py-8 sm:py-14">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary-wash text-primary">
                  <Sparkles size={23} aria-hidden />
                </span>
                <div>
                  <h2 className="font-heading text-heading text-ink">Qu’aimerais-tu débloquer ?</h2>
                  <p className="mt-1 text-body text-ink-muted">
                    {roleActif.description} Ton message reste privé et le Copilote reçoit uniquement le contexte utile de tes projets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBrouillon(roleActif.suggestion)}
                  className="rounded-full border border-border bg-card px-4 py-2 text-left text-caption text-ink transition-colors hover:border-primary hover:text-primary"
                >
                  « {roleActif.suggestion} »
                </button>
              </div>
            )}

            {messages.map((message) => (
              <article key={message.id} className={cn("flex gap-2.5", message.author === "user" ? "justify-end" : "justify-start")}>
                {message.author === "assistant" && (
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary-wash text-primary">
                    <RoleIcon size={14} aria-hidden />
                  </span>
                )}
                <div className={cn("max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[76%] xl:max-w-[62rem]", message.author === "user" ? "rounded-tr-sm bg-primary text-on-primary shadow-card" : "rounded-tl-sm border border-border bg-card text-ink shadow-card")}>
                  <p className="whitespace-pre-wrap text-body leading-relaxed">{message.content}</p>
                  <Horaire date={message.createdAt} />
                </div>
              </article>
            ))}

            {envoi && (
              <div className="flex items-center gap-2.5" role="status" aria-label="Le Copilote prépare sa réponse">
                <span className="grid size-7 place-items-center rounded-full bg-primary-wash text-primary"><RoleIcon size={14} aria-hidden /></span>
                <span className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-caption text-ink-muted shadow-card">
                  <LoaderCircle size={16} className="animate-spin" aria-hidden /> Le Copilote réfléchit…
                </span>
              </div>
            )}
            {erreur && <p role="alert" className="rounded-sm bg-destructive/10 px-3 py-2 text-caption text-destructive">{erreur}</p>}
            <div ref={finConversation} />
          </div>

          <form onSubmit={(event) => void envoyer(event)} className="border-t border-border bg-card p-3 sm:p-4">
            <label htmlFor="copilote-message" className="sr-only">Votre message au Copilote</label>
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-wash">
              <textarea
                id="copilote-message"
                value={brouillon}
                onChange={(event) => setBrouillon(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={4000}
                disabled={!API_ACTIVE || envoi || discussionChargee}
                placeholder="Écris ton message…"
                className="min-h-12 max-h-40 flex-1 resize-y bg-transparent px-2 py-2.5 text-body text-ink outline-none placeholder:text-ink-muted disabled:opacity-50"
              />
              <Button variant="primary" size="icon" type="submit" disabled={!brouillon.trim() || !API_ACTIVE || envoi || discussionChargee} aria-label="Envoyer le message">
                <Send size={18} aria-hidden />
              </Button>
            </div>
            <p className="px-2 pt-2 text-caption text-ink-muted">Entrée pour envoyer · Maj + Entrée pour un retour à la ligne</p>
          </form>
        </section>
      </div>
    </Screen>
  );
}
