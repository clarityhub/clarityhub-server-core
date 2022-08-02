import uuid from 'uuid/v4';

import Controller from '~/utilities/Controller';
import InterviewRepository from './InterviewRepository';
import TagItemController from '../tags/TagItemController';

export default class InterviewController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new InterviewRepository(ioc);
		this.tagItemController = new TagItemController(ioc);
	}

	get({ user, id }) {
		// Get tags with items
		return this.repository.findOne({
			workspaceId: user.currentWorkspaceId,
			id,
		});
	}

	async getAll({ user }) {
		// Get tags with items
		const items = await this.repository.getRawModel().query({
			workspaceId: {
				eq: user.currentWorkspaceId,
			},
		}).where('createdAt').ascending()
			.exec();

		const tagItems = await Promise.all(items.map((item) => {
			return this.tagItemController.getAllForItem({
				user,
				type: 'interview',
				itemId: item.id,
			});
		}));

		return {
			tagItems,
			items,
		};
	}

	async create({ user, data }) {
		const interview = await this.repository.create({
			workspaceId: user.currentWorkspaceId,
			creatorId: user.userId,
			id: uuid(),

			...data,
		});

		this.ioc.Notify.publish('interview.created', {
			workspaceId: user.currentWorkspaceId,
			interviewId: interview.id,
			action: 'created',
			item: interview,
		});

		return interview;
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
