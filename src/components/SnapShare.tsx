interface Props {
	url: string
}

export default function SnapShare({ url }: Props) {
	return (
		<div
			onClick={() => {
				const width = window.innerHeight * (2 / 3) + 48
				const height = window.innerHeight * (2 / 3)
				const left = window.innerWidth / 2 - width / 2
				const top = window.innerHeight / 2 - height / 2 + 48

				window.open(
					`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(
						url
					)}`,
					"_blank",
					`width=${width},height=${height},left=${left},top=${top}`
				)
			}}
			id="snapchat-creative-kit-share"
			data-snapchat-creative-kit-share-button="true"
			className="snapchat-creative-kit-share"
		>
			<button className="fvmxvuk f1fhbhq0">
				<div className="f16qnola">
					<img
						src="https://s3.amazonaws.com/bitmoji-sdk-images/logo-snapchat.svg"
						alt="Snapchat logo"
						className="f1ixov3b"
					/>
				</div>

				<span className="f1psvwpi">Snapchat</span>
			</button>
		</div>
	)
}
