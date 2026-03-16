import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: "127.0.0.1",
    port: 4101,
    // safest: explicitly allow only your dev hostname
    allowedHosts: ["ddl.lodge20.net"]
  }
})
