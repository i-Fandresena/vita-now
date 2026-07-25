import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

// La 3D est un bonus (DESIGN.md §6) : elle ne doit jamais peser sur le
// chargement initial. Le découpage se fait par `React.lazy` sur la scène
// elle-même — le bundler en déduit le chunk, sans configuration manuelle.
