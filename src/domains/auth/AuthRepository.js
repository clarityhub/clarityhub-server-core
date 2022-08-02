import DynamoRepository from '~/utilities/DynamoRepository';
import AuthSchema from './AuthSchema';

export default class AuthRepository extends DynamoRepository {
	constructor(ioc) {
		super(ioc, `Auth-${process.env.STAGE}`, AuthSchema);
	}
}
