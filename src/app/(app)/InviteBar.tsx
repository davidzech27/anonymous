import { useState } from "react"

import { Link } from "lucide-react"

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
				className="flex items-center space-x-1.5 text-white hover:opacity-75"
			>
				<span className="text-sm font-bold">
					{!inviteLinkCopied
						? "copy invite link"
						: "invite link copied"}
				</span>

				<Link className="h-4 w-4" />
			</div>

			<SnapShare url={`${env.NEXT_PUBLIC_URL}/?invitedBy=${userId}`} />
		</div>
	)
}
