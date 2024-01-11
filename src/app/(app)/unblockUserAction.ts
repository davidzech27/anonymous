"use server"

import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { and, eq } from "drizzle-orm"

import db from "~/db/db"
import { block } from "~/db/schema"
import { getAuthOrThrow } from "~/auth/jwt"

const unblockUserAction = zact(z.object({ userId: z.number() }))(
	async ({ userId }) => {
		const auth = await getAuthOrThrow({ cookies })

		await db
			.delete(block)
			.where(
				and(
					eq(block.blockerUserId, auth.id),
					eq(block.blockedUserId, userId)
				)
			)
	}
)

export default unblockUserAction
