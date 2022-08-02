import Controller from '~/utilities/Controller';

import BillingRepository from './BillingRepository';
import merge from '../../utilities/merge';
import * as BILLING_STATUS from './BillingStatus';
import { getPlanSlug } from './utilities';
import BillingService from './BillingService';

export default class BillingController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new BillingRepository(ioc);
	}

	async getBilling({ user }) {
		const constraints = {
			workspaceId: user.currentWorkspaceId,
			billingWorkspaceId: user.currentWorkspaceId,
		};
		const billingData = await this.repository.findOne(constraints);

		const upcomingInvoicePromise = this.ioc.Stripe.invoices.retrieveUpcoming(
			{ customer: billingData.customerId }
		).catch(() => {
			return {
				error: 'No upcoming invoice',
			};
		});

		const subscriptionPromise = this.ioc.Stripe.subscriptions.retrieve(billingData.subscriptionId)
			.catch(() => {
				return {};
			});

		const [plans, upcomingInvoice, customer, subscription] = await Promise.all([
			this.ioc.Stripe.plans.list({
				active: true,
			}),
			upcomingInvoicePromise,
			this.ioc.Stripe.customers.retrieve(
				billingData.customerId
			),
			subscriptionPromise,
		]);

		const { address } = customer;

		this.ioc.Logger.info('🗺 billing.getPlanSlug:', getPlanSlug(subscription));

		return {
			data: {
				...billingData,
				...address,
				// billingEmail: email,
				upcomingInvoice,
				trialDate: subscription.trial_end,
				planSlug: getPlanSlug(subscription),
			},
			plans,
		};
	}

	/**
	 *
	 * @param {*} param0
	 */
	async getBillingInvoices({ user }) {
		const constraints = {
			workspaceId: user.currentWorkspaceId,
			billingWorkspaceId: user.currentWorkspaceId,
		};
		const billingData = await this.repository.findOne(constraints);

		const upcomingInvoicePromise = this.ioc.Stripe.invoices.retrieveUpcoming(
			{ customer: billingData.customerId }
		).catch(() => {
			return {
				error: 'No upcoming invoice',
			};
		});

		const invoicesPromise = this.ioc.Stripe.invoices.list({
			customer: billingData.customerId,
			limit: 3,
		}).catch(() => {
			return {
				error: 'No previous invoices',
			};
		});

		const [upcomingInvoice, invoices] = await Promise.all([
			upcomingInvoicePromise,
			invoicesPromise,
		]);

		return {
			data: {
				upcomingInvoice,
				invoices,
			},
		};
	}

	/**
	 *  PUT /billing/info
	 *  Updates Stripe customer data with address and/or source
	 */
	async updateInfo({ data, user }) {
		// All attributes are optional
		const {
			billingEmail,
			line1,
			line2,
			city,
			postal_code,
			state,
			country,
			// Token is optional
			token,
		} = data;
		const constraints = {
			workspaceId: user.currentWorkspaceId,
			billingWorkspaceId: user.currentWorkspaceId,
		};
		const billingData = await this.repository.findOne(constraints);

		// TODO: validate data
		const address = merge({}, {
			line1,
			line2,
			city,
			postal_code,
			state,
			country,
		});

		const updateObject = merge({}, {
			source: token,
			address,
			email: billingEmail,
		});

		const customer = await this.ioc.Stripe.customers.update(
			billingData.customerId, updateObject
		);

		const card = customer.sources.data[0];

		let localUpdateObject = {
			billingEmail,
		};

		if (card && card.brand) {
			// TODO: make sure this works with nulls, since this are "defaults"
			localUpdateObject = merge(localUpdateObject, {
				ccCardType: card.brand,
				ccLastFour: card.last4,
				ccExpiration: `${card.exp_month}/${card.exp_year}`,
			});
		}

		const response = await this.repository.update(localUpdateObject, constraints);

		return {
			data: {
				...response,
				...localUpdateObject,
				planSlug: getPlanSlug(response),
			},
		};
	}

	/**
	 * POST /billing/plan
	 * @param {*} param0
	 */
	async updateSubscription({ data, user }) {
		const constraints = {
			workspaceId: user.currentWorkspaceId,
			billingWorkspaceId: user.currentWorkspaceId,
		};
		const billingData = await this.repository.findOne(constraints);

		const thingsToUpdate = merge({}, {
			coupon: data.couponCode,
			plan: data.planId,
			quantity: billingData.numberOfSeats,
			proration_behavior: 'always_invoice',
			cancel_at_period_end: false,
		});

		let subscription;

		try {
			subscription = await this.ioc.Stripe.subscriptions.update(
				billingData.subscriptionId,
				thingsToUpdate
			);
		} catch (e) {
			if (e.type === 'StripeInvalidRequestError') {
				// create a new subscription, the user most likely
				// cancelled their subscription
				subscription = await this.ioc.Stripe.subscriptions.create({
					items: [
						{
							plan: data.planId,
							quantity: billingData.numberOfSeats,
						},
					],
					coupon: data.couponCode,
					proration_behavior: 'create_prorations',
					customer: billingData.customerId,
					trial_period_days: 0,
				});
			} else {
				throw e;
			}
		}

		const response = await this.repository.update({
			subscriptionId: subscription.id,
			planName: subscription.plan.nickname,
			planId: subscription.plan.id,
			planObject: subscription.plan,
			billingStatus: BILLING_STATUS.ACTIVE,
		}, constraints);

		return {
			data: {
				...response,
				planSlug: getPlanSlug(response),
			},
		};
	}

	async cancelSubscriptionRequest({ user }) {
		const billingService = new BillingService(this.ioc);
		return billingService.deleteSubscription({ user });
	}
}
