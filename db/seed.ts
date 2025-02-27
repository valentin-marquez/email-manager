import { db, Email } from "astro:db";

// https://astro.build/db/seed
export default async function seed() {
	await db.insert(Email).values([
		{
			from: "system@email-manager.com",
			to: "user@example.com",
			subject: "Welcome to Email Manager",
			content: "Thank you for using Email Manager! This is your first message.",
			raw: { type: "welcome" },
			category: "system",
			status: "unread",
		},
	]);
}
