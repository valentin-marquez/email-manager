// @ts-check
import { defineConfig } from "astro/config";
import db from "@astrojs/db";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import authSetup from "./integrations/astro-auth-setup";

// https://astro.build/config
export default defineConfig({
	integrations: [
		db(),
		authSetup({
			production: process.env.NODE_ENV === "production",
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
	output: "server",
	adapter: cloudflare(),
});
