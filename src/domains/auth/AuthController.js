import createError from 'http-errors';
import uuid from 'uuid/v4';
import Controller from '~/utilities/Controller';
import WorkspaceRepository from '~/domains/workspaces/WorkspaceRepository';
import UserWorkspaceRepository from '~/domains/workspaces/UserWorkspaceRepository';
import { INVITED, ACCEPTED } from '~/domains/workspaces/InviteStatus';
import BillingService from '../billing/BillingService';

import { BANNED } from './UserStatus';
import AuthRepository from './AuthRepository';

const getAuthFromSub = (sub) => {
	const [authProvider, authToken] = sub.split('|');
	return { authProvider, authToken };
};

export default class AuthController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new AuthRepository(ioc);
		this.workspaceRepository = new WorkspaceRepository(ioc);
		this.userWorkspaceRepository = new UserWorkspaceRepository(ioc);
		this.billingService = new BillingService(ioc);
	}

	async createUser({ user }) {
		try {
			const {
				email,
				name,
				picture,
				locale,
				email_verified,
				sub,
			} = user;
			const { authProvider, authToken } = getAuthFromSub(sub);

			const createdUser = await this.repository.create({
				email,
				userId: uuid(),
				knownProviders: [{
					authProvider,
					authToken,
				}],
				metadata: {
					email,
					name,
					avatars: {
						default: picture,
					},
					locale,
					emailVerified: email_verified,
				},
			});

			await this.ioc.LogEvent.log('user.signup', email, { authProvider });

			await this.ioc.Mailchimp.addSubscriber(
				email,
				{
					drip: true,
				}
			);

			return createdUser;
		} catch (e) {
			this.ioc.Logger.error(e);
			throw e;
		}
	}

	async updateUser({ foundUser, user }) {
		try {
			const {
				email,
				name,
				picture,
				locale,
				email_verified,
				sub,
			} = user;
			const { authProvider, authToken } = getAuthFromSub(sub);

			const updatedUser = await this.repository.update({
				knownProviders: [{
					authProvider,
					authToken,
				}],
				metadata: {
					email,
					name,
					avatars: {
						default: picture,
					},
					locale,
					emailVerified: email_verified,
				},
			}, {
				email,
				userId: foundUser.userId,
			});

			return updatedUser;
		} catch (e) {
			this.ioc.Logger.error(e);
			throw e;
		}
	}

	async updateMeta({ user, data }) {
		const {
			metadata,
		} = data;

		const workspaceUser = await this.repository.findOne({
			userId: user.userId,
			email: user.email,
		});

		const mergedMeta = {
			...workspaceUser.metadata,
			...metadata,
		};

		return this.repository.update({
			metadata: mergedMeta,
		}, {
			userId: user.userId,
			email: user.email,
		});
	}

	async loginUser({ user }) {
		const {
			email,
		} = user;

		// If user already exists, login
		const foundUser = await this.repository.find({
			email,
		});

		if (!foundUser || foundUser.length === 0) {
			await this.createUser({ user });
		} else if (foundUser.metadata === null) {
			// If someone was invited, they will not have any meta data
			await this.updateUser({ foundUser, user });
		}

		return {
			result: 'success',
		};
	}

	async _getUserData({ email, workspaceId }) {
		const users = await this.repository.find({
			email,
		});

		if (!users || users.length === 0) {
			throw new createError.Forbidden('Please sign up for an account before logging in');
		}

		const foundUser = users[0];

		if (foundUser.status === BANNED) {
			throw new createError.Forbidden('You\'re account has been deactivated, please reach out to support to reactivate your account.');
		}

		const userWorkspace = await this.userWorkspaceRepository.findOne({
			userId: foundUser.userId,
			workspaceId,
		});

		if (!userWorkspace) {
			throw new createError.Forbidden('Unable to access workspace');
		}

		// MIGRATION: Make sure the user workspace has an email in it
		if (!userWorkspace.email) {
			await this.userWorkspaceRepository.update({
				email,
			}, {
				userId: foundUser.userId,
				workspaceId,
			});
		}

		const foundWorkspaces = await this.workspaceRepository.find({
			id: workspaceId,
		});

		if (!foundWorkspaces || foundWorkspaces.length === 0) {
			throw new createError.Forbidden('Unable to access workspace');
		}

		return {
			foundUser,
			userWorkspace,
		};
	}

	async _updateUserWorkspaceInvite({ email, userWorkspace }) {
		return this.userWorkspaceRepository.update({
			status: ACCEPTED,
			email,
		}, {
			userId: userWorkspace.userId,
			workspaceId: userWorkspace.workspaceId,
		});
	}

	async loginWorkspace({ user, data }) {
		const {
			email,
		} = user;

		const { foundUser, userWorkspace } = await this._getUserData({
			email,
			workspaceId: data.workspaceId,
		});

		if (!userWorkspace.status || userWorkspace.status === INVITED || !userWorkspace.email) {
			// Update the status
			await this._updateUserWorkspaceInvite({
				email,
				userWorkspace,
			});


			await this.ioc.Notify.publish('member.joined', {
				workspaceId: userWorkspace.workspaceId,
				itemId: email,
				itemType: 'member',
				itemPreview: foundUser.metadata || { email: foundUser.email },
				action: 'member.joined',
			});
		}
		const workspaceStatus = await this.billingService.getWorkspaceStatus({
			workspaceId: userWorkspace.workspaceId,
		});

		const accessToken = await this.ioc.JWT.selfSign({
			...foundUser.metadata,
			userId: foundUser.userId,
			email: foundUser.email,
			workspaceId: data.workspaceId,
			role: userWorkspace.role,
			workspaceStatus,
		});

		const refreshToken = await this.ioc.JWT.refreshToken({
			email: foundUser.email,
			userId: foundUser.userId,
			workspaceId: data.workspaceId,
		});

		await this.ioc.LogEvent.log('user.loginWorkspace', email, { workspaceId: data.workspaceId });

		return {
			result: 'success',
			accessToken,
			refreshToken,
		};
	}

	async refresh({ user }) {
		const {
			email,
			currentWorkspaceId: workspaceId,
		} = user;

		const { foundUser, userWorkspace } = await this._getUserData({
			email,
			workspaceId,
		});

		const workspaceStatus = await this.billingService.getWorkspaceStatus({ workspaceId });

		const accessToken = await this.ioc.JWT.selfSign({
			...foundUser.metadata,
			userId: foundUser.userId,
			workspaceId,
			role: userWorkspace.role,
			workspaceStatus,
		});

		return {
			result: 'success',
			accessToken,
		};
	}
}
