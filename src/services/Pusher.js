import Pusher from 'pusher';

export default function PusherService() {
	const channels_client = new Pusher({
		appId: '',
		key: '',
		secret: '',
		cluster: 'us2',
		encrypted: true,
	});

	return channels_client;
}
