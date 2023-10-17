"use server"
import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"

import db from "~/database/db"
import { user } from "~/database/schema"
import { setAuth } from "~/auth/jwt"
import realtime from "~/realtime/realtime"
import triggerPotentialSpecialMessage from "./triggerPotentialSpecialMessage/triggerPotentialSpecialMessage"

const createUserAction = zact(
	z.object({
		firstName: z.string().min(1),
		lastName: z.string().min(1),
		invitedByUserId: z.number().optional(),
	})
)(async ({ firstName, lastName, invitedByUserId }) => {
	const createdAt = new Date()

	const [createdUserRow] = await db
		.insert(user)
		.values({
			firstName: firstName.trim().slice(0, 50),
			lastName: lastName.trim().slice(0, 50),
			createdAt,
		})
		.returning({ id: user.id })
		.all()

	if (createdUserRow === undefined) throw new Error("Failed to create user")

	const triggerPotentialSpecialMessagePromise =
		triggerPotentialSpecialMessage({
			reason: "userJoined",
			userId: createdUserRow.id,
			invitedByUserId,
		})

	await setAuth({
		cookies,
		auth: { id: createdUserRow.id, firstName, lastName },
	})

	await realtime.trigger("user", "joined", {
		id: createdUserRow.id,
		firstName,
		lastName,
	})

	await triggerPotentialSpecialMessagePromise
})

export default createUserAction
