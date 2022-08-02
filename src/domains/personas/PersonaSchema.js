export default {
	schema: {
		workspaceId: {
			type: String,
			hashKey: true,
		},
		id: {
			type: String,
			rangeKey: true,
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

		name: {
			type: String,
		},
		description: {
			type: String,
		},
	},
	options: {
		timestamps: true,
		throughput: 'ON_DEMAND',
	},
};
