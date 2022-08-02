import ActivityService from '../domains/activities/ActivityService';

let service;

export default function (container) {
	if (!service) {
		service = new ActivityService(container);
	}

	return service;
}
