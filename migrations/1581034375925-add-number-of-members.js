import { createBottle } from '../src/services';
import BillingRepository from '../src/domains/billing/BillingRepository';
import WorkspaceRepository from '../src/domains/workspaces/WorkspaceRepository';
import UserWorkspaceRepository from '../src/domains/workspaces/UserWorkspaceRepository';

export default {
	up: async (DynamoDB) => {
		const bottle = createBottle();

		// Override DynamoDB
		bottle.service('RawDynamoDB', () => DynamoDB);

		const workspaceRepository = new WorkspaceRepository(bottle.container);
		const userWorkspaceRepository = new UserWorkspaceRepository(bottle.container);
		// Load schema into Dyanmoose (so that tables are created)
		const billingRepository = new BillingRepository(bottle.container);

		// Load all workspaces in
		const workspaces = await workspaceRepository.findWhere({});

		const promises = await Promise.all(workspaces.map(async (workspace) => {
			const workspaceUsers = await userWorkspaceRepository.findWhere({
				workspaceId: workspace.id,
			});

			return billingRepository.update({
				numberOfSeats: workspaceUsers.length,
			}, {
				workspaceId: workspace.id,
				billingWorkspaceId: workspace.id,
			});
		}));

		return promises;
	},
	down: async () => {
		// Do nothing
	},
};
