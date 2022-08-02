import { MEMBER, GUEST, ADMIN } from './Roles';
import { INVITED, ACCEPTED } from './InviteStatus';

export default {
	schema: {
		userId: {
			type: String,
			hashKey: true,
		},
		workspaceId: {
			type: String,
			rangeKey: true,
		},

		createdAt: {
			type: String,
		},
		updatedAt: {
			type: String,
		},
		invitedAt: {
			type: String,
		},
		email: {
			type: String,
		},

		role: {
			type: String,
			default: MEMBER,
			enum: [GUEST, MEMBER, ADMIN],
		},
		status: {
			type: String,
			default: ACCEPTED,
			enum: [INVITED, ACCEPTED],
		},
	},
	options: {
		timestamps: true,
		throughput: 'ON_DEMAND',
	},
};
