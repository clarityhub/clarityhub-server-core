import Controller from '../../utilities/Controller';
import IntegrationRepository from './IntegrationRepository';

import { mapActionToIntegrationKeys, getIntegrationHandler } from './integrationMappings';


export default class IntegrationService extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new IntegrationRepository(ioc);
	}

	async notifyEvent(data) {
		const {
			workspaceId, data: incomingData, action,
		} = data;

		const integrationKeys = mapActionToIntegrationKeys(action);


		return Promise.all(integrationKeys.map(async (integrationKey) => {
			const integration = await this.repository.findOne({
				workspaceId,
				integrationKey,
			});
			if (integration) {
				const handler = getIntegrationHandler(integration.appName, this.ioc);

				if (handler) {
					const result = await handler[integration.action](
						integration,
						{
							action,
							details: incomingData,
						}
					);

					return result;
				}
			}
		}));
	}
}
