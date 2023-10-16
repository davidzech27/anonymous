import env from "~/env.mjs"

const discord = {
	send: async (content: string) =>
		await fetch(env.DISCORD_WEBHOOK_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				content,
			}),
		}),
}

export default discord
