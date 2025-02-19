// @ts-check
import { defineConfig } from "astro/config";
import db from "@astrojs/db";
import tailwindcss from "@tailwindcss/vite";
import authSetup from "./integrations/astro-auth-setup";

import vercel from "@astrojs/vercel";

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
	adapter: vercel(),
});
