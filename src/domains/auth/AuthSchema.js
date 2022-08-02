import { ACTIVE, BANNED } from './UserStatus';

export default {
	schema: {
		email: {
			type: String,
			hashKey: true,
		},

		userId: {
			type: String,
			rangeKey: true,
		},

		knownProviders: {
			type: Array,
		},

		metadata: {
			type: Object,
		},

		status: {
			type: String,
			enum: [ACTIVE, BANNED],
			default: ACTIVE,
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
