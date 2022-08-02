import { createBottle } from '../src/services';
import BillingService from '../src/domains/billing/BillingService';
import WorkspaceRepository from '../src/domains/workspaces/WorkspaceRepository';
import AuthRepository from '../src/domains/auth/AuthRepository';


export default {
	up: async (DynamoDB) => {
		const bottle = createBottle();

		// Override DynamoDB
		bottle.service('RawDynamoDB', () => DynamoDB);

		const authRepository = new AuthRepository(bottle.container);
		const workspaceRepository = new WorkspaceRepository(bottle.container);
		// Load schema into Dyanmoose (so that tables are created)
		const billingService = new BillingService(bottle.container);

		// Load all workspaces in
		const workspaces = await workspaceRepository.findWhere({});

		const promises = await Promise.all(workspaces.map(async (workspace) => {
			// Get the primary owner user
			const users = await authRepository.findWhere({
				userId: workspace.creatorId,
			});

			if (!users || users.length === 0) {
				return Promise.resolve();
			}

			const user = users[0];

			return billingService.createCustomer({
				user,
				workspaceId: workspace.id,
			});
		}));

		return promises;
	},
	down: async () => {
		// Do nothing
	},
};
