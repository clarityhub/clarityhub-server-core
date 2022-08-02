import dynamoose from 'dynamoose';

export default function Dynamoose(RawDynamoDB) {
	dynamoose.setDDB(RawDynamoDB);

	return dynamoose;
}
