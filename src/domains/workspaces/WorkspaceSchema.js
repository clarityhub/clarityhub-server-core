export default {
	schema: {
		id: {
			type: String,
			hashKey: true,
		},

		creatorId: {
			type: String,
			rangeKey: true,
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
