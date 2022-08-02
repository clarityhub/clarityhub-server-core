import middy from 'middy';

import httpSuccessHandler from './middleware/httpSuccessHandler';
import httpErrorHandler from './middleware/httpErrorHandler';
import wrapBottle from './middleware/wrapBottle';

import { settled } from './utilities/promises';

async function selfConnectionStatus(ioc) {
	return ioc.Introspect.getSelfUrl();
}

async function checkDynamoDBConnection(ioc) {
	try {
		await ioc.RawDynamoDB.listTables().promise();

		return {
			status: 'OK',
		};
	} catch (err) {
		ioc.Logger.error(err);
		return {
			status: 'SICK',
			message: JSON.stringify(err),
		};
	}
}

// TODO check Pusher
// TODO check S3
// TODO check Transcribe
// TODO check SES

export default middy(async (event, context) => {
	const values = await settled([
		checkDynamoDBConnection(context.bottle.container),
		selfConnectionStatus(context.bottle.container),
	]);

	const dynamoDBStatus = values[0].value;
	const selfValue = values[1].value || values[1].reason;

	const allServicesOkay = dynamoDBStatus.status === 'OK';
	const message = {
		status: allServicesOkay ? 'OK' : 'SICK',
		items: [{
			service: 'DynamoDB',
			status: dynamoDBStatus,
		}, {
			service: 'self',
			value: selfValue,
			status: 'OK',
		}],
	};

	if (allServicesOkay) {
		return message;
	}

	return {
		statusCode: 500,
		body: JSON.stringify(message),
	};
})
	.use(wrapBottle())
	.use(httpErrorHandler())
	.use(httpSuccessHandler());
