import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { surEchecSync } from "@/app/sync";
import { Icon } from "@/ui/Icon";

/**
 * BandeauSync — ce qui n'a pas été enregistré, dit à voix haute.
 *
 * Le store applique ses mutations localement puis pousse vers le serveur
 * (`app/sync.ts`). Si l'appel échoue, l'écran continue d'afficher un état que
 * le serveur n'a pas. **Ne pas le signaler serait le seul vrai mensonge de
 * l'application** : l'utilisateur croirait son travail enregistré, et le
 * découvrirait au rechargement suivant, sans moyen de le retrouver.
 *
 * Le bandeau dit donc trois choses, dans cet ordre : ce qui a échoué, que le
 * texte est toujours à l'écran, et qu'un rechargement le perdra. C'est
 * suffisant pour que quelqu'un copie son texte avant de recharger — la seule
 * action utile à ce moment-là.
 *
 * Placé en bas et non en haut : sur mobile, le haut de l'écran porte le titre
 * de la page, et recouvrir ce repère pendant qu'on lit une erreur ajoute de la
 * confusion. En bas, il s'installe au-dessus de la barre d'onglets.
 */
export function BandeauSync() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => surEchecSync(setMessage), []);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          // `polite` et non `assertive` : l'information est importante mais
          // n'exige pas d'interrompre la lecture en cours d'un lecteur d'écran.
          aria-live="polite"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 bottom-0 z-50 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-4"
        >
          <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-card border border-destructive/30 bg-card px-4 py-3 shadow-card mx-4 sm:mx-auto">
            <Icon
              name="alertTriangle"
              size={16}
              aria-hidden
              className="mt-0.5 shrink-0 text-destructive"
            />
            <div className="min-w-0 flex-1">
              <p className="text-caption font-medium text-ink">{message}</p>
              <p className="mt-0.5 text-caption text-ink-muted">
                Ce que tu vois est toujours là, mais un rechargement le perdra.
                Copie ton texte avant de recharger.
              </p>
            </div>
            <button
              onClick={() => setMessage(null)}
              aria-label="Masquer l'avertissement"
              className="-mr-1 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
