import request from 'request-promise';
import slugify from 'slugify';
import Controller from '~/utilities/Controller';

import MediaController from '../medias/MediaController';
import VideoCallRepository from './VideoCallRepository';

export default class TwilioWebhookController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new VideoCallRepository(ioc);
		this.mediaController = new MediaController(ioc);
	}

	async handle({ data }) {
		if (!data) {
			return { received: true };
		}

		const { StatusCallbackEvent } = data;

		switch (StatusCallbackEvent) {
		case 'room-ended':
			await this.roomEnded({ data });
			break;
		case 'recording-completed':
			await this.recordingCompleted({ data });
			break;
		case 'recording-failed':
			await this.recordingFailed({ data });
			break;
		default:
			break;
		}

		return { received: true };
	}

	async roomEnded({ data }) {
		const { RoomName } = data;

		const id = RoomName;

		const videoCalls = await this.repository.findWhere({
			id,
		});

		if (!videoCalls || videoCalls.length === 0) {
			console.log('could not find video call');
			return;
		}

		const videoCall = videoCalls[videoCalls.length - 1];

		const nextVideoCall = await this.repository.update({
			status: 'COMPLETE',
		}, {
			id,
			workspaceId: videoCall.workspaceId,
		});

		await this.ioc.Notify.publish('room.complete', {
			workspaceId: videoCall.workspaceId,
			roomId: id,
			action: 'room.complete',
			status: 'COMPLETE',
			item: nextVideoCall,
		});

		return nextVideoCall;
	}

	async recordingCompleted({ data }) {
		const {
			RoomName, MediaUri, Container, ParticipantIdentity,
		} = data;

		let name = 'unknown';

		if (ParticipantIdentity) {
			try {
				const identity = JSON.parse(ParticipantIdentity);
				if (identity && identity.name) {
					({ name } = identity);
				}
			} catch (_) {
				// Do nothing
			}
		}

		const id = RoomName;

		const videoCalls = await this.repository.findWhere({
			id,
		});


		if (!videoCalls || videoCalls.length === 0) {
			console.log('could not find video call');
			return;
		}

		const videoCall = videoCalls[videoCalls.length - 1];

		const user = {
			currentWorkspaceId: videoCall.workspaceId,
		};

		// For the given MediaUri:
		const media = await this.mediaController.create({
			user,
			data: {
				filename: slugify(`${videoCall.publicName}-${name}.${Container}`),
				fileType: Container === 'mka' ? 'audio/mp3' : `video/${Container}`,
				action: null, // Container === 'mka' ? 'transcribe' : null,
			},
		});

		const nextVideoCall = await this.repository.update({
			$ADD: {
				mediaIds: [media.id],
			},
		}, {
			id: videoCall.id,
			workspaceId: videoCall.workspaceId,
		});

		await this.ioc.Notify.publish('room.updated', {
			workspaceId: videoCall.workspaceId,
			roomId: videoCall.id,
			action: 'room.updated',
			item: nextVideoCall,
		});

		try {
			const res = await request(`https://video.twilio.com/${MediaUri}`, {
				auth: {
					user: process.env.TWILIO_KEY,
					pass: process.env.TWILIO_SECRET,
				},
				encoding: null,
			});

			await this.ioc.S3.putObject({
				Bucket: process.env.mediaBucketName,
				Key: media.path,
				Body: res,
			}).promise();

			await this.mediaController.complete({
				user,
				id: media.id,
			});
		} catch (e) {
			// TODO bugsnag
			console.error(e);
			// TODO media error
		}
	}

	async recordingFailed({ data }) {
		const {
			RoomName, Container, ParticipantIdentity,
		} = data;

		let name = 'unknown';

		if (ParticipantIdentity) {
			try {
				const identity = JSON.parse(ParticipantIdentity);
				if (identity && identity.name) {
					({ name } = identity);
				}
			} catch (_) {
				// Do nothing
			}
		}

		const id = RoomName;

		const videoCalls = await this.repository.findWhere({
			id,
		});


		if (!videoCalls || videoCalls.length === 0) {
			console.log('could not find video call');
			return;
		}

		const videoCall = videoCalls[videoCalls.length - 1];

		const user = {
			currentWorkspaceId: videoCall.workspaceId,
		};

		// For the given MediaUri:
		const media = await this.mediaController.create({
			user,
			data: {
				filename: slugify(`${videoCall.publicName}-${name}.${Container}`),
				fileType: Container === 'mka' ? 'audio/mka' : `video/${Container}`,
				action: null, // Container === 'mka' ? 'transcribe' : null,
				status: 'failed',
			},
		});

		const nextVideoCall = await this.repository.update({
			$ADD: {
				mediaIds: [media.id],
			},
		}, {
			id: videoCall.id,
			workspaceId: videoCall.workspaceId,
		});

		await this.ioc.Notify.publish('room.updated', {
			workspaceId: videoCall.workspaceId,
			roomId: videoCall.id,
			action: 'room.updated',
			item: nextVideoCall,
		});
	}
}
