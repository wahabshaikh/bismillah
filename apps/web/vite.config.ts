import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // The API's TRUSTED_ORIGINS allows http://localhost:3000, so pin the port.
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
  // Resolves the `@/*` alias from tsconfig.json, which shadcn's CLI writes into generated code.
  resolve: { tsconfigPaths: true },
  plugins: [
    // Runs the server-side render inside workerd, the same runtime as production.
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
});
