import { defineMiddleware } from "astro:middleware";
import { ROUTES } from "@/lib/constants";
import { verifyApiToken, verifyToken } from "@/lib/auth";
import { AuthSetup } from "@/lib/auth/setup";
import { getActionContext } from "astro:actions";

const REVALIDATION_INTERVAL = 5 * 60 * 1000;

const tokenValidationCache = new Map<
	string,
	{ isValid: boolean; timestamp: number }
>();

export const onRequest = defineMiddleware(async (context, next) => {
	const { action } = getActionContext(context);

	if (action?.calledFrom === "form") {
		const result = await action.handler();

		// Si la acción fue exitosa y tiene una redirección
		if (!result.error && result.data?.redirect) {
			return context.redirect(result.data.redirect);
		}
		return next();
	}

	const auth = new AuthSetup();
	const currentPath = context.url.pathname;

	// Check if it's an API route
	const isApiRoute = ROUTES.API.some((route) => currentPath.startsWith(route));

	if (isApiRoute) {
		const authHeader = context.request.headers.get("Authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return new Response("Unauthorized", { status: 401 });
		}

		const token = authHeader.slice(7);
		const isApiTokenValid = await verifyApiToken(token);
		const isJwtValid = await verifyToken(token);

		if (!isApiTokenValid && !isJwtValid) {
			return new Response("Unauthorized", { status: 401 });
		}

		return next();
	}

	// Rest of the middleware for web routes
	const authToken = context.cookies.get("auth-token")?.value;
	context.locals.auth = {
		token: authToken,
		isAuthenticated: false,
	};

	// Check if system is initialized
	const isInitialized = await auth.isInitialized();

	// If not initialized and not on setup page, redirect to setup
	if (!isInitialized && currentPath !== "/setup") {
		return Response.redirect(new URL("/setup", context.url));
	}

	// If initialized and on setup page, redirect to login
	if (isInitialized && currentPath === "/setup") {
		return Response.redirect(new URL("/login", context.url));
	}

	// If route is unprotected (login or setup), proceed
	if (ROUTES.UNPROTECTED.includes(currentPath)) {
		return next();
	}

	// Validate token if exists
	if (authToken) {
		const cached = tokenValidationCache.get(authToken);
		const now = Date.now();

		if (!cached || now - cached.timestamp > REVALIDATION_INTERVAL) {
			try {
				const isValid = await verifyToken(authToken);
				tokenValidationCache.set(authToken, { isValid, timestamp: now });
				context.locals.auth.isAuthenticated = isValid;
			} catch (error) {
				tokenValidationCache.set(authToken, { isValid: false, timestamp: now });
				context.locals.auth.isAuthenticated = false;
			}
		} else {
			context.locals.auth.isAuthenticated = cached.isValid;
		}
	}

	// Check if route is protected and user is not authenticated
	const isProtectedRoute = ROUTES.PROTECTED.some((route) =>
		currentPath.startsWith(route),
	);

	if (isProtectedRoute && !context.locals.auth.isAuthenticated) {
		return Response.redirect(new URL("/login", context.url));
	}

	return next();
});
