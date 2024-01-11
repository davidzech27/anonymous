"use server"

import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"

import db from "~/db/db"
import { block } from "~/db/schema"
import { getAuthOrThrow } from "~/auth/jwt"

const blockUserAction = zact(z.object({ userId: z.number() }))(
	async ({ userId }) => {
		const auth = await getAuthOrThrow({ cookies })

		await db.insert(block).values({
			blockerUserId: auth.id,
			blockedUserId: userId,
		})
	}
)

export default blockUserAction
