/* eslint-disable-next-line import/no-extraneous-dependencies */
import AWS from 'aws-sdk';
import Bottle from 'bottlejs';

import RawDynamoDB from './RawDynamoDB';
import DynamoDB from './DynamoDB';
import Logger from './Logger';
import Pusher from './Pusher';
import Dynamoose from './Dynamoose';
import Introspect from './Introspect';
import JWT from './JWT';
import LogEvent from './LogEvent';
import Notify from './Notify';
import S3 from './S3';
import SES from './SES';
import Transcribe from './Transcribe';
import Mailchimp from './Mailchimp';
import Slack from './Slack';
import Stripe from './Stripe';
import ActivityService from './ActivityService';
import AuthService from './AuthService';
import IntegrationService from './IntegrationService';
import Twilio from './Twilio';

// TODO should probably be a singleton
export function createBottle() {
	const bottle = new Bottle();

	bottle.factory('AWS', () => AWS);
	bottle.service('RawDynamoDB', RawDynamoDB, 'AWS');
	bottle.service('S3', S3, 'AWS');
	bottle.service('SES', SES, 'AWS');
	bottle.service('Transcribe', Transcribe, 'AWS');
	bottle.service('DynamoDB', DynamoDB, 'AWS', 'RawDynamoDB');
	bottle.service('Logger', Logger);
	bottle.service('LogEvent', LogEvent, 'AWS', 'Logger');
	bottle.service('Pusher', Pusher);
	bottle.service('Mailchimp', Mailchimp);
	bottle.service('Dynamoose', Dynamoose, 'RawDynamoDB');
	bottle.service('Introspect', Introspect);
	bottle.service('JWT', JWT);
	bottle.service('Stripe', Stripe);
	bottle.service('Slack', Slack);
	bottle.factory('Twilio', Twilio);

	bottle.factory('AuthService', AuthService);
	bottle.factory('ActivityService', ActivityService);
	bottle.factory('IntegrationService', IntegrationService);
	bottle.service('Notify', Notify, 'Pusher', 'LogEvent', 'ActivityService', 'IntegrationService');

	return bottle;
}

export async function bootstrapBottle(/* bottle */) {
	// Bootstrap any connections that must exist

}
