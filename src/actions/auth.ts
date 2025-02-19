import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { verifyAdminPassword, generateToken } from "@/lib/auth";

export const auth = {
	Login: defineAction({
		accept: "form",
		input: z.object({
			password: z.string(),
		}),
		handler: async ({ password }, { cookies }) => {
			if (!verifyAdminPassword(password)) {
				throw new ActionError({
					code: "UNAUTHORIZED",
					message: "Invalid password",
				});
			}

			const token = generateToken();

			cookies.set("auth-token", token, {
				httpOnly: true,
				secure: import.meta.env.PROD,
				sameSite: "lax",
				path: "/",
				maxAge: 60 * 60, // 1 hour
			});

			return {
				success: true,
				redirect: "/dashboard",
			};
		},
	}),
};
