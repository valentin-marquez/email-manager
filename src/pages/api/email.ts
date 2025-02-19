import type { APIRoute } from "astro";
import { db, Email, eq } from "astro:db";

interface EmailPayload {
	from: string;
	to: string;
	subject: string;
	content: string;
	raw: Record<string, unknown>;
	category?: string;
}

export const POST: APIRoute = async ({ request }) => {
	// Validate API token
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || authHeader !== `Bearer ${import.meta.env.API_TOKEN}`) {
		return new Response("Unauthorized", { status: 401 });
	}

	try {
		const payload = (await request.json()) as EmailPayload;

		// Insert email into database
		const email = await db.insert(Email).values({
			id: crypto.randomUUID(),
			from: payload.from,
			to: payload.to,
			subject: payload.subject,
			content: payload.content,
			raw: payload.raw,
			category: payload.category || "uncategorized",
			receivedAt: new Date(),
			status: "unread",
		});

		return new Response(JSON.stringify(email), {
			status: 201,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		console.error("Error storing email:", error);
		return new Response("Error processing email", {
			status: 500,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}
};

export const get: APIRoute = async ({ params, request }) => {
	const url = new URL(request.url);
	const category = url.searchParams.get("category");

	const emails = await db
		.select()
		.from(Email)
		.where(category ? eq(Email.category, category) : undefined);

	return new Response(JSON.stringify(emails), {
		headers: { "Content-Type": "application/json" },
	});
};
