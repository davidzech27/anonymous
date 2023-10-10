import cn from "~/util/cn"

interface Props {
	children: React.ReactNode
	onClick: () => void
	disabled?: boolean
	"aria-label"?: string
	className?: string
}

export default function Button({
	children,
	onClick,
	disabled,
	"aria-label": ariaLabel,
	className,
}: Props) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			aria-label={ariaLabel}
			className={cn(
				"select-none rounded-lg border border-white bg-white/20 px-4 text-lg font-bold text-white transition hover:bg-white/30 focus-visible:bg-white/30 disabled:pointer-events-none disabled:opacity-50",
				className
			)}
		>
			{children}
		</button>
	)
}
