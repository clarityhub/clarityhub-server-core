import Controller from '~/utilities/Controller';
import WorkspaceRepository from '../workspaces/WorkspaceRepository';

import BillingRepository from './BillingRepository';
import { getPlanSlug, getWorkspaceStatus } from './utilities';
import * as BILLING_STATUS from './BillingStatus';

export default class BillingService extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new BillingRepository(ioc);
		this.workspaceRepository = new WorkspaceRepository(ioc);
	}

	async getWorkspaceStatus({ workspaceId }) {
		const constraints = {
			workspaceId,
			billingWorkspaceId: workspaceId,
		};

		const billingData = await this.repository.findOne(constraints);

		try {
			const subscription = await this.ioc.Stripe.subscriptions.retrieve(
				billingData.subscriptionId
			);

			return getWorkspaceStatus(billingData, subscription);
		} catch (e) {
			return false;
		}
	}

	/**
	 * Called internally when a workspace is created
	 * @param {*} param0
	 */
	async createCustomer({ user, workspaceId }) {
		// const workspaceId = user.currentWorkspaceId;
		this.ioc.Logger.info('billing.createCustomer: trying to create billing');

		const plans = await this.ioc.Stripe.plans.list({
			active: true,
		});

		this.ioc.Logger.info('billing.createCustomer: plan:', plans);

		const defaultPlan = plans.data.find(plan => plan.metadata.default);
		this.ioc.Logger.info('🦕', defaultPlan);

		const customer = await this.ioc.Stripe.customers.create({
			email: user.email,
			// name: workspace.name, // XXX:... get this
			metadata: {
				creatorId: user.id,
				workspaceId,
			},
		});

		this.ioc.Logger.info('billing.createCustomer: customer:', customer);

		const subscription = await this.ioc.Stripe.subscriptions.create({
			customer: customer.id,
			items: [
				{
					plan: defaultPlan.id,
				},
			],
			prorate: true,
			payment_behavior: 'allow_incomplete', // customers will not have a source defined in stripe yet
			trial_from_plan: true,
		});
		this.ioc.Logger.info('billing.createCustomer: subscription:', subscription);

		return this.repository.create({
			workspaceId,
			billingWorkspaceId: workspaceId,
			billingEmail: user.email,
			billingStatus: BILLING_STATUS.TRIAL,
			customerId: customer.id,
			subscriptionId: subscription.id,
			creatorId: user.id,
			planId: defaultPlan.id,
			planName: defaultPlan.nickname,
			planObject: defaultPlan,
		});
	}

	async addSeat({ workspaceId }) {
		const constraints = {
			workspaceId,
			billingWorkspaceId: workspaceId,
		};

		const billing = await this.repository.update({
			$ADD: {
				numberOfSeats: 1,
			},
		}, constraints);

		try {
			// if there is a subscription, update it
			await this.ioc.Stripe.subscriptions.update(
				billing.subscriptionId,
				{
					plan: billing.planId,
					quantity: billing.numberOfSeats,
					proration_behavior: 'always_invoice',
				}
			);
		} catch (e) {
			// Do nothing
		}

		return { status: 'ok' };
	}

	async removeSeat({ workspaceId }) {
		const constraints = {
			workspaceId,
			billingWorkspaceId: workspaceId,
		};

		const billing = await this.repository.update({
			$ADD: {
				numberOfSeats: -1,
			},
		}, constraints);

		try {
			// if there is a subscription, update it
			await this.ioc.Stripe.subscriptions.update(
				billing.subscriptionId,
				{
					plan: billing.planId,
					quantity: billing.numberOfSeats,
					proration_behavior: 'always_invoice',
				}
			);
		} catch (e) {
			// Do nothing
		}

		return { status: 'ok' };
	}

	/**
	 * called internally from a webhook
	 * @param {*} param0
	 */
	async deleteSubscription({ user }) {
		const constraints = {
			workspaceId: user.currentWorkspaceId,
			billingWorkspaceId: user.currentWorkspaceId,
		};

		const billingData = await this.repository.findOne(constraints);
		const workspaces = await this.workspaceRepository.find({
			id: user.currentWorkspaceId,
		});
		const [workspace] = workspaces;

		try {
			await this.ioc.Stripe.subscriptions.update(
				billingData.subscriptionId,
				{
					cancel_at_period_end: true,
				}
			);
		} catch (e) {
			if (e.type !== 'StripeInvalidRequestError') {
				this.ioc.Logger.error(e);
			}
		}

		await this.ioc.SES.sendEmail({
			Destination: {
				ToAddresses: [billingData.billingEmail], // TODO: spread if there are multiple addresses
			},
			Message: {
				Body: {
					Text: {
						Data: `Your Clarity Hub subscription has been cancelled.

Your Clarity Hub subscription on the ${billingData.planName} plan has been closed out. Your ${workspace.name} workspace will be put int
read-only mode at the end of your next billing cycle.

This means you will be able to read any interviews or data you have, but you will not be able to make any changes. Thank you
for using Clarity Hub - if you have any feedback, please send it to 'support@clarityhub.io'.

Thank you,
The Clarity Hub Team`,
					},

				},

				Subject: {
					Data: "We're sorry to see you go - Billing subscription cancelled.",
				},
			},
			Source: 'Clarity Hub Team <support@clarityhub.io>',
		});

		const response = await this.repository.update({
			billingStatus: BILLING_STATUS.CANCELLED,
		}, constraints);

		return {
			data: {
				...response,
				planSlug: getPlanSlug(response),
			},
		};
	}
}
