import * as Primitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { enterTransition, exitTransition, reduceVariants, rise } from "@/lib/motion";

/**
 * Dialog — Radix pour le comportement (piège de focus, Échap, verrou de
 * défilement, ARIA), Framer pour l'entrée et la sortie.
 *
 * Le mouvement reste au niveau fonctionnel : 140 ms, 4px de montée, rien de
 * plus (DESIGN.md §5.2). Un dialogue qui rebondit est un dialogue qu'on
 * remarque — or celui-ci doit seulement apparaître.
 */

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Masquer le titre le laisse accessible aux lecteurs d'écran. */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  description,
  children,
  className,
}: DialogProps) {
  const reduced = useReducedMotion() ?? false;
  const variants = reduceVariants(rise, reduced);

  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Primitive.Portal forceMount>
            <Primitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-canvas/80 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: enterTransition }}
                exit={{ opacity: 0, transition: exitTransition }}
              />
            </Primitive.Overlay>

            <Primitive.Content asChild forceMount>
              <motion.div
                variants={variants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 w-[min(34rem,calc(100vw-2rem))]",
                  "-translate-x-1/2 -translate-y-1/2",
                  "rounded-surface border border-line-soft bg-surface p-8",
                  "shadow-float",
                  className,
                )}
              >
                <div className="flex items-start justify-between gap-8">
                  <Primitive.Title
                    className={cn(
                      "font-display text-title font-normal text-bone",
                      hideTitle && "sr-only",
                    )}
                  >
                    {title}
                  </Primitive.Title>
                  <Primitive.Close
                    aria-label="Fermer"
                    className="-m-2 rounded-control p-2 text-bone-3 transition-colors duration-90 hover:text-bone"
                  >
                    <X aria-hidden className="size-4" strokeWidth={1.5} />
                  </Primitive.Close>
                </div>

                {description && (
                  <Primitive.Description className="mt-3 text-body text-bone-3">
                    {description}
                  </Primitive.Description>
                )}

                <div className="mt-6">{children}</div>
              </motion.div>
            </Primitive.Content>
          </Primitive.Portal>
        )}
      </AnimatePresence>
    </Primitive.Root>
  );
}
