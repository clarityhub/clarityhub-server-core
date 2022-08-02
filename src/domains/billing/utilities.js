import * as PLANS from './Plans';

const isTrialExpired = (subscription) => {
	const expirationDate = new Date(subscription.trial_end * 1000);
	const trialDate = subscription.trial_end * 1000;
	const now = +new Date();

	return expirationDate && now > trialDate;
};

/**
 * Return a plan slug Enum
 */
export const getPlanSlug = (subscription) => {
	const expirationDate = new Date(subscription.trial_end * 1000);

	if (expirationDate && subscription.billingStatus !== 'active') {
		if (isTrialExpired(subscription)) {
			return PLANS.EXPIRED;
		}
		return PLANS.FREE;
	}

	// XXX this is not always true
	return PLANS.PREMIUM;
};

const isPastDue = (subscription) => {
	// we are past due if cancel_at is in the future
	const canceledAt = new Date(subscription.canceled_at * 1000);
	const now = +new Date();

	return subscription.canceled_at && now > canceledAt;
};

export const getWorkspaceStatus = (billing, subscription) => {
	switch (subscription.status) {
	case 'active':
		return true;
	case 'incomplete':
	case 'incomplete_expired':
	case 'past_due':
	case 'trialing':
	case 'canceled':
	case 'unpaid':
	default:
		return !isTrialExpired(subscription) && !isPastDue(subscription);
	}
};
