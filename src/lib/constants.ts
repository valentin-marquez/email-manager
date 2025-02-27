export const ROUTES = {
	PROTECTED: ["/", "/settings"],
	UNPROTECTED: ["/login", "/setup"],
	API: [
		"/api/email/create",
		"/api/email/[id]/status",
		"/api/email/[id]/category",
	],
};
