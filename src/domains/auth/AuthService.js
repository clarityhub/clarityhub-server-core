import Controller from '../../utilities/Controller';
import AuthRepository from './AuthRepository';

export default class ActivityService extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new AuthRepository(ioc);
	}

	/*
     * Used internally
     */
	async getUserMetaData({ user }) {
		const workspaceUser = await this.repository.findOne({
			userId: user.userId,
			email: user.email,
		});

		if (workspaceUser && workspaceUser.metadata) {
			return workspaceUser.metadata;
		}

		return {
			name: user.email,
		};
	}
}
