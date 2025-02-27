import type { APIRoute } from "astro";
import { db, Email, eq, NOW } from "astro:db";

export const POST: APIRoute = async ({ params, request }) => {
	try {
		const { id } = params;
		const { category } = await request.json();

		// Validate category
		if (!category || typeof category !== "string") {
			return new Response(JSON.stringify({ error: "Invalid category" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Update email category
		const email = await db
			.update(Email)
			.set({
				category: category.toLowerCase(),
				updateAt: NOW,
			})
			.where(eq(Email.id, String(id)))
			.returning()
			.get();

		if (!email) {
			return new Response(JSON.stringify({ error: "Email not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify(email), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error updating email category:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
