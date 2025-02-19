import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import crypto from "node:crypto";

interface AstroAuthSetupOptions {
	production?: boolean;
}

export function generateKey(length = 32): string {
	return crypto.randomBytes(length).toString("hex");
}

export function generatePassword(length = 16): string {
	const charset = {
		lowercase: "abcdefghijklmnopqrstuvwxyz",
		uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
		numbers: "0123456789",
	};
	const allowedChars = Object.values(charset).join("");
	return Array.from(
		{ length },
		() => allowedChars[crypto.randomInt(allowedChars.length)],
	).join("");
}

class EnvManager {
	private readonly requiredVariables = new Set([
		"JWT_SECRET",
		"API_TOKEN",
		"ADMIN_PASSWORD",
	]);
	private readonly envPath: string;

	constructor(envPath: string) {
		this.envPath = envPath;
	}

	private parseExistingEnv(): Record<string, string> {
		if (!existsSync(this.envPath)) return {};

		const content = readFileSync(this.envPath, "utf-8");
		const vars: Record<string, string> = {};

		for (const line of content.split("\n")) {
			const trimmedLine = line.trim();
			if (trimmedLine && !trimmedLine.startsWith("#")) {
				const [key, ...valueParts] = trimmedLine.split("=");
				if (key) {
					const value = valueParts.join("=").replace(/["']/g, "").trim();
					vars[key.trim()] = value;
				}
			}
		}

		return vars;
	}

	private generateDefaultValue(key: string): string {
		switch (key) {
			case "JWT_SECRET":
			case "API_TOKEN":
				return generateKey();
			case "ADMIN_PASSWORD":
				return generatePassword();
			default:
				return "";
		}
	}

	generateEnvContent(): string {
		const existingVars = this.parseExistingEnv();
		const lines = ["# Environment variables"];

		// Mantener variables existentes
		for (const [key, value] of Object.entries(existingVars)) {
			lines.push(`${key}="${value}"`);
		}

		// Agregar variables requeridas si no existen
		for (const requiredVar of this.requiredVariables) {
			if (!existingVars[requiredVar]) {
				lines.push(
					`${requiredVar}="${this.generateDefaultValue(requiredVar)}"`,
				);
			}
		}

		return lines.join("\n");
	}

	saveToFile() {
		const envDir = dirname(this.envPath);
		if (!existsSync(envDir)) {
			mkdirSync(envDir, { recursive: true });
		}
		writeFileSync(this.envPath, this.generateEnvContent());
	}

	getNewCredentials(): Record<string, string> {
		const existingVars = this.parseExistingEnv();
		const credentials: Record<string, string> = {};

		for (const requiredVar of this.requiredVariables) {
			if (!existingVars[requiredVar]) {
				credentials[requiredVar] = this.generateDefaultValue(requiredVar);
			}
		}

		return credentials;
	}
}

export default function authSetup(
	options: AstroAuthSetupOptions = {},
): AstroIntegration {
	let envManager: EnvManager;

	return {
		name: "astro-auth-setup",
		hooks: {
			"astro:config:setup": async ({ command, config }) => {
				const root = fileURLToPath(config.root);
				const envPath = join(
					root,
					command === "build" ? ".env.production" : ".env",
				);

				envManager = new EnvManager(envPath);
				envManager.saveToFile();

				const newCredentials = envManager.getNewCredentials();

				if (Object.keys(newCredentials).length > 0) {
					console.log("\n\x1b[34m====================================\x1b[0m");
					console.log("\x1b[32m🔐 Generated new credentials:\x1b[0m");
					console.log("\x1b[34m====================================\x1b[0m");

					for (const [key, value] of Object.entries(newCredentials)) {
						console.log(`\x1b[33m${key}:\x1b[0m ${value}`);
					}

					console.log("\x1b[34m====================================\x1b[0m");
					console.log(
						"\x1b[31m⚠️  Store this information in a safe place\x1b[0m",
					);
					console.log(
						"\x1b[36mCredentials have been saved to:\x1b[0m",
						envPath,
					);
					console.log("\x1b[34m====================================\x1b[0m\n");
				}
			},
		},
	};
}
