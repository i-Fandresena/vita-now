import { useCallback, useEffect, useState } from "react";

export type UserTheme = "light" | "dark";

function preferenceEnregistree(identity: string | null): UserTheme {
  if (!identity) return "light";
  try {
    return window.localStorage.getItem(`vitanow:theme:${identity}`) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/**
 * Préférence visuelle liée au compte, pas au navigateur entier. Ainsi un
 * étudiant et une entreprise partageant le même poste gardent chacun leur
 * propre ambiance sans introduire une donnée de profil sensible côté serveur.
 */
export function useUserTheme(identity: string | null) {
  const [theme, setTheme] = useState<UserTheme>(() => preferenceEnregistree(identity));

  useEffect(() => {
    setTheme(preferenceEnregistree(identity));
  }, [identity]);

  useEffect(() => {
    const racine = document.documentElement;
    racine.classList.toggle("dark", Boolean(identity) && theme === "dark");
    racine.style.colorScheme = theme;
  }, [identity, theme]);

  const changerTheme = useCallback(() => {
    setTheme((precedent) => {
      const prochain: UserTheme = precedent === "dark" ? "light" : "dark";
      if (identity) {
        try {
          window.localStorage.setItem(`vitanow:theme:${identity}`, prochain);
        } catch {
          // Le thème bascule pendant la session même si le stockage est bloqué.
        }
      }
      return prochain;
    });
  }, [identity]);

  return { theme, changerTheme };
}
