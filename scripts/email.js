// ==========================================================================
// Email Manager Worker - Cloudflare Email Worker for nozz.dev
// ==========================================================================

// ===== CONFIGURATION =====
const CONFIG = {
	// API Settings
	api: {
		endpoint: "https://example.com/api/email/create", // Replace with your API endpoint
		token: "your_api_token_here", // Replace with your actual token
	},

	// Email Filtering Settings
	filtering: {
		mode: "none", // Options: "none", "allowlist", "blocklist"
		allowlist: ["allowed@example.com"], // Emails to allow if using "allowlist" mode
		blocklist: ["spam@example.com", "unwanted@example.com"], // Emails to block if using "blocklist" mode
	},

	// Email Categorization Rules based on recipient address
	addressCategories: {
		"info@example.com": "general",
		"sales@example.com": "sales",
		"support@example.com": "support",
		"jobs@example.com": "careers",
		"newsletter@example.com": "newsletter",
		"admin@example.com": "admin",
		"personal@example.com": "personal",
	},

	// Additional categorization rules for content-based categorization
	contentCategories: [
		{
			name: "finance",
			match: {
				from: ["*@bank.com", "*@paypal.com", "*@financial.com"],
				subject: ["Statement", "Transaction", "Payment", "Invoice"],
			},
		},
		{
			name: "newsletter",
			match: {
				from: ["*@newsletter.com", "*newsletter*", "*@substack.com"],
				subject: ["Newsletter", "Update", "Weekly"],
			},
		},
		{
			name: "social",
			match: {
				from: [
					"*@twitter.com",
					"*@linkedin.com",
					"*@instagram.com",
					"*@facebook.com",
				],
			},
		},
	],

	// Forwarding Settings (optional)
	forwarding: {
		enabled: false, // Set to true to enable email forwarding
		address: "your.email@example.com", // Email address to forward to
	},

	// Debug Settings
	debug: false, // Set to true for development, false for production
};

// ===== HELPER FUNCTIONS =====

/**
 * Converts email content ReadableStream to string
 * @param {ReadableStream} stream - The email content stream
 * @return {Promise<string>} The email content as string
 */
async function streamToString(stream) {
	const reader = stream.getReader();
	let result = "";
	const decoder = new TextDecoder();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		result += decoder.decode(value, { stream: true });
	}

	// Final decode to handle any remaining bytes
	result += decoder.decode();
	return result;
}

/**
 * Checks if a string matches any pattern in a list
 * Supports simple wildcards: * at beginning or end of pattern
 */
function matchesPattern(str, patterns) {
	if (!str || !patterns || !patterns.length) return false;

	return patterns.some((pattern) => {
		// Convert email pattern to lowercase for case-insensitive matching
		const patternLower = pattern.toLowerCase();
		const strLower = str.toLowerCase();

		if (patternLower === "*") return true;
		if (patternLower === strLower) return true;
		if (patternLower.startsWith("*") && patternLower.endsWith("*")) {
			return strLower.includes(patternLower.slice(1, -1));
		}
		if (patternLower.startsWith("*")) {
			return strLower.endsWith(patternLower.slice(1));
		}
		if (patternLower.endsWith("*")) {
			return strLower.startsWith(patternLower.slice(0, -1));
		}
		return false;
	});
}

/**
 * Determines email category based on configuration rules
 */
function categorizeEmail(message) {
	// First check if we have a category for the recipient address
	const recipientAddress = message.to.toLowerCase();
	if (CONFIG.addressCategories[recipientAddress]) {
		return CONFIG.addressCategories[recipientAddress];
	}

	// If no match by address, check content rules
	const from = message.from;
	const subject = message.headers.get("subject") || "";

	for (const category of CONFIG.contentCategories) {
		// Check 'from' field match
		if (category.match.from && matchesPattern(from, category.match.from)) {
			return category.name;
		}

		// Check subject line match
		if (
			category.match.subject &&
			matchesPattern(subject, category.match.subject)
		) {
			return category.name;
		}
	}

	// Default category if no rules match
	return "inbox";
}

/**
 * Checks if an email should be processed based on filter settings
 */
function shouldProcessEmail(message) {
	const from = message.from;

	switch (CONFIG.filtering.mode) {
		case "allowlist":
			return matchesPattern(from, CONFIG.filtering.allowlist);
		case "blocklist":
			return !matchesPattern(from, CONFIG.filtering.blocklist);
		default:
			return true;
	}
}

/**
 * Logs a debug message if debug mode is enabled
 */
function debugLog(...args) {
	if (CONFIG.debug) {
		console.log("[EmailManager]", ...args);
	}
}

// ===== MAIN EMAIL HANDLER =====

export default {
	async email(message, env, ctx) {
		try {
			debugLog("Processing email from:", message.from, "to:", message.to);

			// Check if the email should be processed based on filter settings
			if (!shouldProcessEmail(message)) {
				debugLog("Email rejected by filter rules");
				message.setReject("Email address is not allowed");
				return;
			}

			// Read basic email information
			const subject = message.headers.get("subject") || "No Subject";
			const rawEmail = await streamToString(message.raw.clone());

			// Determine the appropriate category
			const category = categorizeEmail(message);
			debugLog("Categorized as:", category);

			// Parse message ID and date for reference
			const messageId =
				message.headers.get("message-id") ||
				`<generated-${Date.now()}@email-manager.workers>`;
			const date = message.headers.get("date") || new Date().toISOString();

			// Extract additional header information
			const fromHeader = message.headers.get("from") || "";
			const toHeader = message.headers.get("to") || "";
			const replyTo = message.headers.get("reply-to") || "";

			// Create payload for the API - aligned with your DB schema
			const payload = {
				from: message.from,
				to: message.to,
				subject,
				content: rawEmail,
				category,
				status: "unread",
				isArchived: false,
				isStarred: false,
				isSpam: false,
				labels: [],
				raw: {
					messageId,
					date,
					headers: {
						from: fromHeader,
						to: toHeader,
						subject,
						replyTo,
					},
				},
			};

			debugLog("Sending to API:", CONFIG.api.endpoint);

			// Send to Email Manager API
			const response = await fetch(CONFIG.api.endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${CONFIG.api.token}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`API error (${response.status}): ${errorText}`);
			}

			debugLog("Email successfully processed and stored in Email Manager");

			// Forward the email to your Gmail address
			// This ensures you still get all emails in your regular inbox
			if (CONFIG.forwarding.enabled) {
				debugLog("Forwarding email to:", CONFIG.forwarding.address);

				// Add custom header to track this forwarded email
				const headers = new Headers();
				headers.set("X-Email-Manager-Processed", "true");
				headers.set("X-Email-Manager-Category", category);

				await message.forward(CONFIG.forwarding.address, headers);
			}
		} catch (error) {
			console.error("Error processing email:", error);

			// In case of error, forward to ensure no emails are lost
			if (CONFIG.forwarding.enabled) {
				try {
					const headers = new Headers();
					headers.set("X-Email-Manager-Error", "true");
					await message.forward(CONFIG.forwarding.address, headers);
				} catch (fwdError) {
					console.error("Failed to forward email after error:", fwdError);
				}
			}
		}
	},
};
