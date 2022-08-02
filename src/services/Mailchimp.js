import Mailchimp from 'mailchimp-api-v3';
import md5 from 'md5';

function getSubscriberHash(email) {
	return md5(email.toLowerCase());
}

export default function mailchimpService() {
	const mailchimp = new Mailchimp(process.env.MAILCHIMP_API_KEY);

	return {
		addSubscriber(emailAddress, options = {}) {
			const hash = getSubscriberHash(emailAddress);
			return mailchimp.put(`/lists/${process.env.MAILCHIMP_AUDIENCE_ID}/members/${hash}`, {
				email_address: emailAddress,
				status_if_new: 'subscribed',
				merge_fields: {
					REASON: 'Persato',
				},
			}).then(() => {
				return mailchimp.post(`/lists/${process.env.MAILCHIMP_AUDIENCE_ID}/members/${hash}/tags`, {
					tags: [{
						name: 'Persato',
						status: 'active',
					}, options.drip ? {
						name: 'Drip',
						status: 'active',
					} : false].filter(Boolean),
				});
			}).catch((error) => {
				// XXX report error
				console.error(error);
			});
		},
	};
}
