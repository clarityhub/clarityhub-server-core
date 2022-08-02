import createError from 'http-errors';

import Controller from '~/utilities/Controller';
import IntegrationRepository from './IntegrationRepository';
import { integrationTypes, getIntegrationHandler } from './integrationMappings';

export default class IntegrationController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new IntegrationRepository(ioc);
	}

	info() {
		return integrationTypes;
	}

	get({ user, id }) {
		return this.repository.findOne({
			workspaceId: user.currentWorkspaceId,
			integrationKey: id,
		});
	}

	getAll({ user }) {
		return this.repository.getRawModel().query({
			workspaceId: {
				eq: user.currentWorkspaceId,
			},
		}).where('createdAt').ascending()
			.exec();
	}

	async create({ user, data }) {
		const {
			appName, action, name = '', description = '', config,
		} = data;

		if (!appName) {
			throw new createError.BadRequest('Invalid appName');
		}

		if (!action) {
			throw new createError.BadRequest('Invalid action');
		}

		const integrationKey = `${appName}:${action}`;

		const item = await this.repository.findOne({
			workspaceId: user.currentWorkspaceId,
			integrationKey,
		});

		if (item) {
			throw new createError.BadRequest('Cannot create multiple of the same integration');
		}

		const handler = getIntegrationHandler(appName, this.ioc);
		const tokens = await handler.getTokens(data);

		const integration = await this.repository.create({
			workspaceId: user.currentWorkspaceId,
			creatorId: user.userId,

			integrationKey,

			appName,
			action,
			status: 'ACTIVE',

			name,
			description,
			config,
			tokens,
		});

		this.ioc.Notify.publish('integration.created', {
			workspaceId: user.currentWorkspaceId,
			integrationKey: integration.integrationKey,
			action: 'created',
			item: integration,
		});

		return integration;
	}

	update({ user, id, data }) {
		const {
			name, description, config,
		} = data;

		const subset = {
			name,
			description,
			config,
		};

		return this.repository.update(subset, {
			integrationKey: id,
			workspaceId: user.currentWorkspaceId,
		});
	}

	async test({ user, id, data }) {
		const {
			config,
		} = data;

		const item = await this.repository.findOne({
			workspaceId: user.currentWorkspaceId,
			integrationKey: id,
		});

		if (!item) {
			throw new createError.NotFound('Integration not found');
		}

		const handler = getIntegrationHandler(item.appName, this.ioc);

		const integration = {
			...item,
			// enable testing config changes before committing them
			config: {
				...item.config,
				...config,
			},
		};

		const result = await handler[integration.action](
			integration,
			{
				action: 'test',
				details: 'This is a test message',
			}
		);

		return result;
	}

	delete({ user, id }) {
		return this.repository.delete({
			integrationKey: id,
			workspaceId: user.currentWorkspaceId,
		});
	}
}
