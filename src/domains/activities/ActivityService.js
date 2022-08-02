import uuid from 'uuid/v4';

import Controller from '../../utilities/Controller';
import ActivityRepository from './ActivityRepository';

export default class ActivityService extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new ActivityRepository(ioc);
	}

	/*
     * Used internally
     */
	createActivity({
		workspaceId,
		itemId,
		itemType,
		itemPreview,
		action,
	}) {
		const activityId = uuid();

		return this.repository.create({
			workspaceId,
			activityId,
			createdAt: new Date(),
			itemId,
			itemType,
			itemPreview,
			action,
		});
	}
}
