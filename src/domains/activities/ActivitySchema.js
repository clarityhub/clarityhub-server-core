export default {
	schema: {
		workspaceId: {
			type: String,
			hashKey: true,
		},

		activityId: {
			type: String,
			rangeKey: true,
		},

		createdAt: {
			type: String,
		},

		itemId: {
			type: String,
		},

		itemType: {
			type: String,
		},

		/**
		 * Feel free to put JSON in here
		 */
		itemPreview: {
			type: Object,
		},

		action: {
			type: String,
		},
	},
	options: {
		timestamps: true,
		throughput: 'ON_DEMAND',
	},
};
