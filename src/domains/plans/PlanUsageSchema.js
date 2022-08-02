export default {
	schema: {
		// NOTE Look ups would be like: `${workspace.id}/transcription`
		workspaceIdUsage: {
			type: String,
			hashKey: true,
		},
		monthYearBucket: {
			type: String,
			rangeKey: true,
		},

		createdAt: {
			type: String,
		},
		updatedAt: {
			type: String,
		},

		usage: {
			type: Number,
		},
	},
	options: {
		timestamps: true,
		throughput: 'ON_DEMAND',
	},
};
