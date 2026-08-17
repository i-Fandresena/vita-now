import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Navigation de listes denses. Les pages restent courtes (cartes lisibles
 * sur mobile) et les contrôles ne s'affichent pas quand ils ne servent pas.
 */
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
  itemLabel = "élément",
  className,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const debut = (page - 1) * pageSize + 1;
  const fin = Math.min(page * pageSize, total);
  const numeros = Array.from(
    { length: Math.min(5, pages) },
    (_, index) => Math.min(Math.max(1, page - 2), Math.max(1, pages - 4)) + index,
  );

  return (
    <nav
      aria-label={`Pagination des ${itemLabel}s`}
      className={cn("mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between", className)}
    >
      <p className="text-caption text-ink-muted">
        {debut}–{fin} sur {total} {itemLabel}{total > 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1" role="group" aria-label="Pages">
        <button
          type="button"
          aria-label="Page précédente"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="grid size-9 place-items-center rounded-full border border-border bg-card text-ink transition-colors hover:border-border-strong disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        {numeros.map((numero) => (
          <button
            key={numero}
            type="button"
            aria-label={`Page ${numero}`}
            aria-current={numero === page ? "page" : undefined}
            onClick={() => onChange(numero)}
            className={cn(
              "grid size-9 place-items-center rounded-full text-caption font-medium transition-colors",
              numero === page
                ? "bg-primary text-on-primary"
                : "text-ink-muted hover:bg-surface hover:text-ink",
            )}
          >
            {numero}
          </button>
        ))}
        <button
          type="button"
          aria-label="Page suivante"
          disabled={page === pages}
          onClick={() => onChange(page + 1)}
          className="grid size-9 place-items-center rounded-full border border-border bg-card text-ink transition-colors hover:border-border-strong disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
