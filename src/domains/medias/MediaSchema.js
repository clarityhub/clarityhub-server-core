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

		path: {
			type: String,
		},
		filename: {
			type: String,
		},
		fileType: {
			type: String,
		},
		status: {
			type: String,
		},
		action: {
			type: String,
		},

		transcriptionJobName: {
			type: String,
		},
		transcriptionStatus: {
			type: String,
		},
		transcriptionError: {
			type: String,
		},
		transcript: {
			type: String,
		},
	},
	options: {
		timestamps: true,
		throughput: 'ON_DEMAND',
	},
};
