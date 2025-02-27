import { db, AuthConfig, count, eq } from "astro:db";
import crypto from "node:crypto";

export class AuthSetup {
	private static instance: AuthSetup;

	private constructor() {}

	public static getInstance(): AuthSetup {
		if (!AuthSetup.instance) {
			AuthSetup.instance = new AuthSetup();
		}
		return AuthSetup.instance;
	}

	public generateKey(length = 32): string {
		return crypto.randomBytes(length).toString("hex");
	}

	public generatePassword(length = 16): string {
		const charset =
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		return Array.from(
			{ length },
			() => charset[crypto.randomInt(charset.length)],
		).join("");
	}

	async isInitialized(): Promise<boolean> {
		const value = await db.select({ value: count() }).from(AuthConfig).limit(1);
		return value[0].value > 0;
	}

	async getConfig(key: string): Promise<string | null> {
		const result = await db
			.select()
			.from(AuthConfig)
			.where(eq(AuthConfig.key, key))
			.limit(1);
		return result[0]?.value ?? null;
	}

	public async upsertConfig(
		key: "JWT_SECRET" | "API_TOKEN" | "ADMIN_PASSWORD" | string,
		value: string,
	) {
		await db
			.insert(AuthConfig)
			.values({
				id: crypto.randomUUID(),
				key,
				value,
				updateAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [AuthConfig.key],
				set: {
					value,
					updateAt: new Date(),
				},
			});
	}

	async initialize(password?: string): Promise<void> {
		const configs = {
			JWT_SECRET: this.generateKey(),
			API_TOKEN: this.generateKey(),
			ADMIN_PASSWORD: password || this.generatePassword(),
		};

		for (const [key, value] of Object.entries(configs)) {
			await this.upsertConfig(key, value);
		}
	}

	async updatePassword(newPassword: string): Promise<void> {
		await this.upsertConfig("ADMIN_PASSWORD", newPassword);
	}
}
