export default function RawDynamoDB(AWS) {
	const config = {
		httpOptions: {
			connectTimeout: 1000,
		},
	};

	if (process.env.IS_OFFLINE) {
		config.region = 'localhost';
		config.endpoint = 'http://localhost:8000';
		config.accessKeyId = 'DEFAULT_ACCESS_KEY';
		config.secretAccessKey = '';
	}

	return new AWS.DynamoDB(config);
}
