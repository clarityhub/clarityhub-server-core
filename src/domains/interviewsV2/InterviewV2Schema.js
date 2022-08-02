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

		title: {
			type: String,
		},
		notes: {
			type: String,
		},

		action: {
			type: Object,
		},

		notebookIds: {
			type: [String],
		},
	},
	options: {
		timestamps: true,
		throughput: 'ON_DEMAND',
		// saveUnknown: [
		// 	'action.**',
		// ],
	},
};
