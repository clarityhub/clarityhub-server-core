import uuid from 'uuid/v4';

import Controller from '../../utilities/Controller';
import PersonaRepository from './PersonaRepository';

export default class PersonaController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new PersonaRepository(ioc);
	}

	get({ user, id }) {
		return this.repository.findOne({
			workspaceId: user.currentWorkspaceId,
			id,
		});
	}

	getAll({ user }) {
		return this.repository.find({
			workspaceId: {
				eq: user.currentWorkspaceId,
			},
		});
	}

	create({ user, data }) {
		return this.repository.create({
			workspaceId: user.currentWorkspaceId,
			creatorId: user.userId,
			id: uuid(),

			...data,
		});
	}

	update({ user, id, data }) {
		return this.repository.update(data, {
			id,
			workspaceId: user.currentWorkspaceId,
		});
	}

	delete({ user, id }) {
		return this.repository.delete({
			id,
			workspaceId: user.currentWorkspaceId,
		});
	}
}
