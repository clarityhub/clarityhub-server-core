/* eslint-disable import/prefer-default-export */

/**
 * Like promise all, but doesn't fail if one promise fails.
 */
export const settled = function settled(promises) {
	const alwaysFulfilled = promises.map((p) => {
		return Promise.resolve(p).then((value) => {
			return { state: 'fulfilled', value };
		}, (reason) => {
			return { state: 'rejected', reason };
		});
	});
	return Promise.all(alwaysFulfilled);
};
