import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useSoa } from "@/app/soa-store";
import { POINT_LABELS, POINT_VALUES, type PointEntry } from "@/domain/soa";
import { CLES, charger, enregistrer } from "@/lib/persistence";
import { Confetti } from "@/ui/Confetti";

/**
 * PointsCelebration.tsx — M12, hors cadrage (addition demandée directement).
 *
 * **Un seul mécanisme, pas un déclenchement par site d'appel.** Plutôt que
 * de faire sauter des confettis séparément à chaque mutation susceptible
 * d'en rapporter (`setProjectStatus`, `addJournalEntry`, `replyToThread`,
 * `answerMentorRequest` — tous écrivent déjà un point en optimiste, voir
 * `soa-store.tsx`), ce composant unique observe `points` et compare à
 * l'ensemble des points déjà fêtés, persisté dans `localStorage`. Ça couvre
 * uniformément deux cas :
 *   1. un geste propre à l'utilisateur (écrit en optimiste) — la fête est
 *      immédiate, comme sur Duolingo ;
 *   2. un point gagné par le geste de quelqu'un d'autre (une fiche qui
 *      « sert », `solution-partagee`) — asynchrone par nature, il
 *      n'apparaît qu'à la prochaine visite ; la fête a alors lieu à ce
 *      moment précis, qui est exactement celui où l'intéressé l'apprend.
 *
 * **Garde contre une fête de bienvenue non désirée.** Au tout premier
 * chargement après le déploiement de cette fonctionnalité, un étudiant peut
 * déjà avoir des années de points réels en base. Sans précaution, il
 * recevrait une explosion de confettis pour tout son historique dès sa
 * première visite. La première fois que `localStorage` ne contient aucun
 * ensemble « déjà vus », celui-ci est initialisé avec l'état courant sans
 * rien fêter — seuls les points qui apparaissent *après* ce tour comptent
 * comme nouveaux.
 */

function cleDe(p: PointEntry): string {
  return p.id ?? `${p.studentId}-${p.reason}-${p.date}`;
}

export function PointsCelebration() {
  const { points, connecte, me, hydrated } = useSoa();
  const [messages, setMessages] = useState<{ cle: string; texte: string }[]>([]);
  const [declencheur, setDeclencheur] = useState(0);
  const initialise = useRef(false);

  useEffect(() => {
    if (!connecte || !hydrated) return;

    const mesPoints = points.filter((p) => p.studentId === me.id);

    if (!initialise.current) {
      initialise.current = true;
      if (charger<string[]>(CLES.pointsVus) === null) {
        enregistrer(CLES.pointsVus, mesPoints.map(cleDe));
        return;
      }
    }

    const vus = new Set(charger<string[]>(CLES.pointsVus) ?? []);
    const nouveaux = mesPoints.filter((p) => !vus.has(cleDe(p)));
    if (nouveaux.length === 0) return;

    setMessages((m) => [
      ...nouveaux.map((p) => ({
        cle: cleDe(p),
        texte: `+${POINT_VALUES[p.reason]} · ${POINT_LABELS[p.reason]}`,
      })),
      ...m,
    ]);
    setDeclencheur((n) => n + 1);

    for (const p of nouveaux) vus.add(cleDe(p));
    enregistrer(CLES.pointsVus, [...vus]);
  }, [points, connecte, me.id, hydrated]);

  useEffect(() => {
    if (messages.length === 0) return;
    const minuterie = window.setTimeout(() => setMessages((m) => m.slice(0, -1)), 2600);
    return () => window.clearTimeout(minuterie);
  }, [messages]);

  if (!connecte) return null;

  return (
    <>
      <Confetti declencheur={declencheur} />
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.cle}
              initial={{ opacity: 0, y: -12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="rounded-full border border-accent bg-accent-soft px-4 py-2 text-caption font-medium text-on-accent shadow-lift"
            >
              {m.texte}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
