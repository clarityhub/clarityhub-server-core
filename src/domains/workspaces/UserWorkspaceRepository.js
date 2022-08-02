import DynamoRepository from '../../utilities/DynamoRepository';
import UserWorkspaceSchema from './UserWorkspaceSchema';

export default class UserWorkspaceRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `UserWorkspace-${process.env.STAGE}`, UserWorkspaceSchema);
	}
}
