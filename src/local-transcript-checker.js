import { createBottle, bootstrapBottle } from './services';
import transcription from './transcription';

const ONE_MINUTE = 1000 * 60;

export default (event, context, callback) => {
	console.log('[Local Transcript Checker] Running transcript checker');
	// Check for any transcript that is complete or failed

	/*
    get all jobs
    see if any changed their status in the last 30 seconds

    call the transcription lambda and fake an event call for each
    */
	const bottle = createBottle();

	bootstrapBottle(bottle).then(async () => {
		const jobs = await bottle.container.Transcribe.listTranscriptionJobs({
			MaxResults: 10,
			Status: 'COMPLETED',
		}).promise();

		const promises = [];

		jobs.TranscriptionJobSummaries.forEach((job) => {
			const {
				TranscriptionJobName,
				CompletionTime,
				TranscriptionJobStatus,
			} = job;

			if ((+CompletionTime) > (+new Date() - ONE_MINUTE)) {
				console.log('[Transcript completed] sending off');
				promises.push(new Promise((resolve) => {
					const ev = {
						detail: {
							TranscriptionJobName,
							TranscriptionJobStatus,
						},
					};
					const cb = () => resolve();

					transcription(ev, {}, cb);
				}));
			}
		});

		await Promise.all(promises);

		callback(null, {
			statusCode: 200,
			body: 'Success',
		});
	});
};
