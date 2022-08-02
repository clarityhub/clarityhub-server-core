export default {
	schema: {
		workspaceId: {
			type: String,
			hashKey: true,
		},
		integrationKey: {
			type: String,
			rangeKey: true,
		},

		appName: {
			type: String,
		},
		action: {
			type: String,
		},
		status: {
			type: String,
		},

		name: {
			type: String,
		},
		description: {
			type: String,
		},
		// user defined config
		config: {
			type: Object,
		},
		tokens: {
			type: Object,
		},

		creatorId: {
			type: String,
		},

		createdAt: {
			type: String,
		},
		updatedAt: {
			type: String,
		},
	},
	options: {
		timestamps: true,
		throughput: 'ON_DEMAND',
	},
};
