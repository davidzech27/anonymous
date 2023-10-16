import type { Config } from "drizzle-kit"
import "dotenv/config"
import { z } from "zod"
import { join } from "path"

export default {
	schema: join(__dirname, "schema.ts"),
	dbCredentials: {
		url: z.string().url().parse(process.env.DATABASE_URL),
		authToken: z.string().parse(process.env.DATABASE_AUTH_TOKEN),
	},
	driver: "turso",
} satisfies Config
