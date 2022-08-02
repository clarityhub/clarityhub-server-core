import createError from 'http-errors';

import roles from '../roles';

export default (options) => {
	return {
		before({ context }, next) {
			if (options && options.rbac && options.rbac.resource) {
				if (!context.user) {
					throw new createError.Unauthorized('You don\'t have enough permission to perform this action');
				}
				const { role } = context.user;
				const { action, resource } = options.rbac;
				const permission = roles.can(role)[action](resource);

				if (!permission.granted) {
					throw new createError.Unauthorized('You don\'t have enough permission to perform this action');
				}
			}

			next();
		},
	};
};
