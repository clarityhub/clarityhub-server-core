export default function httpSuccessHandler() {
	return {
		after(event, next) {
			if (!event.response) {
				// Assume a 404

				event.response = {
					statusCode: 404,
					body: JSON.stringify({
						error: 'Not found',
					}),
				};

				next();
				return;
			}

			event.response = {
				statusCode: 200,
				body: JSON.stringify(event.response),
			};

			next();
		},
	};
}
