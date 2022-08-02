import { ACTIVE, CANCELLED, TRIAL } from './BillingStatus';

export default {
	schema: {
		workspaceId: {
			type: String,
			hashKey: true,
		},
		billingWorkspaceId: {
			type: String,
			rangeKey: true,
		},
		id: {
			type: String,
		},
		creatorId: {
			type: String,
		},
		customerId: {
			type: String,
		},
		subscriptionId: {
			type: String,
		},
		planId: {
			type: String,
		},
		planName: {
			type: String,
		},
		planObject: {
			type: Object,
		},
		billingEmail: {
			type: String, // TODO: support multiple cc addresses
		},
		ccCardType: {
			type: String,
		},
		ccLastFour: {
			type: String,
		},
		ccExpiration: {
			type: String,
		},
		billingStatus: {
			type: String,
			enum: [ACTIVE, CANCELLED, TRIAL],
			default: TRIAL,
		},
		numberOfSeats: {
			type: Number,
			default: 1,
		},

		// address information - we'll get it from Stripe
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
