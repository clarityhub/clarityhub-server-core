import createHttpError from 'http-errors';

const isMutation = (method) => {
	switch (method) {
	case 'POST':
	case 'PUT':
	case 'DELETE':
	case 'PATCH':
		return true;
	case 'GET':
	default:
		return false;
	}
};

export default () => {
	return {
		before({ event, context }, next) {
			const { workspaceStatus } = context.user;
			const { httpMethod } = event;

			if (!workspaceStatus && isMutation(httpMethod)) {
				throw new createHttpError.Unauthorized(
					'Your subscription has expired. Renew your subscription to continue using your workspace'
				);
			}

			next();
		},
	};
};
