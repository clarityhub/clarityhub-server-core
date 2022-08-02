export default function SES(AWS) {
	const config = {
	};

	if (process.env.IS_OFFLINE) {
		config.region = process.env.LOCAL_S3_REGION;
		config.accessKeyId = process.env.LOCAL_S3_ACCESS_KEY_ID;
		config.secretAccessKey = process.env.LOCAL_S3_SECRET_ACESS_KEY;
	}

	const ses = new AWS.SES(config);

	return {
		sendEmail(params) {
			return ses.sendEmail(params).promise();
		},
	};
}
