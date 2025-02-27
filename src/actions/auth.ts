import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { verifyAdminPassword, generateToken } from "@/lib/auth";
import { AuthSetup } from "@/lib/auth/setup";
import { db } from "astro:db";

export const auth = {
	Login: defineAction({
		accept: "form",
		input: z.object({
			password: z.string(),
		}),
		handler: async ({ password }, { cookies }) => {
			const isValid = await verifyAdminPassword(password);

			if (!isValid) {
				throw new ActionError({
					code: "UNAUTHORIZED",
					message: "Invalid password",
				});
			}

			const token = await generateToken();

			// Set cookie with proper encoding
			cookies.set("auth-token", token, {
				httpOnly: true,
				secure: import.meta.env.PROD,
				sameSite: "lax",
				path: "/",
				maxAge: 60 * 60,
				encode: (value) => value,
			});

			return {
				success: true,
				redirect: "/",
			};
		},
	}),

	Setup: defineAction({
		accept: "form",
		input: z.object({
			password: z.string(),
		}),
		handler: async ({ password }) => {
			const auth = AuthSetup.getInstance();

			if (await auth.isInitialized()) {
				return {
					success: true,
					redirect: "/login",
				};
			}

			if (!password || password.length < 8) {
				throw new ActionError({
					code: "BAD_REQUEST",
					message: "Password must be at least 8 characters long",
				});
			}

			try {
				await auth.initialize(password);
				return {
					success: true,
					redirect: "/login",
				};
			} catch (error) {
				throw new ActionError({
					code: "BAD_REQUEST",
					message: error instanceof Error ? error.message : "Setup failed",
				});
			}
		},
	}),
	Logout: defineAction({
		accept: "form",
		handler: async (_, { cookies }) => {
			cookies.delete("auth-token");

			return {
				success: true,
				redirect: "/login",
			};
		},
	}),
	isValidPassword: defineAction({
		input: z.object({
			password: z.string(),
		}),
		handler: async ({ password }) => {
			const isValid = await verifyAdminPassword(password);

			return {
				success: true,
				isValid,
			};
		},
	}),
	changePassword: defineAction({
		accept: "form",
		input: z.object({
			password: z.string(),
			newPassword: z.string(),
		}),
		handler: async ({ password, newPassword }) => {
			const auth = AuthSetup.getInstance();
			const isValid = await verifyAdminPassword(password);

			if (!isValid) {
				throw new ActionError({
					code: "UNAUTHORIZED",
					message: "Invalid password",
				});
			}

			if (!newPassword || newPassword.length < 8) {
				throw new ActionError({
					code: "BAD_REQUEST",
					message: "Password must be at least 8 characters long",
				});
			}

			await auth.updatePassword(newPassword);

			return {
				success: true,
			};
		},
	}),
	regenerateToken: defineAction({
		accept: "form",
		handler: async () => {
			const auth = AuthSetup.getInstance();

			const newApiToken = await auth.upsertConfig(
				"API_TOKEN",
				auth.generateKey(),
			);

			return {
				success: true,
				newApiToken,
			};
		},
	}),
};
