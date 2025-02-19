import { defineDb, defineTable, column } from "astro:db";

const Email = defineTable({
	columns: {
		id: column.text({ primaryKey: true, default: crypto.randomUUID() }),
		from: column.text(),
		to: column.text(),
		subject: column.text(),
		content: column.text(),
		raw: column.json(),
		category: column.text(),
		receivedAt: column.date({ default: new Date() }),
		status: column.text({ default: "unread" }),
	},
	indexes: [{ on: ["to"] }, { on: ["category"] }, { on: ["status"] }],
});

export default defineDb({
	tables: { Email },
});
