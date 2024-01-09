import { eq } from "drizzle-orm"

import db from "~/db/db"
import { user } from "~/db/schema"

export async function POST(request: Request) {
	const text = await request.text()

	const indexOfBody = text.indexOf("&Body=") + "&Body=".length

	const phoneNumber = Number(text.match(/\d{11}(?=&To=)/)?.[0])
	const body = decodeURIComponent(
		text.slice(indexOfBody, text.indexOf("&", indexOfBody))
	)
	console.log({ phoneNumber, body })
	if (body === "STOP") {
		await db
			.update(user)
			.set({
				smsNotificationConsent: false,
			})
			.where(eq(user.phoneNumber, phoneNumber))

		return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message><Body>You've unsubscribed from messages from mchsanonymous. Reply with START to resubscribe to notifications.</Body></Message>
</Response>`)
	} else if (body === "START") {
		await db
			.update(user)
			.set({
				smsNotificationConsent: true,
			})
			.where(eq(user.phoneNumber, phoneNumber))

		return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message><Body>You've subscribed to notifications from mchsanonymous. Notifications indicating the number of unread messages you have, if any, are sent at most once per day. Reply with STOP to opt-out. Message frequency depends on activity and Msg&Data rates may apply.</Body></Message>
</Response>`)
	} else if (body === "HELP") {
		return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message><Body>This is where you'll receive notifications from mchsanonymous. Reach out to support@understand.school for further assistance. Reply with STOP to opt-out.</Body></Message>
</Response>`)
	}

	return new Response(null)
}
