import { defineDb, defineTable, column, NOW } from "astro:db";

const Email = defineTable({
	columns: {
		id: column.text({ primaryKey: true, default: crypto.randomUUID() }),
		from: column.text(),
		to: column.text(),
		subject: column.text(),
		content: column.text(),
		raw: column.json(),
		category: column.text(),
		receivedAt: column.date({ default: NOW }),
		status: column.text({ default: "unread" }),
		updateAt: column.date({ default: NOW }),
		isArchived: column.boolean({ default: false }),
		isStarred: column.boolean({ default: false }),
		isSpam: column.boolean({ default: false }),
		labels: column.json({ default: [] }),
	},
	indexes: [
		{ on: ["to"] },
		{ on: ["category"] },
		{ on: ["status"] },
		{ on: ["isArchived"] },
		{ on: ["isStarred"] },
		{ on: ["isSpam"] },
	],
});

export const AuthConfig = defineTable({
	columns: {
		id: column.text({ primaryKey: true, default: crypto.randomUUID() }),
		key: column.text({ unique: true }),
		value: column.text(),
		updateAt: column.date({ default: NOW }),
	},
});

export default defineDb({
	tables: { Email, AuthConfig },
});
