
export default function getStripeContext() {
	return {
		async before({ event, context }) {
			context.user = {
				// Docs say it should be lowercase... but its not
				stripeSignature: event.headers['Stripe-Signature'] || event.headers['stripe-signature'],
				rawData: event.rawBody,
			};
		},
	};
}
