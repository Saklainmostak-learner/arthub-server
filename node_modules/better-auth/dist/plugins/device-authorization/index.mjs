import { mergeSchema } from "../../db/schema.mjs";
import { ms } from "../../utils/time.mjs";
import { PACKAGE_VERSION } from "../../version.mjs";
import { DEVICE_AUTHORIZATION_ERROR_CODES } from "./error-codes.mjs";
import { schema } from "./schema.mjs";
import { deviceApprove, deviceCode, deviceDeny, deviceToken, deviceVerify, redeemDeviceCode } from "./routes.mjs";
import { BetterAuthError } from "@better-auth/core/error";
import * as z from "zod";
//#region src/plugins/device-authorization/index.ts
const timeStringSchema = z.custom((val) => {
	if (typeof val !== "string") return false;
	try {
		ms(val);
		return true;
	} catch {
		return false;
	}
}, { message: "Invalid time string format. Use formats like '30m', '5s', '1h', etc." });
const deviceAuthorizationOptionsSchema = z.object({
	expiresIn: timeStringSchema.default("30m").describe("Time in seconds until the device code expires. Use formats like '30m', '5s', '1h', etc."),
	interval: timeStringSchema.default("5s").describe("Time in seconds between polling attempts. Use formats like '30m', '5s', '1h', etc."),
	deviceCodeLength: z.number().int().positive().max(191).default(40).describe(`Length of the device code to be generated. Must be at most 191 characters. Default is 40 characters.`),
	userCodeLength: z.number().int().positive().max(191).default(8).describe(`Length of the user code to be generated. Must be at most 191 characters. Default is 8 characters.`),
	generateDeviceCode: z.custom((val) => typeof val === "function", { message: "generateDeviceCode must be a function that returns a string or a promise that resolves to a string." }).optional().describe("Function to generate a device code. If not provided, a default random string generator will be used."),
	generateUserCode: z.custom((val) => typeof val === "function", { message: "generateUserCode must be a function that returns a string or a promise that resolves to a string." }).optional().describe("Function to generate a user code. If not provided, a default random string generator will be used."),
	validateClient: z.custom((val) => typeof val === "function", { message: "validateClient must be a function that returns a boolean or a promise that resolves to a boolean." }).optional().describe("Function to validate the client ID. If not provided, no validation will be performed."),
	onDeviceAuthRequest: z.custom((val) => typeof val === "function", { message: "onDeviceAuthRequest must be a function that returns void or a promise that resolves to void." }).optional().describe("Function to handle device authorization requests. If not provided, no additional actions will be taken."),
	verificationUri: z.string().optional().describe("The URI where users verify their device code. Can be an absolute URL (https://example.com/device) or relative path (/custom-path). This will be returned as verification_uri in the device code response. If not provided, defaults to /device."),
	schema: z.custom(() => true).optional()
});
const deviceAuthorizationRequestFields = new Set([
	"client_id",
	"user_id",
	"scope"
]);
const deviceVerificationResponseFields = new Set([
	"user_code",
	"status",
	"client_id",
	"scope"
]);
function assertGrantFieldsAreAdditional(grant) {
	const conflictingDeviceCodeFields = Object.keys(grant?.deviceCodeSchemaFields ?? {}).filter((field) => field in schema.deviceCode.fields);
	if (conflictingDeviceCodeFields.length > 0) throw new BetterAuthError(`Device authorization grant fields must be additional and cannot redefine deviceCode fields: ${conflictingDeviceCodeFields.join(", ")}`);
	const conflictingRequestFields = Object.keys(grant?.requestSchemaFields ?? {}).filter((field) => deviceAuthorizationRequestFields.has(field));
	if (conflictingRequestFields.length > 0) throw new BetterAuthError(`Device authorization grant request fields must be additional and cannot redefine request fields: ${conflictingRequestFields.join(", ")}`);
	const conflictingVerificationFields = Object.keys(grant?.verificationOpenAPIProperties ?? {}).filter((field) => deviceVerificationResponseFields.has(field));
	if (conflictingVerificationFields.length > 0) throw new BetterAuthError(`Device authorization grant verification fields must be additional and cannot redefine response fields: ${conflictingVerificationFields.join(", ")}`);
}
const deviceAuthorization = (options = {}) => {
	const { grant: configuredGrant, ...deviceAuthorizationOptions } = options;
	const grant = configuredGrant;
	const opts = deviceAuthorizationOptionsSchema.parse(deviceAuthorizationOptions);
	assertGrantFieldsAreAdditional(grant);
	return {
		id: "device-authorization",
		version: PACKAGE_VERSION,
		schema: mergeSchema({ deviceCode: {
			...schema.deviceCode,
			fields: {
				...schema.deviceCode.fields,
				...grant?.deviceCodeSchemaFields
			}
		} }, options.schema),
		endpoints: {
			deviceCode: deviceCode(opts, grant),
			deviceToken: deviceToken(opts, grant),
			deviceVerify: deviceVerify(grant),
			deviceApprove,
			deviceDeny
		},
		rateLimit: [{
			pathMatcher(path) {
				return path === "/device";
			},
			window: ms(opts.expiresIn) / 1e3,
			max: 5
		}],
		$ERROR_CODES: DEVICE_AUTHORIZATION_ERROR_CODES,
		options: {
			...opts,
			grant
		}
	};
};
//#endregion
export { deviceAuthorization, deviceAuthorizationOptionsSchema, redeemDeviceCode };
