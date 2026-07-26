import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

const control = [
  "w-full rounded-sm bg-card text-ink",
  "border border-border",
  "placeholder:text-ink-muted",
  // `box-shadow` est volontairement hors de la transition : l'anneau de focus
  // doit apparaître au moment exact où le clavier arrive, pas 150 ms après.
  "transition-[border-color] duration-150 ease-out",
  "hover:border-border-strong",
  // L'anneau indigo remplace l'outline par défaut : sur un champ à bordure
  // arrondie, un contour décalé de 2px se lit comme un second cadre.
  "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-wash",
  "disabled:opacity-40 disabled:pointer-events-none",
].join(" ");

interface FieldShellProps {
  id: string;
  label: string;
  /** Aide persistante. Jamais un ton d'encouragement — une information. */
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}

function FieldShell({ id, label, hint, error, children, className }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="label-eyebrow">
        {label}
      </label>
      {children}
      {/* Le rouge est disponible dans la nouvelle direction (DESIGN.md pose un
          token `destructive`) : une erreur peut donc se signaler par la couleur
          sans dépenser le signal de réussite, qui est le jaune. */}
      {(hint || error) && (
        <p
          id={`${id}-desc`}
          className={cn(
            "text-caption",
            error ? "text-destructive" : "text-ink-muted",
          )}
          role={error ? "alert" : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, wrapperClassName, ...props }, ref) => {
    const id = useId();
    return (
      <FieldShell
        id={id}
        label={label}
        hint={hint}
        error={error}
        className={wrapperClassName}
      >
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${id}-desc` : undefined}
          className={cn(control, "h-11 px-3 text-body", className)}
          {...props}
        />
      </FieldShell>
    );
  },
);

Input.displayName = "Input";

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  hint?: ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, wrapperClassName, rows = 5, ...props }, ref) => {
    const id = useId();
    return (
      <FieldShell
        id={id}
        label={label}
        hint={hint}
        error={error}
        className={wrapperClassName}
      >
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${id}-desc` : undefined}
          className={cn(control, "resize-y px-3 py-3 text-body leading-relaxed", className)}
          {...props}
        />
      </FieldShell>
    );
  },
);

Textarea.displayName = "Textarea";
