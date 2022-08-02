import Controller from '../../utilities/Controller';
import ActivityRepository from './ActivityRepository';
import InterviewController from '../interviews/InterviewController';
import InterviewV2Controller from '../interviewsV2/InterviewV2Controller';

export default class TagController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new ActivityRepository(ioc);
		this.interviewController = new InterviewController(ioc);
		this.interviewV2Controller = new InterviewV2Controller(ioc);
	}

	async getAll({ user }) {
		const activities = await this.repository.getRawModel()
			.query('workspaceId')
			.eq(user.currentWorkspaceId)
			.where('createdAt')
			.descending()
			.limit(10)
			.exec();

		return Promise.all(activities.map(async (activity) => {
			if (activity.itemType === 'member') {
				return activity;
			}

			if (activity.itemType === 'interview') {
				return {
					...activity,
					item: await this.interviewController.get({ user, id: activity.itemId }),
				};
			} if (activity.itemType === 'interviewV2') {
				return {
					...activity,
					item: await this.interviewV2Controller.get({ user, id: activity.itemId }),
				};
			}
			return activity;
		}));
	}
}
