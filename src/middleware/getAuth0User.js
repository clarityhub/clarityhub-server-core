export default function getUser() {
	return {
		async before({ event, context }) {
			const authHeader = event.headers.Authorization;

			const token = authHeader.split(' ')[1];

			// XXX If no header, fail
			// XXX If incorrect header fail

			const claims = await context.bottle.container.JWT.auth0Decode(token);

			context.user = claims;
		},
	};
}
