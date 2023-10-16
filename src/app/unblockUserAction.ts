"use server"
import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { and, eq } from "drizzle-orm"

import db from "~/database/db"
import { block } from "~/database/schema"
import { getAuthOrThrow } from "~/auth/jwt"
import discord from "~/discord/discord"

const unblockUserAction = zact(z.object({ userId: z.number() }))(
	async ({ userId }) => {
		const auth = await getAuthOrThrow({ cookies })

		const sendMessagePromise = discord.send(
			`unblock user ${JSON.stringify(
				{ blocker: auth.id, blocked: userId },
				null,
				4
			)}`
		)

		await db
			.delete(block)
			.where(
				and(
					eq(block.blockerUserId, auth.id),
					eq(block.blockedUserId, userId)
				)
			)

		await sendMessagePromise
	}
)

export default unblockUserAction
