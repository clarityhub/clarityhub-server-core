import DynamoRepository from '../../utilities/DynamoRepository';
import VideoCallSchema from './VideoCallSchema';

export default class VideoCallRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `VideoCall-${process.env.STAGE}`, VideoCallSchema);
	}
}
