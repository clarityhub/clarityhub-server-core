export default function S3(AWS) {
	const config = {
		s3ForcePathStyle: true,
		signatureVersion: 'v4',
	};

	if (process.env.IS_OFFLINE) {
		config.endpoint = new AWS.Endpoint(process.env.S3_ENDPOINT);
		config.region = process.env.LOCAL_S3_REGION;
		config.accessKeyId = process.env.LOCAL_S3_ACCESS_KEY_ID;
		config.secretAccessKey = process.env.LOCAL_S3_SECRET_ACESS_KEY;
	}

	return new AWS.S3(config);
}
