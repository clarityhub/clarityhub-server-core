
const merge = (defaults, values) => {
	// convert to and from string to remove undefined/null values
	return Object.assign({}, defaults, JSON.parse(JSON.stringify(values)));
};

export default merge;
