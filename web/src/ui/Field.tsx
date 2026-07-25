import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

const control = [
  "w-full rounded-control bg-raised text-bone",
  "border border-line-soft lift",
  "placeholder:text-bone-4",
  "transition-[border-color,background-color] duration-90 ease-out",
  "hover:border-line-strong",
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
      <label htmlFor={id} className="label-archive">
        {label}
      </label>
      {children}
      {/* L'erreur ne se signale pas par la couleur : la braise est réservée aux
          deux moments narratifs (DESIGN.md §3.3). Elle se signale par le
          contraste maximal du texte et par un filet vertical. */}
      {(hint || error) && (
        <p
          id={`${id}-desc`}
          className={cn(
            "text-caption",
            error ? "border-l border-line-rule pl-3 text-bone" : "text-bone-3",
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
