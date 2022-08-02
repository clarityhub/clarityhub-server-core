export default function bodyParser() {
	return {
		before({ event }, next) {
			try {
				event.rawBody = event.body;
				event.body = JSON.parse(event.body);
			} catch (_) {
				// Do nothing
			}

			next();
		},
	};
}
