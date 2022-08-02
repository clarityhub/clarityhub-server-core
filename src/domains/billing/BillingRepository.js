import DynamoRepository from '~/utilities/DynamoRepository';
import BillingSchema from './BillingSchema';

export default class BillingRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `Billing-${process.env.STAGE}`, BillingSchema);
	}
}
