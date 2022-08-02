import AuthService from '../domains/auth/AuthService';

let service;

export default function (container) {
	if (!service) {
		service = new AuthService(container);
	}

	return service;
}
