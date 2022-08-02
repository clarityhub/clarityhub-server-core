export default {
	schema: {
		workspaceId: {
			type: String,
			hashKey: true,
		},
		/*
         * NOTE Looks like: `${parentTagId}:${tagId}`
         * This makes it easy to find all tags belonging to a parent.
         *
         * This also means that a tag's identifier is actually
         * it's full path, not just it's own tagId. You
         * CANNOT look up a tag by just knowing it's tagId.
         *
         * You can only look up a tag by knowing its full path.
         */
		tagPath: {
			type: String,
			rangeKey: true,
		},

		createdAt: {
			type: String,
		},
		updatedAt: {
			type: String,
		},

		/*
         * NOTE It is expensive to try to do a full table scan on this
         * id. It is only here to make it clear what this tag's identifier
         * is within the tagPath.
         */
		tagId: {
			type: String,
		},

		tag: {
			type: String,
		},

		parentTagId: {
			type: String,
		},

		color: {
			type: String,
		},
	},
	options: {
		timestamps: true,
		throughput: 'ON_DEMAND',
	},
};
