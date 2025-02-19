addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
	// Only allow POST requests
	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	try {
		// Get the email data from the request
		const emailData = await request.json();

		// Forward the request to your API endpoint
		const response = await fetch("https://your-domain.com/api/email", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${API_TOKEN}`, // Replace API_TOKEN with your actual token
			},
			body: JSON.stringify({
				from: emailData.from,
				to: emailData.to,
				subject: emailData.subject,
				content: emailData.content,
				raw: emailData,
				category: emailData.category || "incoming",
			}),
		});

		// Return the response from your API
		const result = await response.json();
		return new Response(JSON.stringify(result), {
			status: response.status,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: "Failed to process email" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
