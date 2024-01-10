import z from "zod"
import { createEnv } from "@t3-oss/env-nextjs"

const env = createEnv({
	server: {
		URL: z.string().url(),
		NODE_ENV: z.enum(["development", "test", "production"]),
		DATABASE_URL: z.string().url(),
		DATABASE_AUTH_TOKEN: z.string(),
		KV_URL: z.string(),
		KV_REST_API_URL: z.string(),
		KV_REST_API_TOKEN: z.string(),
		KV_REST_API_READ_ONLY_TOKEN: z.string(),
		JWT_SECRET: z.string(),
		OPENAI_SECRET_KEY: z.string(),
		QSTASH_TOKEN: z.string(),
		QSTASH_CURRENT_SIGNING_KEY: z.string(),
		QSTASH_NEXT_SIGNING_KEY: z.string(),
		SOKETI_APP_ID: z.string(),
		SOKETI_APP_SECRET: z.string(),
		SIGNALWIRE_PROJECT_ID: z.string(),
		SIGNALWIRE_SPACE_URL: z.string(),
		SIGNALWIRE_PHONE_NUMBER: z.string(),
		SIGNALWIRE_API_TOKEN: z.string(),
		SNAP_APP_ID: z.string(),
	},
	client: {
		NEXT_PUBLIC_URL: z.string().url(),
		NEXT_PUBLIC_SOKETI_HOST: z.string(),
		NEXT_PUBLIC_SOKETI_PORT: z.coerce.number(),
		NEXT_PUBLIC_SOKETI_APP_KEY: z.string(),
		NEXT_PUBLIC_POSTHOG_KEY: z.string(),
		NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),
	},
	runtimeEnv: {
		URL: process.env.URL,
		NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
		NODE_ENV: process.env.NODE_ENV,
		DATABASE_URL: process.env.DATABASE_URL,
		DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
		KV_URL: process.env.KV_URL,
		KV_REST_API_URL: process.env.KV_REST_API_URL,
		KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
		KV_REST_API_READ_ONLY_TOKEN: process.env.KV_REST_API_READ_ONLY_TOKEN,
		JWT_SECRET: process.env.JWT_SECRET,
		OPENAI_SECRET_KEY: process.env.OPENAI_SECRET_KEY,
		QSTASH_TOKEN: process.env.QSTASH_TOKEN,
		QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
		QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
		NEXT_PUBLIC_SOKETI_HOST: process.env.NEXT_PUBLIC_SOKETI_HOST,
		NEXT_PUBLIC_SOKETI_PORT: process.env.NEXT_PUBLIC_SOKETI_PORT,
		SOKETI_APP_ID: process.env.SOKETI_APP_ID,
		NEXT_PUBLIC_SOKETI_APP_KEY: process.env.NEXT_PUBLIC_SOKETI_APP_KEY,
		SOKETI_APP_SECRET: process.env.SOKETI_APP_SECRET,
		SIGNALWIRE_PROJECT_ID: process.env.SIGNALWIRE_PROJECT_ID,
		SIGNALWIRE_SPACE_URL: process.env.SIGNALWIRE_SPACE_URL,
		SIGNALWIRE_PHONE_NUMBER: process.env.SIGNALWIRE_PHONE_NUMBER,
		SIGNALWIRE_API_TOKEN: process.env.SIGNALWIRE_API_TOKEN,
		NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
		NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		SNAP_APP_ID: process.env.SNAP_APP_ID,
	},
})

export default env
