import sms from "~/sms/sms"

export const dynamic = "force-dynamic"

export default async function Instagram() {
	await sms.send({ to: 17078069894, content: "HIIIIIIIIIII" })

	return <>asdf</>
}
