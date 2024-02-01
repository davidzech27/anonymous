import { useState } from "react"

import { Link, Mail } from "lucide-react"

import env from "~/env.mjs"
import SnapShare from "~/components/SnapShare"

interface Props {
	userId: number
}

export default function InviteBar({ userId }: Props) {
	const [inviteLinkCopied, setInviteLinkCopied] = useState(false)

	return (
		<div className="flex items-center justify-between rounded-lg border border-white bg-white/20 p-3">
			<div
				onClick={async () => {
					setInviteLinkCopied(true)

					await navigator.clipboard.writeText(
						`${env.NEXT_PUBLIC_URL}/?invitedBy=${userId}`
					)
				}}
				role="button"
				className="flex items-center space-x-1 text-white hover:opacity-75"
			>
				<span className="text-sm font-bold mobile:text-[10px]">
					{!inviteLinkCopied
						? "copy invite link"
						: "invite link copied"}
				</span>

				<Link className="h-4 w-4" />
			</div>

			<SnapShare url={`${env.NEXT_PUBLIC_URL}/?invitedBy=${userId}`} />

			<a
				href={`mailto:?subject=mchsanonymous&body=${encodeURIComponent(
					`I'm inviting you to mchsanonymous. Join here: ${env.NEXT_PUBLIC_URL}/?invitedBy=${userId}`
				)}`}
				className="flex items-center space-x-1.5 text-white hover:opacity-75"
			>
				<span className="text-sm font-bold mobile:text-[10px]">
					email invite
				</span>

				<Mail className="h-4 w-4" />
			</a>
		</div>
	)
}
