//#region src/plugins/username/schema.ts
const getSchema = (normalizer, includeDisplayUsername = true) => {
	const fields = {
		username: {
			type: "string",
			required: false,
			sortable: true,
			unique: true,
			returned: true,
			transform: { input(value) {
				return typeof value !== "string" ? value : normalizer.username(value);
			} }
		},
		displayUsername: {
			type: "string",
			required: false,
			transform: { input(value) {
				return typeof value !== "string" ? value : normalizer.displayUsername(value);
			} }
		}
	};
	return { user: { fields: includeDisplayUsername ? fields : { username: fields.username } } };
};
//#endregion
export { getSchema };
