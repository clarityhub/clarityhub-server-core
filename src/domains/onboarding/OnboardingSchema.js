export default {
	schema: {
		userId: {
			type: String,
			hashKey: true,
		},
		id: {
			type: String,
			rangeKey: true,
		},

		workspaceId: {
			type: String,
		},

		state: {
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
