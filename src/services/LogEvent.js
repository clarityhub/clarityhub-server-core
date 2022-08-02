export default function LogEvent(AWS, Logger) {
	const config = {
	};

	if (process.env.IS_OFFLINE) {
		config.region = process.env.LOCAL_S3_REGION;
		config.accessKeyId = process.env.LOCAL_S3_ACCESS_KEY_ID;
		config.secretAccessKey = process.env.LOCAL_S3_SECRET_ACESS_KEY;
	}

	const firehose = new AWS.Firehose(config);

	return {
		async log(event, value, meta = {}) {
			try {
				await firehose.putRecord({
					DeliveryStreamName: process.env.kensisFirehoseStreamName,
					Record: {
						Data: JSON.stringify({
							event,
							value,
							timestamp: new Date(),
							meta,
						}),
					},
				}).promise();
			} catch (e) {
				Logger.error('Failed to publish record to firehose');
				Logger.error(e);
			}
		},
	};
}
