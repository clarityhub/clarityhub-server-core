/**
 * The Notify "Service" is a simple publisher-subscriber pattern
 * so that we can easily refactor the application in the future.
 *
 * For example, if we use AWS SQS, then we would replace Notify
 * with publications to SQS and listeners from SQS.
 */

const PubSub = {
	_channels: {},
	subscribe(channel, cb) {
		const pubSubChannel = PubSub._channels[channel];

		if (!pubSubChannel) {
			PubSub._channels[channel] = [];
		}

		PubSub._channels[channel].push(cb);
	},

	publish(channel, data) {
		const pubSubChannel = PubSub._channels[channel];

		if (pubSubChannel) {
			return Promise.all(pubSubChannel.map((listener) => {
				return listener(channel, data);
			}));
		}
		return Promise.resolve();
	},
};

export default function Notify(Pusher, LogEvent, ActivityService, IntegrationService) {
	// hard coding all of the triggers here...
	PubSub.subscribe('interview.created', async (msg, data) => {
		Pusher.trigger(data.workspaceId, 'interview.created', data);

		await ActivityService.createActivity({
			workspaceId: data.workspaceId,
			itemId: data.interviewId,
			itemType: 'interview',
			action: 'interview.created',
		});

		// await IntegrationService.notifyEvent({
		// 	workspaceId: data.workspaceId,
		// 	action: 'interview.created',

		// 	data: data.item,
		// });
	});

	PubSub.subscribe('interviewV2.created', async (msg, data) => {
		Pusher.trigger(data.workspaceId, 'interviewV2.created', data);

		await ActivityService.createActivity({
			workspaceId: data.workspaceId,
			itemId: data.interviewId,
			itemType: 'interviewV2',
			action: 'interviewV2.created',
		});

		await IntegrationService.notifyEvent({
			workspaceId: data.workspaceId,
			action: 'interview.created',

			data: data.item,
		});
	});

	PubSub.subscribe('media.updated', (msg, data) => {
		Pusher.trigger(data.workspaceId, 'media.updated', data);
	});

	PubSub.subscribe('transcript.completed', async (msg, data) => {
		await LogEvent.log('transcript.completed', data.mediaId, data);
	});

	PubSub.subscribe('member.joined', async (msg, data) => {
		await ActivityService.createActivity(data);
	});

	PubSub.subscribe('integration.created', async (msg, data) => {
		await LogEvent.log('integration.created', data.integrationKey, data);
		await ActivityService.createActivity({
			workspaceId: data.workspaceId,
			itemId: data.integrationKey,
			itemType: 'integration',
			action: 'integration.created',
			itemPreview: {
				appName: data.item.appName,
			},
		});
	});

	PubSub.subscribe('room.updated', async (msg, data) => {
		await LogEvent.log('room.updated', data.roomId, data);
		Pusher.trigger(data.workspaceId, 'room.updated', data);
		Pusher.trigger(data.roomId, 'room.updated', data);
	});

	PubSub.subscribe('room.complete', async (msg, data) => {
		await LogEvent.log('room.complete', data.roomId, data);
		Pusher.trigger(data.workspaceId, 'room.complete', data);
		Pusher.trigger(data.roomId, 'room.complete', data);
	});

	return PubSub;
}
