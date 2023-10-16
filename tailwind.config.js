/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.tsx"],
	theme: {
		extend: {
			colors: {
				primary: "#4A7460",
				secondary: "#EBCC7A",
			},
			screens: {
				mobile: { max: "1024px" },
			},
		},
	},
	plugins: [],
}
