
import Controller from '../../utilities/Controller';
import OnboardingRepository from './OnboardingRepository';

export default class OnboardingController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new OnboardingRepository(ioc);
	}

	async getAll({ user }) {
		return this.repository.find({
			userId: {
				eq: user.userId,
			},
			workspaceId: {
				eq: user.currentWorkspaceId,
			},
		});
	}

	async update({ user, id, data }) {
		// Upsert
		return this.repository.put({
			userId: user.userId,
			workspaceId: user.currentWorkspaceId,
			id,
			state: data.state,
		});
	}
}
