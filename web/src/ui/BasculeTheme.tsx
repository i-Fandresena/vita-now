import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/cn";
import type { UserTheme } from "@/app/user-theme";

/**
 * BasculeTheme — le seul bouton clair/sombre du produit.
 *
 * Extrait du Shell parce qu'il sert désormais à trois endroits qui n'ont pas
 * la même mise en page : l'espace étudiant et l'espace entreprise (pastille
 * flottante, au-dessus de la barre d'onglets sur mobile) et l'administration,
 * qui n'a ni rail ni barre basse et le pose dans son en-tête.
 *
 * La préférence elle-même reste dans `user-theme.ts` : ce composant ne connaît
 * que l'état courant et le geste, jamais le stockage.
 */
export function BasculeTheme({
  theme,
  changerTheme,
  variante = "flottant",
  className,
}: {
  theme: UserTheme;
  changerTheme: () => void;
  /** `flottant` : pastille fixe en bas à droite. `inline` : dans un en-tête. */
  variante?: "flottant" | "inline";
  className?: string;
}) {
  const sombre = theme === "dark";

  return (
    <button
      type="button"
      onClick={changerTheme}
      className={cn(
        "grid size-11 place-items-center rounded-full border border-border bg-card text-ink shadow-lift",
        "transition-[background-color,color,transform] duration-150 hover:-translate-y-0.5 hover:bg-surface",
        variante === "flottant" && "fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6",
        className,
      )}
      aria-label={sombre ? "Passer en mode clair" : "Passer en mode sombre"}
      title={sombre ? "Mode clair" : "Mode sombre"}
    >
      {sombre ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
    </button>
  );
}
