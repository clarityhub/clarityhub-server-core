import DynamoRepository from '../../utilities/DynamoRepository';
import ActivitySchema from './ActivitySchema';

export default class TagItemRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `Activity-${process.env.STAGE}`, ActivitySchema);
	}
}
