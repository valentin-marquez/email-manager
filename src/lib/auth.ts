import jwt from "jsonwebtoken";

interface TokenPayload {
	role: "admin";
	exp: number;
}

const TOKEN_EXPIRATION_TIME = 3600; // 1 hour in seconds
const ADMIN_ROLE = "admin" as const;

/**
 * Verifies if the provided password matches the admin password
 */
export function verifyAdminPassword(password: string): boolean {
	return password === import.meta.env.ADMIN_PASSWORD;
}

/**
 * Generates a JWT token for admin access
 */
export function generateToken(): string {
	const payload: TokenPayload = {
		role: ADMIN_ROLE,
		exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRATION_TIME,
	};

	return jwt.sign(payload, import.meta.env.JWT_SECRET);
}

/**
 * Verifies if a JWT token is valid
 */
export function verifyToken(token: string): boolean {
	try {
		const decoded = jwt.verify(
			token,
			import.meta.env.JWT_SECRET,
		) as TokenPayload;
		return decoded.role === ADMIN_ROLE;
	} catch {
		return false;
	}
}
