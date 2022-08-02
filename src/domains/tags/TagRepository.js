import DynamoRepository from '../../utilities/DynamoRepository';
import TagSchema from './TagSchema';

export default class TagRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `Tags-${process.env.STAGE}`, TagSchema);
	}
}
