import DynamoRepository from '../../utilities/DynamoRepository';
import TagItemSchema from './TagItemSchema';

export default class TagItemRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `TagItems-${process.env.STAGE}`, TagItemSchema);
	}
}
