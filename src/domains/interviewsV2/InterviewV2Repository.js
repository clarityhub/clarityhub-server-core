import DynamoRepository from '~/utilities/DynamoRepository';
import InterviewSchema from './InterviewV2Schema';

export default class InterviewV2Repository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `InterviewV2-${process.env.STAGE}`, InterviewSchema);
	}
}
