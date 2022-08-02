import DynamoRepository from '../../utilities/DynamoRepository';
import MediaSchema from './MediaSchema';

export default class MediaRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `Media-${process.env.STAGE}`, MediaSchema);
	}
}
