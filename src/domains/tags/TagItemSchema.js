export default {
	schema: {
		workspaceId: {
			type: String,
			hashKey: true,
		},

		/**
         * NOTE looks like `interviews:${interview.id}:${tagPath}`
         */
		itemTagPath: {
			type: String,
			rangeKey: true,
		},

		/**
         * NOTE looks like `${tagPath}:interviews:${interview.id}`
         */
		tagPathItem: {
			type: String,
			index: true, // XXX this probably isn't right
		},

		createdAt: {
			type: String,
		},
		updatedAt: {
			type: String,
		},

		itemId: {
			type: String,
		},

		itemType: {
			type: String,
		},

		itemPreview: {
			type: String,
		},

		tagPath: {
			type: String,
		},

		/**
		 * Used to document how to get to this tagItems item.
		 *
		 * For example, an editor may have a tagItem, but to actually
		 * see it, you would need to go to the interview
		 *
		 * Looks like `${itemType}:${itemId}`.
		 */
		referencePath: {
			type: String,
		},
	},
	options: {
		timestamps: true,
		throughput: 'ON_DEMAND',
	},
};
