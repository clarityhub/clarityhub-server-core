import Controller from '~/utilities/Controller';

import BillingRepository from './BillingRepository';
import * as BILLING_STATUS from './BillingStatus';
import WorkspaceRepository from '../workspaces/WorkspaceRepository';

export default class StripeWebhookController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.workspaceRepository = new WorkspaceRepository(ioc);
		this.repository = new BillingRepository(ioc);
	}

	async handle({ user }) {
		const { rawData, stripeSignature } = user;
		let event;

		try {
			event = this.ioc.Stripe.webhooks.constructEvent(
				rawData,
				stripeSignature,
				process.env.STRIPE_SIGNING_SECRET
			);
			switch (event.type) {
			case 'customer.subscription.trial_will_end':
				await this.handleTrialWillEnd({ event });
				break;
			case 'invoice.payment_failed':
				await this.handleTrialEnded({ event });
				break;
			default:
				// do nothing
			}

			return { received: true };
		} catch (e) {
			this.ioc.Logger.error('Error in Stripe hook');
			this.ioc.Logger.error(e);

			return { error: true, message: 'Invalid request' };
		}
	}

	async handleTrialWillEnd({ event }) {
		const { object } = event.data;

		if (!object.metadata) {
			this.ioc.Logger.error('Stripe object is missing metadata');
			return;
		}

		const { workspaceId } = object.metadata;

		if (!workspaceId) {
			this.ioc.Logger.error('Stripe object is missing workspaceId');
			return;
		}

		try {
			const workspaces = await this.workspaceRepository.find({
				workspaceId,
			});

			if (!workspaces || workspaces.length === 0) {
				return;
			}

			const workspace = workspaces[0];

			const billing = await this.repository.findOne({
				workspaceId,
				billingWorkspaceId: workspaceId,
			});

			const { billingEmail } = billing;
			const { name } = workspace;

			if (billing.status === BILLING_STATUS.TRIAL) {
				await this.ioc.SES.sendEmail({
					Destination: {
						ToAddresses: [billingEmail], // TODO: spread if there are multiple addresses
					},
					Message: {
						Body: {
							Text: {
								Data: `Your Clarity Hub trial has ended.

Your Clarity hub trial for ${name} has ended. Log into your account
and update your subscription and billing information to continue
using your workspace.

You can login at: https://dashboard.clarityhub.io

Thank you,
The Clarity Hub Team`,
							},

						},

						Subject: {
							Data: 'Your Clarity Hub trial has ended',
						},
					},
					Source: 'Clarity Hub Team <support@clarityhub.io>',
				});
			} else if (BILLING_STATUS.ACTIVE) {
				await this.ioc.SES.sendEmail({
					Destination: {
						ToAddresses: [billingEmail], // TODO: spread if there are multiple addresses
					},
					Message: {
						Body: {
							Text: {
								Data: `Your Clarity Hub invoice could not be processed.

Your Clarity hub subscription for ${name} could not be processed. Log into your account
and update your billing information to continue
using your workspace.

You can login at: https://dashboard.clarityhub.io

Thank you,
The Clarity Hub Team`,
							},

						},

						Subject: {
							Data: 'Your Clarity Hub invoice could not be processed',
						},
					},
					Source: 'Clarity Hub Team <support@clarityhub.io>',
				});
			}
		} catch (e) {
			this.ioc.Logger.error('Error in Stripe hook');
			this.ioc.Logger.error(e);
		}
	}

	async handleTrialEnded({ event }) {
		const { object } = event.data;

		if (!object.metadata) {
			this.ioc.Logger.error('Stripe object is missing metadata');
			return;
		}

		const { subscription } = object;
		const { workspaceId } = object.metadata;

		if (!workspaceId) {
			this.ioc.Logger.error('Stripe object is missing workspaceId');
			return;
		}

		try {
			const stripeSubscription = await this.ioc.Stripe.subscriptions.retrieve(subscription);

			if (stripeSubscription.status === 'trialing') {
				const workspaces = await this.workspaceRepository.find({
					workspaceId,
				});

				if (!workspaces || workspaces.length === 0) {
					return;
				}

				const workspace = workspaces[0];

				const billing = await this.repository.findOne({
					workspaceId,
					billingWorkspaceId: workspaceId,
				});

				const { billingEmail } = billing;
				const { name } = workspace;

				await this.ioc.SES.sendEmail({
					Destination: {
						ToAddresses: [billingEmail], // TODO: spread if there are multiple addresses
					},
					Message: {
						Body: {
							Text: {
								Data: `Your Clarity Hub trial is about to end.

Your Clarity hub trial for ${name} will end soon. Log into your account
and update your subscription and billing information to continue
using your workspace.

You can login at: https://dashboard.clarityhub.io

Thank you,
The Clarity Hub Team`,
							},

						},

						Subject: {
							Data: 'Your Clarity Hub trial is about to end',
						},
					},
					Source: 'Clarity Hub Team <support@clarityhub.io>',
				});
			}
		} catch (e) {
			this.ioc.Logger.error('Error in Stripe hook');
			this.ioc.Logger.error(e);
		}
	}
}
