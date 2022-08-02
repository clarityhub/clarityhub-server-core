import createError from 'http-errors';
import Controller from '../../utilities/Controller';
import PlanUsageRepository from './PlanUsageRepository';
import { FREE } from '../billing/Plans';
import BillingRepository from '../billing/BillingRepository';
import { getPlanSlug } from '../billing/utilities';
import merge from '../../utilities/merge';

const TEN_HOURS = 1000 * 60 * 60 * 10;

const planLimits = {
	free: {
		transcribe: TEN_HOURS,
		videoCalls: 10000,
	},
	premium: {
		transcribe: 'no limit',
		videoCalls: 'no limit',
	},
};

const planDefaults = {
	transcribe: {
		usage: 0,
	},
	videoCalls: {
		usage: 0,
	},
};

export default class PlanUsageController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new PlanUsageRepository(ioc);
		this.billingRepository = new BillingRepository(ioc);
	}

	_getMonthYearBucket() {
		const today = new Date();
		const month = today.getMonth() + 1;
		const year = today.getFullYear() + 1;
		return `${month}-${year}`;
	}

	_isWithinLimit({ type, plan = FREE, planUsage }) {
		if (!planUsage) {
			// no usage found for this month
			return true;
		}

		if (planLimits[plan] && typeof planLimits[plan][type] !== 'undefined') {
			if (planLimits[plan][type] === 'no limit') {
				return true;
			}
			return planLimits[plan][type] > planUsage.usage;
		}

		// Incorrect mapping.
		return true;
	}

	/*
     * Can a {user} in workspace with plan A, do
     * action {type}?
     */
	async can({ user, type }) {
		const workspaceIdUsage = `${user.currentWorkspaceId}/${type}`;
		const monthYearBucket = this._getMonthYearBucket();

		const constraints = {
			workspaceId: user.currentWorkspaceId,
			billingWorkspaceId: user.currentWorkspaceId,
		};
		const billingData = await this.billingRepository.findOne(constraints);

		if (!billingData) {
			throw createError.NotFound('Could not find billing data');
		}

		const planUsage = await this.repository.findOne({
			workspaceIdUsage,
			monthYearBucket,
		});

		console.log('🌈', getPlanSlug(billingData));

		return this._isWithinLimit({
			type,
			plan: getPlanSlug(billingData),
			planUsage,
		});
	}

	async getAll({ user }) {
		const keys = Object.keys(planDefaults);
		const vals = await Promise.all(keys.map(async (key) => {
			const workspaceIdUsage = `${user.currentWorkspaceId}/${key}`;
			const monthYearBucket = this._getMonthYearBucket();

			return this.repository.findOne({
				workspaceIdUsage,
				monthYearBucket,
			});
		}));

		const usage = {};
		keys.forEach((key, i) => {
			usage[key] = vals[i];
		});

		return {
			planLimits,
			usage: merge(planDefaults, usage),
		};
	}

	async add({ user, type, usage }) {
		// find
		const workspaceIdUsage = `${user.currentWorkspaceId}/${type}`;
		const monthYearBucket = this._getMonthYearBucket();

		const planUsage = await this.repository.findOne({
			workspaceIdUsage,
			monthYearBucket,
		});

		// create if not found
		if (!planUsage) {
			await this.repository.create({
				workspaceIdUsage,
				monthYearBucket,
				usage: 0,
			});
		}

		// increment
		return this.repository.update({
			$ADD: {
				usage,
			},
		}, {
			workspaceIdUsage,
			monthYearBucket,
		});
	}
}
