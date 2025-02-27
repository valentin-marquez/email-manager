import type { APIRoute } from "astro";
import { db, Email, eq } from "astro:db";
import { verifyApiToken, verifyToken } from "@/lib/auth";

interface EmailPayload {
	from: string;
	to: string;
	subject: string;
	content: string;
	raw: Record<string, unknown>;
	category?: string;
}

async function checkAuth(request: Request): Promise<boolean> {
	try {
		const authHeader = request.headers.get("Authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			console.log("Invalid auth header format");
			return false;
		}

		const token = authHeader.slice(7);
		console.log("Checking token:", token);

		// First try JWT token
		const isJwtValid = await verifyToken(token);
		if (isJwtValid) return true;

		// Then try API token
		const isApiTokenValid = await verifyApiToken(token);
		if (isApiTokenValid) return true;

		console.log("Token validation failed");
		return false;
	} catch (error) {
		console.error("Auth check error:", error);
		return false;
	}
}

export const POST: APIRoute = async ({ request }) => {
	const isAuthorized = await checkAuth(request);
	if (!isAuthorized) {
		console.log("Unauthorized request");
		return new Response("Unauthorized", {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const payload = (await request.json()) as EmailPayload;

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
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response("Error processing email", {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

export const get: APIRoute = async ({ request }) => {
	if (!(await checkAuth(request))) {
		return new Response("Unauthorized", { status: 401 });
	}

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
