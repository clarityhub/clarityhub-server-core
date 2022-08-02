import Slack from './integrationActions/Slack';
import Noop from './integrationActions/Noop';

export const integrationTypes = [
	{
		integrationKey: 'Slack:notify',
		appName: 'Slack',
		action: 'notify',
		description: 'Notify a Slack channel when an interview is created',
		defaultConfig: {
			channel: 'interviews',
		},
	},
];

export const getIntegrationHandler = (appName, ioc) => {
	switch (appName.toLowerCase()) {
	case 'slack':
		return new Slack(ioc);
	default:
		return new Noop(ioc);
	}
};

export const mapActionToIntegrationKeys = (action) => {
	switch (action) {
	case 'interview.created':
		return [
			'Slack:notify',
		];
	default:
		return [];
	}
};
