import type { APIRoute } from "astro";
import { db, Email, eq, NOW } from "astro:db";

export const POST: APIRoute = async ({ params, request }) => {
	try {
		const { id } = params;
		const { status } = await request.json();

		// Validate status
		if (!["read", "unread", "starred", "unstarred"].includes(status)) {
			return new Response(JSON.stringify({ error: "Invalid status" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Update email status
		const email = await db
			.update(Email)
			.set({
				status,
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
		console.error("Error updating email status:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
