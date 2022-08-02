import DynamoRepository from '~/utilities/DynamoRepository';
import IntegrationSchema from './IntegrationSchema';

export default class IntegrationRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `Integration-${process.env.STAGE}`, IntegrationSchema);
	}
}
