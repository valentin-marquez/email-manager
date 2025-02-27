import type { APIRoute } from "astro";
import { db, Email, eq } from "astro:db";
import { verifyToken } from "@/lib/auth"; // Adjust the import path as needed

export const GET: APIRoute = async ({ params, cookies }) => {
	try {
		// Get the auth token from cookies
		const authToken = cookies.get("auth-token")?.value;

		// Check if token exists and is valid
		if (!authToken || !(await verifyToken(authToken))) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: {
					"Content-Type": "application/json",
				},
			});
		}

		const { id } = params;
		const email = await db
			.select()
			.from(Email)
			.where(eq(Email.id, String(id)))
			.get();

		if (!email) {
			return new Response(JSON.stringify({ error: "Email not found" }), {
				status: 404,
				headers: {
					"Content-Type": "application/json",
				},
			});
		}

		return new Response(JSON.stringify(email), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		console.error("Error fetching email:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}
};
