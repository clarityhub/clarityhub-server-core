import createError from 'http-errors';
import uuid from 'uuid/v4';

import Controller from '../../utilities/Controller';
import TagRepository from './TagRepository';
import defaultTags from './defaultTags';
import TagItemController from './TagItemController';

/**
 * Consistently create a color from strings
 * @param {*} s
 */
const getColor = (s) => {
	let hash = 0;
	for (let i = 0; i < s.length; i++) {
		// eslint-disable-next-line no-bitwise
		hash = s.charCodeAt(i) + ((hash << 5) - hash);
	}

	// eslint-disable-next-line no-bitwise
	const c = (hash & 0x00FFFFFF)
		.toString(16)
		.toUpperCase();

	return '00000'.substring(0, 6 - c.length) + c;
};

export default class TagController extends Controller {
	constructor(ioc) {
		super(ioc);

		this.repository = new TagRepository(ioc);
	}

	async createDefaultTags({ workspaceId, foundUser }) {
		return Promise.all(defaultTags.map(async (parentTag) => {
			const tag = await this.create({
				data: {
					tag: parentTag.tag,
					color: parentTag.color,
				},
				user: {
					currentWorkspaceId: workspaceId,
					userId: foundUser.userId,
				},
			});

			if (!parentTag.children) {
				return tag;
			}

			return Promise.all(parentTag.children.map((childTag) => {
				return this.create({
					data: {
						tag: childTag.tag,
						color: childTag.color,
						parentTagId: tag.tagId,
					},
					user: {
						currentWorkspaceId: workspaceId,
						userId: foundUser.userId,
					},
				});
			}));
		}));
	}

	getAll({ user, queryParams }) {
		if (queryParams && queryParams.parentTagId) {
			return this.repository.find({
				workspaceId: user.currentWorkspaceId,
				tagPath: {
					beginsWith: queryParams.parentTagId,
				},
			});
		}

		return this.repository.getRawModel().query({
			workspaceId: {
				eq: user.currentWorkspaceId,
			},
		}).where('createdAt').descending()
			.exec();
	}

	get({ id: tagPath, user }) {
		return this.repository.findOne({
			workspaceId: user.currentWorkspaceId,
			tagPath,
		});
	}

	/**
     * Only the tag name is required
     */
	async create({ data, user }) {
		const {
			tag,
			parentTagId = undefined,
			color = getColor(tag),
		} = data;

		if (!tag) {
			throw new createError.BadRequest('You cannot create an empty tag');
		}

		const tagId = uuid();
		const tagPath = [parentTagId, tagId].filter(Boolean).join(':');

		await this.ioc.LogEvent.log('tag.create', user.currentWorkspaceId, {
			userId: user.userId,
			tag,
			category: !parentTagId,
			color,
		});

		return this.repository.create({
			workspaceId: user.currentWorkspaceId,
			tagPath,
			tagId,
			tag,
			parentTagId,
			color,
		});
	}

	/**
     * Data can have a tag, color, or new parentTagId.
     *
     * Changing the parentTagId is a destructive action in the
     * database, but is relatively transparent to the frontend.
     */
	async update({ id: tagPath, data, user }) {
		const {
			tag,
			parentTagId = false,
			color,
		} = data;

		// Create update object
		const toUpdate = {};

		if (tag) {
			toUpdate.tag = tag;
		}
		if (color) {
			toUpdate.color = color;
		}

		if (parentTagId) {
			// You cannot update a key, so we must delete and then create
			// a new tag
			const deleted = await this.repository.delete({
				workspaceId: user.currentWorkspaceId,
				tagPath,
			});

			const newTagPath = [parentTagId, deleted.tagId].join(':');
			return this.repository.create({
				workspaceId: user.currentWorkspaceId,
				tagPath: newTagPath,
				tagId: deleted.tagId,
				parentTagId,
				tag,
				color,
				...toUpdate,
			});
		}

		return this.repository.update(toUpdate, {
			workspaceId: user.currentWorkspaceId,
			tagPath,
		});
	}

	async delete({ user, id: tagPath }) {
		const tagItemController = new TagItemController(this.ioc);

		// Get list of child tags
		const childTags = await this.repository.getRawModel().query({
			workspaceId: {
				eq: user.currentWorkspaceId,
			},
		}).where('tagPath')
			.beginsWith(`${tagPath}:`)
			.exec();

		const childTagsDeleted = await Promise.all(childTags.map((tag) => {
			return this.repository.delete({
				workspaceId: user.currentWorkspaceId,
				tagPath: tag.tagPath,
			});
		}));

		const tagItems = await tagItemController.deleteBeginsWith({ user, tagPath });

		const tag = await this.repository.delete({
			workspaceId: user.currentWorkspaceId,
			tagPath,
		});

		return {
			tagItems,
			tags: [tag, ...childTagsDeleted],
		};
	}
}
