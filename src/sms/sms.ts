import env from "~/env.js"

const sms = {
	send: async ({ to, content }: { to: number; content: string }) => {
		await (
			await fetch(
				`https://${env.SIGNALWIRE_SPACE_URL}/api/laml/2010-04-01/Accounts/${env.SIGNALWIRE_PROJECT_ID}/Messages.json`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						Authorization:
							"Basic " +
							Buffer.from(
								`${env.SIGNALWIRE_PROJECT_ID}:${env.SIGNALWIRE_API_TOKEN}`
							).toString("base64"),
					},
					body: new URLSearchParams({
						From: env.SIGNALWIRE_PHONE_NUMBER,
						To: `+${to}`,
						Body: content,
					}),
				}
			)
		).json()
	},
}

export default sms
