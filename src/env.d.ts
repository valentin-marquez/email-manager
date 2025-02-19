/// <reference types="astro/client" />
interface ImportMetaEnv {
	readonly JWT_SECRET: string;
	readonly API_TOKEN: string;
	readonly ADMIN_PASSWORD: string;
}

interface importMeta {
	readonly env: ImportMetaEnv;
}

declare namespace App {
	interface Locals {
		auth: {
			token: string | undefined;
			isAuthenticated: boolean;
		};
	}
}
