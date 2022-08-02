import uuid from 'uuid/v4';
import rp from 'request-promise';
import createError from 'http-errors';

import PlanUsageController from '~/domains/plans/PlanUsageController';

import Controller from '../../utilities/Controller';
import MediaRepository from './MediaRepository';
import transformTranscriptToEditor from './transformTranscriptToEditor';
import fileTypeToFormat from './fileTypeToFormat';

export default class MediaController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new MediaRepository(ioc);
	}

	async get({ user, id }) {
		const media = await this.repository.findOne({
			id,
			workspaceId: user.currentWorkspaceId,
		});

		if (!media) {
			throw new createError.NotFound('Media Id not found');
		}

		const TWO_HOURS = 2 * 60 * 60;
		const params = {
			Bucket: process.env.mediaBucketName,
			Key: media.path,
			Expires: TWO_HOURS,
		};

		const presignedUrl = this.ioc.S3.getSignedUrl('getObject', params);
		const presignedDownloadUrl = this.ioc.S3.getSignedUrl('getObject', {
			...params,
			ResponseContentDisposition: `attachment; filename="${media.filename}"`,
		});

		return {
			...media,
			presignedUrl,
			presignedDownloadUrl,
		};
	}

	async create({ user, data }) {
		const {
			filename, fileType, action, status = 'uploading',
		} = data;
		const id = uuid();
		const path = `${user.currentWorkspaceId}/uploads/${id}-${filename}`;

		return this.repository.create({
			id,
			workspaceId: user.currentWorkspaceId,
			creatorId: user.userId,
			path,
			fileType,
			filename,
			status,
			action,
		});
	}

	async update({ user, id, data }) {
		const { transcript } = data;

		return this.repository.update({
			transcript,
		}, {
			id,
			workspaceId: user.currentWorkspaceId,
		});
	}

	async upload({ user, id }) {
		const media = await this.repository.findOne({
			id,
			workspaceId: user.currentWorkspaceId,
		});

		const FIVE_HUNDRED_MIB = 524288000;
		const TWO_HOURS = 2 * 60 * 60;
		const params = {
			Bucket: process.env.mediaBucketName,
			Expires: TWO_HOURS,
			Conditions: [
				{ key: media.path },
				{ 'Content-Type': media.fileType },
				['content-length-range', 0, FIVE_HUNDRED_MIB],
			],
		};

		const presignedUrl = this.ioc.S3.createPresignedPost(params);

		const nextMedia = await this.repository.update({
			status: 'uploading',
		}, {
			id,
			workspaceId: user.currentWorkspaceId,
		});

		await this.ioc.LogEvent.log('media.upload.requested', media.id, {
			fileType: media.fileType,
			workspaceId: user.currentWorkspaceId,
			userId: user.userId,
		});

		return {
			...nextMedia,
			presignedUrl: {
				...presignedUrl,
				fields: {
					...presignedUrl.fields,
					key: media.path,
				},
			},
		};
	}

	async _canTranscribe({ user }) {
		const planUsageController = new PlanUsageController(this.ioc);

		const can = await planUsageController.can({
			user,
			type: 'transcribe',
		});

		if (!can) {
			throw new createError.NotAcceptable('You have gone over your transcription limit. Please upgrade your plan.');
		}
	}

	async _addTranscribe({ user, usage }) {
		const planUsageController = new PlanUsageController(this.ioc);

		return planUsageController.add({
			user,
			type: 'transcribe',
			usage,
		});
	}

	async complete({ user, id }) {
		const media = await this.repository.findOne({
			id,
			workspaceId: user.currentWorkspaceId,
		});

		const updates = {};

		try {
			if (media.action === 'transcribe') {
				await this._canTranscribe({ user });

				const bucketUri = `${process.env.S3_ENDPOINT}/${process.env.mediaBucketName}/${media.path}`;
				const transcriptionJobName = `${user.currentWorkspaceId}_${media.id}`;
				// Trigger transcription job
				const transcriptionJob = await this.ioc.Transcribe.startTranscriptionJob({
					// TODO get the locale from the media file
					LanguageCode: 'en-US',
					Media: {
						MediaFileUri: bucketUri,
					},
					TranscriptionJobName: transcriptionJobName,
					MediaFormat: fileTypeToFormat(media.fileType),
					Settings: {
						ShowSpeakerLabels: true,
						MaxSpeakerLabels: 10,
					},
				}).promise();

				this.ioc.Logger.info(transcriptionJob);

				updates.transcriptionJobName = transcriptionJobName;
				updates.transcriptionStatus = transcriptionJob.TranscriptionJob.TranscriptionJobStatus;
			}
		} catch (e) {
			this.ioc.Logger.error('Failed to start transcription job');
			this.ioc.Logger.error(e);
			updates.transcriptionStatus = 'FAILED';
			updates.transcriptionError = e.message;
		}

		const TWO_HOURS = 2 * 60 * 60;
		const params = {
			Bucket: process.env.mediaBucketName,
			Key: media.path,
			Expires: TWO_HOURS,
		};

		const presignedUrl = this.ioc.S3.getSignedUrl('getObject', params);
		const presignedDownloadUrl = this.ioc.S3.getSignedUrl('getObject', {
			...params,
			ResponseContentDisposition: `attachment; filename="${media.filename}"`,
		});

		const nextMedia = await this.repository.update({
			status: 'complete',
			...updates,
		}, {
			id,
			workspaceId: user.currentWorkspaceId,
		});

		await this.ioc.LogEvent.log('media.upload.completed', media.id, {
			fileType: media.fileType,
			workspaceId: user.currentWorkspaceId,
			userId: user.userId,
		});

		return {
			...nextMedia,
			presignedUrl,
			presignedDownloadUrl,
		};
	}

	async updateTranscriptionStatus({
		workspaceId, mediaId, transcriptionStatus, TranscriptionJobName,
	}) {
		const media = await this.repository.findOne({
			id: mediaId,
			workspaceId,
		});


		if (!media) {
			return;
		}

		const additionalUpdates = {};
		let duration = '0';

		if (transcriptionStatus === 'COMPLETED') {
			const transcriptionJob = await this.ioc.Transcribe.getTranscriptionJob({
				TranscriptionJobName,
			}).promise();

			const uri = transcriptionJob.TranscriptionJob.Transcript.TranscriptFileUri;
			const payload = await rp({ uri, json: true });

			additionalUpdates.transcript = JSON.stringify(transformTranscriptToEditor(payload));

			try {
				// This duration is in seconds
				const durationItem = [...payload.results.items].reverse().find(item => item.end_time);

				duration = (durationItem && durationItem.end_time) || 0;

				await this._addTranscribe({
					user: {
						currentWorkspaceId: workspaceId,
					},
					usage: parseInt(duration, 10) * 1000,
				});
			} catch (e) {
				// ignore error
			}
		}

		const newMedia = await this.repository.update({
			transcriptionStatus,
			...additionalUpdates,
		}, {
			id: mediaId,
			workspaceId,
		});

		await this.ioc.Notify.publish('media.updated', {
			workspaceId,
			mediaId,
			action: 'updated',
			item: newMedia,
		});
		await this.ioc.Notify.publish('transcript.completed', {
			workspaceId,
			mediaId: media.id,
			action: 'completed',
			fileType: media.fileType,
			status: transcriptionStatus,
			duration,
		});

		return newMedia;
	}
}
