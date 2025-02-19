import { defineMiddleware } from "astro:middleware";
import { ROUTES } from "@/lib/constants";
import { verifyToken } from "@/lib/auth";

const REVALIDATION_INTERVAL = 5 * 60 * 1000;

const tokenValidationCache = new Map<
	string,
	{ isValid: boolean; timestamp: number }
>();

export const onRequest = defineMiddleware(async (context, next) => {
	const authToken = context.cookies.get("auth-token")?.value;

	context.locals.auth = {
		token: authToken,
		isAuthenticated: false,
	};

	if (ROUTES.UNPROTECTED.includes(context.url.pathname)) {
		return next();
	}

	if (authToken) {
		const cached = tokenValidationCache.get(authToken);
		const now = Date.now();

		if (!cached || now - cached.timestamp > REVALIDATION_INTERVAL) {
			try {
				const isValid = verifyToken(authToken);
				tokenValidationCache.set(authToken, { isValid, timestamp: now });
				context.locals.auth.isAuthenticated = isValid;
			} catch {
				tokenValidationCache.set(authToken, { isValid: false, timestamp: now });
				context.locals.auth.isAuthenticated = false;
			}
		} else {
			context.locals.auth.isAuthenticated = cached.isValid;
		}
	}

	const isProtectedRoute = ROUTES.PROTECTED.some((route) =>
		context.url.pathname.startsWith(route),
	);

	if (isProtectedRoute && !context.locals.auth.isAuthenticated) {
		return Response.redirect(new URL("/", context.url));
	}

	return next();
});
