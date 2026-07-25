import { createContext, useContext, useMemo, type ReactNode } from "react";

import { InMemoryFragmentRepository } from "@/data/InMemoryFragmentRepository";
import type { FragmentRepository } from "@/domain/repository";

/**
 * Inversion de dépendance à la frontière de l'UI.
 *
 * Aucun écran n'instancie ni n'importe une source de données : ils demandent
 * le port. Basculer la démo vers un backend pgvector revient à changer la
 * valeur passée ici, et rien d'autre.
 */
const RepositoryContext = createContext<FragmentRepository | null>(null);

export function RepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository?: FragmentRepository;
}) {
  const value = useMemo(
    () => repository ?? new InMemoryFragmentRepository(),
    [repository],
  );

  return (
    <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>
  );
}

export function useRepository(): FragmentRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) {
    throw new Error("useRepository doit être appelé sous un <RepositoryProvider>");
  }
  return repository;
}
