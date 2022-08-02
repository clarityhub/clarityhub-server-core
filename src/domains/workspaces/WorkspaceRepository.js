import DynamoRepository from '../../utilities/DynamoRepository';
import WorkspaceSchema from './WorkspaceSchema';

export default class WorkspaceRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `Workspace-${process.env.STAGE}`, WorkspaceSchema);
	}
}
