import { createContext, useContext, useMemo, type ReactNode } from "react";

import { API_ACTIVE } from "@/data/api";
import { HttpFragmentRepository } from "@/data/HttpFragmentRepository";
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
  /* Le choix se fait ici, et nulle part ailleurs — c'est la promesse du
     HANDOFF §4 : une seule ligne sépare la démonstration du produit servi,
     et aucun écran ne sait lequel des deux il utilise. */
  const value = useMemo(
    () =>
      repository ??
      (API_ACTIVE ? new HttpFragmentRepository() : new InMemoryFragmentRepository()),
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
