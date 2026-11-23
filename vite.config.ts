import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Bridge only public Supabase URL and anon/publishable keys.
  // Never expose service-role or other secrets to the browser.
  const env = loadEnv(mode, process.cwd(), "");
  const publicSupabaseUrl =\n    env.VITE_SUPABASE_URL ||\n    env.NEXT_PUBLIC_SUPABASE_URL ||\n    env.SUPABASE_URL ||\n    "";
  const publicSupabaseKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    "";

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(publicSupabaseUrl),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(publicSupabaseKey),
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/lucide-react")) return "icons";
            if (id.includes("node_modules/@supabase/")) return "supabase";
            if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react-vendor";
          },
        },
      },
    },
  };
});
