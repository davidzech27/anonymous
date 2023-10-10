import cn from "~/util/cn"

interface Props {
	input: string
	setInput: (input: string) => void
	placeholder: string
	"aria-required"?: boolean
	"aria-label"?: string
	className?: string
}

export default function TextInput({
	input,
	setInput,
	placeholder,
	"aria-required": ariaRequired,
	"aria-label": ariaLabel,
	className,
}: Props) {
	return (
		<input
			type="text"
			value={input}
			onChange={(e) => setInput(e.target.value)}
			placeholder={placeholder}
			aria-required={ariaRequired}
			aria-label={ariaLabel}
			className={cn(
				"rounded-lg border border-white bg-white/20 px-3 py-2 text-lg font-medium text-white outline-0 transition placeholder:select-none placeholder:font-light placeholder:text-white/50 focus:bg-white/30 focus:placeholder:text-white/60",
				className
			)}
		/>
	)
}
