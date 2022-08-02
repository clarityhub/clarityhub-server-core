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
		shortId: {
			type: String,
			index: {
				// Define a global secondary index with the name 'shortIdIndex'
				// and hashKey shortId
				name: 'shortIdIndex',
				global: true,
				rangeKey: 'shortIdRange',
			},
		},
		shortIdRange: {
			type: String,
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

		startedAt: {
			type: String,
		},
		endedAt: {
			type: String,
		},

		publicName: {
			type: String,
			required: true,
		},
		password: {
			type: String,
		},

		mediaIds: {
			type: [String],
		},

		participants: {
			type: [Object],
		},

		status: {
			type: String,
		},

		videoMetaData: {
			type: Object,
			schema: {
				type: String, // "twilio"
				providerId: String, // SID
			},
		},
	},
	options: {
		timestamps: true,
		throughput: 'ON_DEMAND',
	},
};
