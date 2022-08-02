export default class Noop {
	constructor(ioc) {
		this.ioc = ioc;
	}

	notify(integration, message) {
		console.log('Noop Integration notify was called', message);
		return {};
	}

	getTokens(data) {
		console.log('Noop Integration getTokens was called', data);
		return {};
	}
}
