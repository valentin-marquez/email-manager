import jwt from "jsonwebtoken";
import { db, AuthConfig, eq } from "astro:db";

interface TokenPayload {
	role: "admin";
	exp: number;
}

const TOKEN_EXPIRATION_TIME = 3600; // 1 hour in seconds
const ADMIN_ROLE = "admin" as const;

// Cache for auth config values
const configCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getConfigValue(key: string): Promise<string> {
	const now = Date.now();
	const cached = configCache.get(key);

	if (cached && now - cached.timestamp < CACHE_TTL) {
		return cached.value;
	}

	const result = await db
		.select({ value: AuthConfig.value })
		.from(AuthConfig)
		.where(eq(AuthConfig.key, key))
		.limit(1);

	if (!result[0]?.value) {
		throw new Error(`Config value ${key} not found`);
	}

	configCache.set(key, { value: result[0].value, timestamp: now });

	return result[0].value;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
	const storedPassword = await getConfigValue("ADMIN_PASSWORD");
	return password === storedPassword;
}

export async function generateToken(): Promise<string> {
	const secret = await getConfigValue("JWT_SECRET");
	const payload: TokenPayload = {
		role: ADMIN_ROLE,
		exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRATION_TIME,
	};

	return jwt.sign(payload, secret, {
		algorithm: "HS256",
	});
}
export async function verifyToken(token: string): Promise<boolean> {
	try {
		const secret = await getConfigValue("JWT_SECRET");
		const decoded = jwt.verify(token, secret) as TokenPayload;

		return decoded.role === ADMIN_ROLE;
	} catch {
		return false;
	}
}

export async function verifyApiToken(token: string): Promise<boolean> {
	try {
		const apiToken = await getConfigValue("API_TOKEN");
		return token === apiToken;
	} catch {
		return false;
	}
}
