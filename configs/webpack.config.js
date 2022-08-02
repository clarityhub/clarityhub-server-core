const path = require('path');
const slsw = require('serverless-webpack');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const fs = require('fs');

const migrationsPath = path.join(__dirname, '..', 'migrations');

// eslint-disable-next-line
const migrationFiles = fs.readdirSync(migrationsPath);
const migrationMap = {};
migrationFiles.forEach((file) => {
	if (file.endsWith('.js')) {
		migrationMap[path.join('migrations', path.basename(file, '.js'))] = path.join(migrationsPath, file);
	}
});

module.exports = {
	entry: {
		...slsw.lib.entries,
		...migrationMap,
	},
	target: 'node',

	// Generate sourcemaps for proper error messages
	devtool: 'source-map',

	// Since 'aws-sdk' is not compatible with webpack,
	// we exclude all node dependencies
	externals: [nodeExternals()],

	mode: slsw.lib.webpack.isLocal ? 'development' : 'production',

	optimization: {
		// We do not want to minimize our code.
		minimize: false,
	},

	performance: {
		// Turn off size warnings for entry points
		hints: false,
	},

	resolve: {
		alias: {
			'~': path.resolve(__dirname, '..', 'src'),
		},
	},

	// Run babel on all .js files and skip those in node_modules
	module: {
		rules: [
			{
				test: /\.js$/,
				loader: 'babel-loader',
				options: {
					presets: ['@babel/preset-env'],
				},
				exclude: /node_modules/,
			},
		],
	},

	plugins: [
		// new CopyWebpackPlugin([
		// 	'docs/**',
		// 	'schemas/**',
		// ]),
	],
};
