import Repository from './Repository';

// const constraintsToConditions = (constraints) => {
// 	const conditions = [];
// 	const conditionNames = {};
// 	const conditionValues = {};

// 	Object.keys(constraints).forEach((key) => {
// 		const value = constraints[key];

// 		conditions.push(`#${key} = :${key}`);
// 		conditionNames[key] = key;
// 		conditionValues[key] = value;
// 	});

// 	return {
// 		condition: conditions.join(' and '),
// 		conditionNames,
// 		conditionValues,
// 	};
// };

export default class DynamoRepository extends Repository {
	constructor(ioc, modelName, schema) {
		super(ioc);

		this.schema = new ioc.Dynamoose.Schema(schema.schema, schema.options);
		this.model = ioc.Dynamoose.model(modelName, this.schema);
	}

	getRawModel() {
		return this.model;
	}

	findOne(constraints) {
		return this.model.get(constraints);
	}

	find(constraints) {
		return this.model.query(constraints).exec();
	}

	findWhere(constraints) {
		return this.model.scan(constraints).exec();
	}

	create(data) {
		return this.model.create(data);
	}

	put(data) {
		const item = new this.model(data); // eslint-disable-line new-cap

		return item.save();
	}

	update(data, constraints) {
		return this.model.update(constraints, data);
	}

	delete(constraints, options = {}) {
		return this.model.delete(constraints, options);
	}
}
