// import request from 'request-promise';
import twilio from 'twilio';

// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const client = twilio(process.env.TWILIO_KEY, process.env.TWILIO_SECRET, {
	accountSid: process.env.TWILIO_SID,
});
const { AccessToken } = twilio.jwt;
const { VideoGrant } = AccessToken;

class Twilio {
	constructor(container) {
		this.ioc = container;
	}

	async getStatusCallbackUrl() {
		const url = await this.ioc.Introspect.getSelfUrl();

		return `${url}/webhooks/twilio`;
	}

	/**
     *
     * @param {*} name
     */
	async createRoom(name) {
		try {
			const url = await this.getStatusCallbackUrl();
			const response = await client.video.rooms.create({
				recordParticipantsOnConnect: true,
				statusCallback: url,
				statusCallbackMethod: 'POST',
				type: 'group-small',
				uniqueName: name,
			});
			return response;
		} catch (e) {
			console.log(e);
			return this.getRoom(name);
		}
	}

	createToken(identity, room) {
		const token = new AccessToken(
			process.env.TWILIO_SID,
			process.env.TWILIO_KEY,
			process.env.TWILIO_SECRET
		);

		token.identity = identity;

		// Grant the access token Twilio Video capabilities
		const grant = new VideoGrant({ room });
		token.addGrant(grant);

		// Serialize the token to a JWT string
		return token.toJwt();
	}

	/**
     * Use the RoomSid since the room may no longer be in progress.
     * Getting a room but it's name is only supported for in progress rooms
     */
	getRoom(RoomSid) {
		return client.video.rooms(RoomSid).fetch();
	}

	completeRoom(RoomSid) {
		return client.video.rooms(RoomSid).update({ status: 'completed' });
	}
}

export default function twilioService(container) {
	return new Twilio(container);
}
