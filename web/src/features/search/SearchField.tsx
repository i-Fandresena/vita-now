import { useRef, useState, type FormEvent } from "react";

import { cn } from "@/lib/cn";

/**
 * Le champ de recherche — l'objet central du produit.
 *
 * Trois décisions qui le distinguent d'un champ de formulaire :
 *
 * 1. Pas de boîte. Un filet sous le texte, comme une ligne de cahier. Une
 *    bordure fermée ferait « formulaire » ; une ligne fait « on écrit ici ».
 * 2. Le filet devient braise quand le champ est actif — c'est le cas 3 de la
 *    loi de la braise (DESIGN.md §3.3) : le focus clavier. Le seul instant de
 *    chaleur de l'écran d'accueil est celui où quelqu'un pose sa question.
 * 3. Le changement est instantané, pas animé (DESIGN.md §5.2) : un indicateur
 *    de focus qui met 200 ms à arriver est un indicateur qui ment.
 *
 * Le texte saisi est en sans : dans ce produit, le serif est la voix du
 * produit, le sans est la voix de l'utilisateur.
 */

interface SearchFieldProps {
  defaultValue?: string;
  onSubmit: (query: string) => void;
  autoFocus?: boolean;
  /** L'indice d'envoi n'a de sens que sur l'accueil vierge. */
  showHint?: boolean;
  className?: string;
}

const PLACEHOLDER =
  "Deux appareils modifient la même donnée hors ligne, je ne sais pas laquelle garder…";

export function SearchField({
  defaultValue = "",
  onSubmit,
  autoFocus = false,
  showHint = true,
  className,
}: SearchFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn("w-full", className)}>
      <label htmlFor="requete" className="sr-only">
        Décrivez votre blocage
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id="requete"
          name="requete"
          type="search"
          autoComplete="off"
          spellCheck={false}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- l'accueil n'a qu'une action
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={PLACEHOLDER}
          className={cn(
            "w-full bg-transparent pb-5 pr-8",
            "text-title text-bone placeholder:text-bone-4",
            "focus-visible:outline-none",
            // Neutralise l'apparence native du type=search.
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />

        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-line-soft" />
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-0 bottom-0 h-px bg-ember",
            focused ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      {showHint && (
        <p
          className={cn(
            "mt-4 text-caption text-bone-4 transition-opacity duration-140",
            value.trim() ? "opacity-100" : "opacity-0",
          )}
        >
          Entrée pour chercher
        </p>
      )}
    </form>
  );
}
