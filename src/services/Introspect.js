import request from 'request-promise';

export default function Introspect() {
	return {
		async getSelfUrl() {
			if (process.env.IS_OFFLINE) {
				return request({ uri: 'http://localhost:4040/api/tunnels', json: true }).then((r) => {
					return r.tunnels[1].public_url;
				});
			}

			return process.env.SERVER_URI;
		},
	};
}
