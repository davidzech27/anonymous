"use server"
import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"

import db from "~/database/db"
import { user } from "~/database/schema"
import { setAuth } from "~/auth/jwt"
import realtime from "~/realtime/realtime"

const createUserAction = zact(
	z.object({ firstName: z.string().min(1), lastName: z.string().min(1) })
)(async ({ firstName, lastName }) => {
	const [createdRow] = await db
		.insert(user)
		.values({
			firstName: firstName.trim().slice(0, 50),
			lastName: lastName.trim().slice(0, 50),
			createdAt: new Date(),
		})
		.returning({ id: user.id })
		.all()

	if (createdRow === undefined) throw new Error("Failed to create user")

	await setAuth({ cookies, auth: { id: createdRow.id, firstName, lastName } })

	await realtime.trigger("user", "joined", {
		id: createdRow.id,
		firstName,
		lastName,
	})
})

export default createUserAction
