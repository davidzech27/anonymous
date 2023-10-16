export async function POST(request: Request) {
	const body = decodeURIComponent(
		(await request.text()).match(/(?<=&Body=).+(?=&)/g)?.[0] ?? ""
	)

	console.log({ body })

	if (body === "STOP") {
		return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message><Body>You will no longer receive messages from us.</Body></Message>
</Response>
`)
	} else if (body === "START") {
		return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message><Body>This is where you'll receive notifications from us. Reply with STOP to opt-out.</Body></Message>
</Response>
`)
	} else if (body === "HELP") {
		return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message><Body>This is where you'll receive notifications from us. Reply with STOP to opt-out.</Body></Message>
</Response>
`)
	}

	return new Response(null)
}
