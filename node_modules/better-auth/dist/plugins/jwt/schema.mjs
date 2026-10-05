//#region src/plugins/jwt/schema.ts
const schema = { jwks: { fields: {
	publicKey: {
		type: "string",
		required: true
	},
	privateKey: {
		type: "string",
		required: true
	},
	createdAt: {
		type: "date",
		required: true
	},
	expiresAt: {
		type: "date",
		required: false
	},
	alg: {
		type: "string",
		required: false
	},
	crv: {
		type: "string",
		required: false
	}
} } };
//#endregion
export { schema };
