import rp from 'request-promise';
import createError from 'http-errors';

export default class Slack {
	constructor(ioc) {
		this.Slack = ioc.Slack;
	}

	_getBlocksFromData(data) {
		const { action, details } = data;

		switch (action) {
		case 'interview.created':
			return {
				text: details,
				blocks: [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: `A new interview "${details.title}" was created:\n*<${process.env.WEBAPP_URI}/interviews/${details.id}|View on Clarity Hub>*`,
						},
					},
				],
			};
		case 'test':
		default:
			return {
				text: details,
				blocks: null,
			};
		}
	}

	async notify(integration, data) {
		const { blocks, text } = this._getBlocksFromData(data);
		const { config, tokens } = integration;
		const token = tokens.slackToken;

		const app = new this.Slack({
			token,
			signingSecret: process.env.SLACK_SIGNING_SECRET,
		});

		const result = await app.client.chat.postMessage({
			token,
			channel: config.channel,
			text,
			blocks,
		});

		return result;
	}

	async getTokens(data) {
		const { code, redirectUrl } = data;

		if (!code) {
			throw new Error('Code is required');
		}

		if (!redirectUrl) {
			throw new Error('Redirect url is required');
		}

		if (!redirectUrl.match(/clarityhub/)) {
			throw new Error('Invalid redirect url');
		}

		const options = {
			uri: `https://slack.com/api/oauth.v2.access?code=${code}&client_id=${process.env.SLACK_CLIENT_ID}&client_secret=${process.env.SLACK_CLIENT_SECRET}&redirect_uri=${redirectUrl}`,
			ethod: 'GET',
			json: true,
		};

		try {
			const response = await rp(options);

			if (response.ok) {
				return {
					slackToken: response.access_token,
				};
			}
			throw new createError.BadRequest(response.message);
		} catch (e) {
			throw new createError.BadRequest('Could not authenticate with Slack');
		}
	}
}
