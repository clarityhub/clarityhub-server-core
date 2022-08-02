import uuid from 'uuid/v4';
import createError from 'http-errors';
import shortid from 'shortid';
import PlanUsageController from '~/domains/plans/PlanUsageController';

import VideoCallRepository from './VideoCallRepository';
import Controller from '../../utilities/Controller';

export default class VideoCallController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new VideoCallRepository(ioc);
	}

	async get({ user, id }) {
		const videoCall = await this.repository.findOne({
			id,
			workspaceId: user.currentWorkspaceId,
		});

		if (!videoCall) {
			throw new createError.NotFound('Video Call not found');
		}

		return videoCall;
	}

	async _canVideoCall({ user }) {
		const planUsageController = new PlanUsageController(this.ioc);

		const can = await planUsageController.can({
			user,
			type: 'videoCalls',
		});

		if (!can) {
			throw new createError.NotAcceptable('You have gone over your video call limit. Please upgrade your plan.');
		}
	}

	async _addVideoCall({ user }) {
		const planUsageController = new PlanUsageController(this.ioc);

		return planUsageController.add({
			user,
			type: 'videoCalls',
			usage: 1,
		});
	}

	async create({ user, data }) {
		const { publicName, password } = data;
		const id = uuid();
		const shortId = shortid.generate();

		return this.repository.create({
			workspaceId: user.currentWorkspaceId,
			id,
			shortId,
			shortIdRange: shortId,
			creatorId: user.userId,
			publicName,
			password,
			status: 'NOT_STARTED',
		});
	}

	async update({ user, id, data }) {
		const { publicName, password } = data;

		const nextVideoCall = await this.repository.update({
			publicName,
			password,
		}, {
			id,
			workspaceId: user.currentWorkspaceId,
		});

		await this.ioc.Notify.publish('room.updated', {
			workspaceId: user.currentWorkspaceId,
			roomId: id,
			action: 'room.updated',
			item: nextVideoCall,
		});

		return nextVideoCall;
	}

	async delete({ user, id }) {
		return this.repository.delete({
			id,
			workspaceId: user.currentWorkspaceId,
		});
	}

	// Actions
	async start({ user, id }) {
		const videoCall = await this.repository.findOne({
			id,
			workspaceId: user.currentWorkspaceId,
		});

		if (!videoCall) {
			throw new createError.NotFound('Video Call not found');
		}

		if (videoCall.videoMetaData) {
			throw new createError.BadRequest('Video Call already started');
		}

		await this._canVideoCall({ user });

		// Set up the video call
		const twilioResponse = await this.ioc.Twilio.createRoom(videoCall.id);
		const { sid } = twilioResponse;

		await this.ioc.LogEvent.log('videoCall.started', videoCall.id, {
			sid,
			userId: user.userId,
			workspaceId: user.currentWorkspaceId,
		});

		await this._addVideoCall({ user });

		const nextVideoCall = await this.repository.update({
			status: 'ACTIVE',
			videoMetaData: {
				type: 'twilio',
				providerId: sid,
			},
		}, {
			id,
			workspaceId: user.currentWorkspaceId,
		});

		const userMetaData = await this.ioc.AuthService.getUserMetaData({ user });

		const identity = {
			name: userMetaData.name,
		};

		const token = this.ioc.Twilio.createToken(JSON.stringify(identity), videoCall.id);

		await this.ioc.Notify.publish('room.updated', {
			workspaceId: user.currentWorkspaceId,
			roomId: id,
			action: 'room.updated',
			status: 'ACTIVE',
			item: nextVideoCall,
		});

		return {
			...nextVideoCall,
			token,
		};
	}

	async join({ user, id }) {
		const videoCall = await this.repository.findOne({
			id,
			workspaceId: user.currentWorkspaceId,
		});

		if (!videoCall) {
			throw new createError.NotFound('Video Call not found');
		}

		if (!videoCall.videoMetaData) {
			throw new createError.BadRequest('Video Call not started');
		}

		if (videoCall.status !== 'ACTIVE') {
			throw new createError.BadRequest('Video Call not in-progress');
		}

		const userMetaData = await this.ioc.AuthService.getUserMetaData({ user });

		const identity = {
			name: userMetaData.name,
		};

		const token = this.ioc.Twilio.createToken(JSON.stringify(identity), videoCall.id);

		return {
			...videoCall,
			token,
		};
	}

	async end({ user, id }) {
		const videoCall = await this.repository.findOne({
			id,
			workspaceId: user.currentWorkspaceId,
		});

		if (!videoCall) {
			throw new createError.NotFound('Video Call not found');
		}

		if (!videoCall.videoMetaData) {
			throw new createError.BadRequest('Video Call not started');
		}

		try {
			await this.ioc.Twilio.completeRoom(videoCall.videoMetaData.providerId);
		} catch (_) {
			// ignore
		}

		const nextVideoCall = await this.repository.update({
			status: 'COMPLETE',
		}, {
			id,
			workspaceId: user.currentWorkspaceId,
		});

		await this.ioc.Notify.publish('room.complete', {
			workspaceId: user.currentWorkspaceId,
			roomId: id,
			action: 'room.complete',
			status: 'COMPLETE',
			item: nextVideoCall,
		});

		return nextVideoCall;
	}

	// ---- Public ----
	async getByPublicId({ id, data }) {
		const { password } = data;
		const [videoCall] = await this.repository.find({
			shortId: id,
			shortIdRange: id,
		});

		if (!videoCall) {
			throw createError.NotFound('Video Call was not found');
		}

		if (videoCall.password && !password) {
			return {
				message: 'Please provide the video call password',
			};
		}

		if (videoCall.password && videoCall.password !== password) {
			throw createError.Unauthorized();
		}

		return videoCall;
	}

	async joinByPublicId({ id, data }) {
		const { name, password } = data;
		const [videoCall] = await this.repository.find({
			shortId: id,
			shortIdRange: id,
		});

		if (!videoCall) {
			throw createError.NotFound('Video Call was not found');
		}

		if (videoCall.password && !password) {
			return {
				message: 'Please provide the video call password',
			};
		}

		if (videoCall.password && videoCall.password !== password) {
			throw createError.Unauthorized();
		}

		if (!videoCall.videoMetaData) {
			throw new createError.BadRequest('Video Call not started');
		}

		if (videoCall.status !== 'ACTIVE') {
			throw new createError.BadRequest('Video Call not in-progress');
		}

		const identity = {
			name,
		};

		const token = this.ioc.Twilio.createToken(JSON.stringify(identity), videoCall.id);

		return {
			token,
		};
	}
}
