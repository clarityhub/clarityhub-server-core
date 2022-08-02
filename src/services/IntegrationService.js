import IntegrationService from '../domains/integrations/IntegrationService';

let service;

export default function (container) {
	if (!service) {
		service = new IntegrationService(container);
	}

	return service;
}
