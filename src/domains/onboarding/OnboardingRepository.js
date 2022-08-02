import DynamoRepository from '../../utilities/DynamoRepository';
import OnboardingSchema from './OnboardingSchema';

export default class OnboardingRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `Onboarding-${process.env.STAGE}`, OnboardingSchema);
	}
}
