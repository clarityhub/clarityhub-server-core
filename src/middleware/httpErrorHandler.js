export default function httpErrorHandler(opts) {
	const defaults = {
		logger: console.error,
	};

	const options = Object.assign({}, defaults, opts);

	return ({
		onError: (handler, next) => {
			// if there are a `statusCode` and an `error` field
			// this is a valid http error object

			options.logger(handler.error);

			if (handler.error.statusCode && handler.error.message) {
				if (typeof options.logger === 'function') {
					options.logger(handler.error);
				}

				handler.response = {
					statusCode: handler.error.statusCode,
					body: handler.error.body || JSON.stringify({
						message: handler.error.message,
						details: handler.error.details,
					}),
				};

				return next();
			}

			handler.response = {
				statusCode: 500,
				body: JSON.stringify({
					message: 'Something bad happened',
				}),
			};

			return next();
		},
	});
}
