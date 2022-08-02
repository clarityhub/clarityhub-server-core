import uuid from 'uuid/v4';
import createError from 'http-errors';

import Controller from '../../utilities/Controller';
import WorkspaceRepository from './WorkspaceRepository';
import AuthRepository from '../auth/AuthRepository';
import UserWorkspaceRepository from './UserWorkspaceRepository';
import { ADMIN } from './Roles';
import TagController from '../tags/TagController';
import BillingService from '../billing/BillingService';

export default class WorkspaceController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new WorkspaceRepository(ioc);
		this.userWorkspaceRepository = new UserWorkspaceRepository(ioc);
		this.authRepository = new AuthRepository(ioc);
		this.tagController = new TagController(ioc);
		this.billingService = new BillingService(ioc);
	}

	async get({ user, id }) {
		if (user.currentWorkspaceId !== id) {
			throw createError.Unauthorized('Requested id did not match current workspace');
		}

		const workspaces = await this.repository.find({
			id,
		});

		if (!workspaces || workspaces.length === 0) {
			throw createError.NotFound('Could not find workspace');
		}

		return workspaces[0];
	}

	async getAll({ user }) {
		const users = await this.authRepository.find({
			email: user.email,
		});

		if (!users || users.length === 0) {
			throw new createError.Forbidden('Please sign up for an account before logging in');
		}

		const userWorkspaces = await this.userWorkspaceRepository.find({
			userId: users[0].userId,
		});

		if (userWorkspaces.length === 0) {
			return [];
		}

		return Promise.all(userWorkspaces.map(async (w) => {
			const workspaces = await this.repository.find({
				id: w.workspaceId,
			});

			return workspaces.length === 0 ? null : {
				...workspaces[0],
				role: w.role,
				status: w.status,
			};
		})).then((all) => {
			return all.filter(Boolean);
		});
	}

	async create({ user, data }) {
		const {
			email,
		} = user;

		// If user already exists, login
		const users = await this.authRepository.find({
			email,
		});

		if (!users || users.length === 0) {
			throw new createError.Forbidden('Please sign up for an account before logging in');
		}

		const foundUser = users[0];

		const workspace = await this.repository.create({
			...data,
			creatorId: foundUser.userId,
			id: uuid(),
		});

		await this.userWorkspaceRepository.create({
			workspaceId: workspace.id,
			userId: foundUser.userId,
			role: ADMIN,
		});

		await this.tagController.createDefaultTags({
			workspaceId: workspace.id,
			foundUser,
		});

		await this.billingService.createCustomer({
			workspaceId: workspace.id,
			user,
		});

		await this.ioc.LogEvent.log('workspace.create', workspace.id, { userId: foundUser.userId });

		return workspace;
	}

	async update({ user, id, data }) {
		if (user.currentWorkspaceId !== id) {
			throw createError.Unauthorized('Requested id did not match current workspace');
		}

		const workspaces = await this.repository.find({
			id,
		});

		return this.repository.update(data, {
			id: workspaces[0].id,
			creatorId: workspaces[0].creatorId,
		});
	}

	async delete({ user, id }) {
		if (user.currentWorkspaceId !== id) {
			throw createError.Unauthorized('Requested id did not match current workspace');
		}

		const workspaces = await this.repository.find({
			id,
		});

		// Delete all workspace data

		// UserWorkspaces
		const userWorkspaces = await this.userWorkspaceRepository.findWhere({
			workspaceId: user.currentWorkspaceId,
		});

		await Promise.all(userWorkspaces.map((uw) => {
			return this.userWorkspaceRepository.delete({
				userId: uw.userId,
				workspaceId: uw.workspaceId,
			});
		}));

		// TODO Interviews
		// TODO Media

		// Delete subscription
		await this.billingService.deleteSubscription({ user });

		return this.repository.delete({
			id: workspaces[0].id,
			creatorId: workspaces[0].creatorId,
		});
	}
}
