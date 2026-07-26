import { Search } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { cn } from "@/lib/cn";
import { Button } from "@/ui/Button";

/**
 * Le champ de recherche — l'objet central du produit.
 *
 * L'ancienne direction posait ici un simple filet sous le texte, « comme une
 * ligne de cahier ». Ce geste supposait une page nue ; dans le registre du
 * template — cartes à grand rayon, ombres douces, fonds alternés — un filet nu
 * ne se rattache à rien et se lit comme un champ inachevé. Le champ devient
 * donc un objet plein : même rayon que les cartes, même bordure, et l'indigo
 * du focus posé sur l'anneau plutôt que sur un trait.
 *
 * Ce qui ne change pas : le champ ne montre ni suggestion, ni recherche
 * récente, ni historique. On ne gère rien ici, on demande une chose.
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
        Décris ce qui te bloque
      </label>

      <div
        className={cn(
          "flex items-center gap-3 rounded-card border bg-card px-5 py-3",
          focused
            ? // Le focus est instantané, dans les deux sens. Un indicateur de
              // focus qui met 150 ms à arriver est un indicateur qui ment sur
              // l'endroit où se trouve réellement le clavier.
              "border-primary shadow-lift ring-4 ring-primary-wash"
            : "border-border shadow-card transition-[border-color,box-shadow] duration-150 ease-out",
        )}
      >
        <Search aria-hidden className="size-5 shrink-0 text-ink-muted" />

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
            "min-w-0 flex-1 bg-transparent py-2",
            "text-body text-ink placeholder:text-ink-muted",
            // L'anneau vit sur le conteneur : un second contour ici doublerait
            // le signal de focus.
            "focus-visible:outline-none",
            // Neutralise l'apparence native du type=search.
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!value.trim()}
          className="shrink-0"
        >
          Chercher
        </Button>
      </div>

      {showHint && (
        <p
          className={cn(
            "mt-3 pl-1 text-caption text-ink-muted transition-opacity duration-150",
            value.trim() ? "opacity-100" : "opacity-0",
          )}
        >
          Entrée pour chercher
        </p>
      )}
    </form>
  );
}
