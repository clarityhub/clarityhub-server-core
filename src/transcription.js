import MediaController from './domains/medias/MediaController';
import { createBottle, bootstrapBottle } from './services';

/*
Example event:

{
   "version": "0",
   "id": "event ID",
   "detail-type":"Transcribe Job State Change",
   "source": "aws.transcribe",
   "account": "account ID",
   "time": "timestamp",
   "region": "region",
   "resources": [],
   "detail": {
     "TranscriptionJobName": "unique job name",
     "TranscriptionJobStatus": "status"
   }
 }
*/

export default (event, context, callback) => {
	console.log('[Transcription] Called');
	const { TranscriptionJobName, TranscriptionJobStatus } = event.detail;
	const [workspaceId, mediaId] = TranscriptionJobName.split('_');

	const bottle = createBottle();

	bootstrapBottle(bottle).then(() => {
		const controller = new MediaController(bottle.container);

		controller.updateTranscriptionStatus({
			workspaceId,
			mediaId,
			transcriptionStatus: TranscriptionJobStatus,
			TranscriptionJobName,
		}).then(() => {
			callback();
		}).catch((e) => {
			bottle.container.Logger.error(e);
			callback('Something bad happened');
		});
	});
};
