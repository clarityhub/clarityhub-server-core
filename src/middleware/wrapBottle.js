import { createBottle, bootstrapBottle } from '../services';

export default function wrapBottle() {
	return {
		async before({ context }) {
			const bottle = createBottle();

			await bootstrapBottle(bottle);

			context.bottle = bottle;
			context.ioc = () => { return context.bottle.container; };
		},
	};
}
