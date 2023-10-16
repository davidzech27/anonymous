import Pusher from "pusher"

import env from "~/env.mjs"

const realtime = new Pusher({
	appId: env.SOKETI_APP_ID,
	key: env.NEXT_PUBLIC_SOKETI_APP_KEY,
	secret: env.SOKETI_APP_SECRET,
	useTLS: true,
	host: env.NEXT_PUBLIC_SOKETI_HOST,
	port: env.NEXT_PUBLIC_SOKETI_PORT.toString(),
})

export default realtime
