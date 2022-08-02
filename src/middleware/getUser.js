import createError from 'http-errors';

export default function getUser() {
	return {
		async before({ event, context }) {
			const authHeader = event.headers.Authorization;

			if (!authHeader) {
				throw new createError.BadRequest('Missing Authorization header');
			}

			const token = authHeader.split(' ')[1];

			// XXX If incorrect header fail
			// Only self-signed JWT tokens are valid (not Auth0 tokens)

			try {
				const claims = await context.bottle.container.JWT.selfDecode(token);

				// context.bottle.container.Logger.info('[getUser Middleware]', claims);

				context.user = {
					email: claims.email,
					userId: claims.userId,
					currentWorkspaceId: claims.workspaceId,
					role: claims.role,
					workspaceStatus: claims.workspaceStatus,
				};
			} catch (e) {
				if (e.message === 'invalid algorithm') {
					throw new createError.Unauthorized('Invalid algorithm');
				}

				if (e.message === 'jwt expired') {
					throw new createError.Unauthorized('Expired token');
				}

				throw e;
			}
		},
	};
}
