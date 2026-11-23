import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {\n  // Only bridge public Supabase URL and publishable/anon keys from integration env names.\n  // Never expose SUPABASE_SERVICE_ROLE_KEY or other secrets to the client.\n  const env = loadEnv(mode, process.cwd(), "");\n  const publicSupabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";\n  const publicSupabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || "";\n  return {\n    define: {\n      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(publicSupabaseUrl),\n      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(publicSupabaseKey),\n    },
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
});
