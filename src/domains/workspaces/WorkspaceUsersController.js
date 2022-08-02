import uuid from 'uuid/v4';
import createError from 'http-errors';

import Controller from '../../utilities/Controller';
import WorkspaceRepository from './WorkspaceRepository';
import AuthRepository from '../auth/AuthRepository';
import BillingService from '../billing/BillingService';
import UserWorkspaceRepository from './UserWorkspaceRepository';
import { MEMBER, ADMIN } from './Roles';
import { INVITED } from './InviteStatus';

export default class WorkspaceController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new WorkspaceRepository(ioc);
		this.userWorkspaceRepository = new UserWorkspaceRepository(ioc);
		this.authRepository = new AuthRepository(ioc);
		this.billingService = new BillingService(ioc);
	}

	async get({ user, id }) {
		const workspaceUser = await this.userWorkspaceRepository.findOne({
			userId: id,
			workspaceId: user.currentWorkspaceId,
		});

		const u = await this.authRepository.findOne({
			userId: workspaceUser.userId,
			email: workspaceUser.email,
		}) || {};

		return {
			...workspaceUser,
			metadata: u.metadata,
		};
	}

	async getAll({ user }) {
		const workspaceUsers = await this.userWorkspaceRepository.findWhere({
			workspaceId: user.currentWorkspaceId,
		});

		// Map to all users
		return Promise.all(workspaceUsers.map(async (workspaceUser) => {
			const u = await this.authRepository.findOne({
				userId: workspaceUser.userId,
				email: workspaceUser.email,
			}) || {};

			return {
				...workspaceUser,
				metadata: u.metadata,
			};
		}));
	}

	async getMe({ user }) {
		const workspaceUser = await this.userWorkspaceRepository.findOne({
			userId: user.userId,
			workspaceId: user.currentWorkspaceId,
		});

		if (!workspaceUser) {
			throw new createError.Forbidden('You do not have access to the workspace you are logging into');
		}

		const u = await this.authRepository.findOne({
			userId: workspaceUser.userId,
			email: workspaceUser.email,
		}) || {};

		return {
			...workspaceUser,
			metadata: u.metadata,
		};
	}

	_sendInvite({ email }) {
		// resend email
		return this.ioc.SES.sendEmail({
			Destination: {
				ToAddresses: [email],
			},
			Message: {
				Body: {
					Text: {
						Data: 'Hello!\n\nYou\'ve been invited to join a workspace on Clarity Hub.\n\nTo join the workspace, just login at https://dashboard.clarityhub.io/auth/login.\n\nLooking forward to seeing the amazing things you build with Clarity Hub.\n\nThe Clarity Hub Team',
					},

				},

				Subject: {
					Data: 'You\'ve been invited to join a workspace on Clarity Hub!',
				},
			},
			Source: 'Clarity Hub Team <support@clarityhub.io>',
		});
	}

	async invite({ user, data }) {
		const {
			email,
			role = MEMBER,
		} = data;

		// XXX validate email
		if (!email) {
			throw createError.BadRequest('An email is required');
		}

		// check if invite already exists
		const workspaceUsers = await this.userWorkspaceRepository.findWhere({
			workspaceId: user.currentWorkspaceId,
			email,
		});

		if (workspaceUsers && workspaceUsers.length > 0) {
			throw new createError.BadRequest('User has already been invited to workspace');
		}

		// check if user exists by email
		const users = await this.authRepository.find({
			email,
		});

		let foundUser = null;
		if (!users || users.length === 0) {
			// We need to make the user
			foundUser = await this.authRepository.create({
				email,
				userId: uuid(),
			});
		} else {
			[foundUser] = users;
		}

		// Add user to workspace
		const workspaceUser = await this.userWorkspaceRepository.create({
			workspaceId: user.currentWorkspaceId,
			userId: foundUser.userId,
			email,
			role,
			invitedAt: new Date().toISOString(),
			status: INVITED,
		});

		await this.billingService.addSeat({
			workspaceId: user.currentWorkspaceId,
		});
		await this._sendInvite({ email });

		return {
			...workspaceUser,
			metadata: foundUser.metadata,
		};
	}

	async resendInvite({ id, user }) {
		// check if invite already exists
		const workspaceUser = await this.userWorkspaceRepository.findOne({
			workspaceId: user.currentWorkspaceId,
			userId: id,
		});

		if (!workspaceUser) {
			throw new createError.BadRequest('User has not been invited to this workspace yet');
		}

		this._sendInvite({ email: workspaceUser.email });

		return this.userWorkspaceRepository.update({
			invitedAt: new Date().toISOString(),
		}, {
			userId: id,
			workspaceId: user.currentWorkspaceId,
		});
	}

	async kick({ id, user }) {
		await this.billingService.removeSeat({
			workspaceId: user.currentWorkspaceId,
		});

		return this.userWorkspaceRepository.delete({
			userId: id,
			workspaceId: user.currentWorkspaceId,
		});
	}

	async update({ id, user, data }) {
		const {
			role,
		} = data;

		if (role !== ADMIN) {
			// Check if there will be other admins in the workspace
			const workspaceUsers = await this.userWorkspaceRepository.findWhere({
				workspaceId: user.currentWorkspaceId,
				role: ADMIN,
			});

			const left = workspaceUsers.filter((workspaceUser) => {
				return workspaceUser.userId !== id;
			});

			if (left.length === 0) {
				throw new createError.BadRequest('Your workspace must have at least 1 admin');
			}
		}

		return this.userWorkspaceRepository.update({
			role,
		}, {
			userId: id,
			workspaceId: user.currentWorkspaceId,
		});
	}

	async leave({ user }) {
		// Check if there are other admins in the workspace
		const workspaceUsers = await this.userWorkspaceRepository.findWhere({
			workspaceId: user.currentWorkspaceId,
			role: ADMIN,
		});

		if (workspaceUsers.length <= 1) {
			throw new createError.BadRequest('You cannot leave a workspace if you are the last admin');
		}

		return this.userWorkspaceRepository.delete({
			userId: user.userId,
			workspaceId: user.currentWorkspaceId,
		});
	}
}
