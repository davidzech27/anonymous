"use server"

import { zact } from "zact/server"
import z from "zod"
import { cookies } from "next/headers"

import { getAuthOrThrow } from "~/auth/jwt"
import realtime from "~/realtime/realtime"

const changeTypingStatusAction = zact(
	z.object({
		typingStatus: z.boolean(),
	})
)(async ({ typingStatus }) => {
	const auth = await getAuthOrThrow({ cookies })

	await realtime.trigger(`typing-${auth.id}`, "typing", typingStatus)
})

export default changeTypingStatusAction
