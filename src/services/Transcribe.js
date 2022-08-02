export default function Transcribe(AWS) {
	const config = {
	};

	if (process.env.IS_OFFLINE) {
		// config.endpoint = new AWS.Endpoint(process.env.LOCAL_TRANSCRIBE_ENDPOINT);
		// config.region = process.env.LOCAL_TRANSCRIBE_REGION;
		config.accessKeyId = process.env.LOCAL_TRANSCRIBE_ACCESS_KEY_ID;
		config.secretAccessKey = process.env.LOCAL_TRANSCRIBE_SECRET_ACESS_KEY;
	}

	return new AWS.TranscribeService(config);
}
