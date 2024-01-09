export async function POST(request: Request) {
	const text = await request.text()
	console.log({ text })
	const indexOfBody = text.indexOf("&Body=") + "&Body=".length

	const body = decodeURIComponent(
		text.slice(indexOfBody, text.indexOf("&", indexOfBody))
	)

	if (body === "STOP") {
		return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message><Body>You've unsubscribed from messages from mchsanonymous. Reply with START to resubscribe to notifications.</Body></Message>
</Response>`)
	} else if (body === "START") {
		return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message><Body>You've subscribed to notifications from mchsanonymous. Reply with STOP to opt-out. Message frequency depends on activity and Msg&Data rates may apply.</Body></Message>
</Response>`)
	} else if (body === "HELP") {
		return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message><Body>This is where you'll receive notifications from mchsanonymous. Reach out to support@understand.school for further assistance. Reply with STOP to opt-out.</Body></Message>
</Response>`)
	}

	return new Response(null)
}
