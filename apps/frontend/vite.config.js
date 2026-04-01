import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@plastmassa/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
        },
    },
    server: {
        port: 6001,
        proxy: {
            "/api": {
                target: "http://localhost:6000",
                changeOrigin: true,
            },
        },
    },
});
