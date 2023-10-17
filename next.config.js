const os = require("os")

/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverActions: true,
		serverComponentsExternalPackages: ["libsql"],
	},
	webpack: (config) => {
		config.module.rules.push({
			test: /\.node$/,
			use: [
				{
					loader: "nextjs-node-loader",
					options: {
						flags: os.constants.dlopen.RTLD_NOW,
						outputPath: config.output.path,
					},
				},
			],
		})
		return config
	},
}

module.exports = nextConfig
