import { ms } from "../../utils/time.mjs";
import { generateRandomString } from "../../crypto/random.mjs";
import { getSessionFromCtx } from "../../api/routes/session.mjs";
import { DEVICE_AUTHORIZATION_ERROR_CODES } from "./error-codes.mjs";
import { APIError } from "@better-auth/core/error";
import { createAuthEndpoint } from "@better-auth/core/api";
import * as z from "zod";
//#region src/plugins/device-authorization/routes.ts
const defaultCharset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_DEVICE_CODE_GENERATION_ATTEMPTS = 3;
const UNIQUE_CONSTRAINT_ERROR_IDENTIFIERS = new Set([
	"11000",
	"1062",
	"2067",
	"23505",
	"2601",
	"2627",
	"ER_DUP_ENTRY",
	"P2002",
	"SQLITE_CONSTRAINT_UNIQUE"
]);
function isUniqueConstraintError(error) {
	if (typeof error !== "object" || error === null) return false;
	const details = error;
	if ([
		details.code,
		details.errcode,
		details.errno,
		details.number
	].some((identifier) => UNIQUE_CONSTRAINT_ERROR_IDENTIFIERS.has(String(identifier)))) return true;
	const message = details.message;
	return typeof message === "string" && /unique(?: key)? constraint|duplicate (?:entry|key)|e11000/i.test(message);
}
const defaultUserCodePattern = new RegExp(`^[${defaultCharset}]+$`, "i");
function validateGeneratedCode(code, label) {
	if (typeof code !== "string") throw new APIError("BAD_REQUEST", {
		error: "invalid_request",
		error_description: `Generated ${label} code must be a string`
	});
	if (Array.from(code).length > 191) throw new APIError("BAD_REQUEST", {
		error: "invalid_request",
		error_description: `Generated ${label} code must be at most 191 characters`
	});
	return code;
}
function normalizeUserCode(userCode) {
	return userCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}
/**
* Preserve exact custom user codes, and normalize only default-alphabet codes.
*/
async function findDeviceCodeByUserCode(ctx, userCode) {
	const findByUserCode = async (value) => {
		const deviceCode = await ctx.context.adapter.findOne({
			model: "deviceCode",
			where: [{
				field: "userCode",
				value
			}]
		});
		return deviceCode?.userCode === value ? deviceCode : null;
	};
	const exactDeviceCode = await findByUserCode(userCode);
	if (exactDeviceCode) return exactDeviceCode;
	const normalizedUserCode = normalizeUserCode(userCode);
	if (normalizedUserCode === userCode || !defaultUserCodePattern.test(normalizedUserCode)) return exactDeviceCode;
	return findByUserCode(normalizedUserCode);
}
const deviceCodeBodySchema = z.object({
	client_id: z.string().meta({ description: "The client ID of the application" }),
	user_id: z.string().meta({ description: "The user ID to which the device code should be pre-bound." }).optional(),
	scope: z.string().meta({ description: "Space-separated list of scopes" }).optional()
});
const deviceCodeBaseErrorCodes = [
	"invalid_request",
	"invalid_client",
	"unauthorized_client",
	"invalid_scope"
];
const deviceAuthorizationBaseRequestFields = [
	"client_id",
	"user_id",
	"scope"
];
async function normalizeDeviceAuthorizationBaseRequestParameters(request, body) {
	for (const field of deviceAuthorizationBaseRequestFields) if (body[field] === "") body[field] = void 0;
	const contentType = request?.headers.get("content-type")?.toLowerCase() ?? "";
	if (!request || !contentType.includes("application/x-www-form-urlencoded")) return;
	const params = new URLSearchParams(await request.clone().text());
	for (const field of deviceAuthorizationBaseRequestFields) {
		const effectiveValues = params.getAll(field).filter((value) => value.length > 0);
		if (effectiveValues.length > 1) throw new APIError("BAD_REQUEST", {
			error: "invalid_request",
			error_description: `${field} must not be repeated`
		});
		if (effectiveValues.length === 0) body[field] = void 0;
		else body[field] = effectiveValues[0];
	}
}
const deviceCode = (opts, grant) => {
	const generateDeviceCode = async () => {
		return validateGeneratedCode(opts.generateDeviceCode ? await opts.generateDeviceCode() : defaultGenerateDeviceCode(opts.deviceCodeLength), "device");
	};
	const generateUserCode = async () => {
		return validateGeneratedCode(opts.generateUserCode ? await opts.generateUserCode() : defaultGenerateUserCode(opts.userCodeLength), "user");
	};
	const requestFields = grant?.requestSchemaFields ?? {};
	const requestSchema = (grant ? deviceCodeBodySchema.extend({ client_id: z.string().optional() }) : deviceCodeBodySchema).extend(requestFields);
	const requestErrorCodes = [...deviceCodeBaseErrorCodes, ...grant?.requestErrorCodes ?? []];
	const endpointErrorCodes = [...requestErrorCodes, "server_error"];
	return createAuthEndpoint("/device/code", {
		method: "POST",
		cloneRequest: true,
		body: requestSchema,
		error: z.object({
			error: z.enum(endpointErrorCodes).meta({ description: "Error code" }),
			error_description: z.string().meta({ description: "Detailed error description" })
		}),
		onValidationError: ({ issues, message }) => {
			grant?.onRequestValidationError?.(issues);
			throw new APIError("BAD_REQUEST", {
				error: "invalid_request",
				error_description: message
			});
		},
		metadata: {
			noStore: true,
			allowedMediaTypes: ["application/json", "application/x-www-form-urlencoded"],
			openapi: {
				description: `Request a device and user code

Follow [rfc8628#section-3.2](https://datatracker.ietf.org/doc/html/rfc8628#section-3.2)`,
				responses: {
					...grant?.requestOpenAPIResponses,
					200: {
						description: "Success",
						content: { "application/json": { schema: {
							type: "object",
							properties: {
								device_code: {
									type: "string",
									description: "The device verification code"
								},
								user_code: {
									type: "string",
									description: "The user code to display"
								},
								verification_uri: {
									type: "string",
									format: "uri",
									description: "The URL for user verification. Defaults to /device if not configured."
								},
								verification_uri_complete: {
									type: "string",
									format: "uri",
									description: "The complete URL with user code as query parameter."
								},
								expires_in: {
									type: "number",
									description: "Lifetime in seconds of the device code"
								},
								interval: {
									type: "number",
									description: "Minimum polling interval in seconds"
								}
							}
						} } }
					},
					400: {
						description: "Error response",
						content: { "application/json": { schema: {
							type: "object",
							properties: {
								error: {
									type: "string",
									enum: requestErrorCodes
								},
								error_description: { type: "string" }
							}
						} } }
					},
					500: {
						description: "Server error",
						content: { "application/json": { schema: {
							type: "object",
							properties: {
								error: {
									type: "string",
									enum: ["server_error"]
								},
								error_description: { type: "string" }
							}
						} } }
					}
				}
			}
		}
	}, async (ctx) => {
		const request = ctx.body;
		await normalizeDeviceAuthorizationBaseRequestParameters(ctx.request, request);
		const grantAuthorization = grant ? await grant.authorizeRequest({
			ctx,
			request
		}) : void 0;
		const clientId = grantAuthorization?.clientId ?? request.client_id;
		if (!grantAuthorization) {
			if (!request.client_id) throw new APIError("BAD_REQUEST", {
				error: "invalid_request",
				error_description: "client_id is required"
			});
			if (!opts.validateClient) {
				if (grant) throw new APIError("BAD_REQUEST", {
					error: "invalid_client",
					error_description: "Invalid client ID"
				});
			} else if (!await opts.validateClient(request.client_id)) throw new APIError("BAD_REQUEST", {
				error: "invalid_client",
				error_description: "Invalid client ID"
			});
		}
		if (!clientId) throw new APIError("BAD_REQUEST", {
			error: "invalid_request",
			error_description: "client_id is required"
		});
		if (opts.onDeviceAuthRequest) await opts.onDeviceAuthRequest(clientId, request.scope);
		const expiresIn = ms(opts.expiresIn);
		const expiresAt = new Date(Date.now() + expiresIn);
		for (let attempt = 0; attempt < MAX_DEVICE_CODE_GENERATION_ATTEMPTS; attempt++) {
			const deviceCode = await generateDeviceCode();
			const userCode = await generateUserCode();
			try {
				await ctx.context.adapter.create({
					model: "deviceCode",
					data: {
						...grantAuthorization?.deviceCodeFields,
						deviceCode,
						userCode,
						userId: request.user_id || null,
						expiresAt,
						status: "pending",
						pollingInterval: ms(opts.interval),
						clientId,
						scope: request.scope
					}
				});
			} catch (error) {
				if (!isUniqueConstraintError(error)) throw error;
				continue;
			}
			const { verificationUri, verificationUriComplete } = buildVerificationUris(opts.verificationUri, ctx.context.baseURL, userCode);
			ctx.setHeader("Cache-Control", "no-store");
			ctx.setHeader("Pragma", "no-cache");
			return ctx.json({
				device_code: deviceCode,
				user_code: userCode,
				verification_uri: verificationUri,
				verification_uri_complete: verificationUriComplete,
				expires_in: Math.floor(expiresIn / 1e3),
				interval: Math.floor(ms(opts.interval) / 1e3)
			});
		}
		throw new APIError("INTERNAL_SERVER_ERROR", {
			error: "server_error",
			error_description: "Failed to generate a unique device code"
		});
	});
};
const deviceTokenBodySchema = z.object({
	grant_type: z.literal("urn:ietf:params:oauth:grant-type:device_code").meta({ description: "The grant type for device flow" }),
	device_code: z.string().meta({ description: "The device verification code" }),
	client_id: z.string().meta({ description: "The client ID of the application" })
});
const deviceTokenErrorSchema = z.object({
	error: z.enum([
		"authorization_pending",
		"slow_down",
		"expired_token",
		"access_denied",
		"invalid_request",
		"invalid_grant"
	]).meta({ description: "Error code" }),
	error_description: z.string().meta({ description: "Detailed error description" })
});
/**
* Runs the RFC 8628 polling and one-time claim state machine shared by every
* token issuer. Issuers supply ownership checks and grant-specific validation,
* but cannot bypass expiry, polling, denial, or atomic consumption.
*/
async function redeemDeviceCode(input) {
	const deviceCodeRecord = await input.ctx.context.adapter.findOne({
		model: "deviceCode",
		where: [{
			field: "deviceCode",
			value: input.deviceCode
		}]
	});
	if (!deviceCodeRecord) throw new APIError("BAD_REQUEST", {
		error: "invalid_grant",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.INVALID_DEVICE_CODE.message
	});
	const authorization = await input.authorizeRedemption(deviceCodeRecord);
	if (deviceCodeRecord.lastPolledAt && deviceCodeRecord.pollingInterval) {
		if (Date.now() - new Date(deviceCodeRecord.lastPolledAt).getTime() < deviceCodeRecord.pollingInterval) throw new APIError("BAD_REQUEST", {
			error: "slow_down",
			error_description: DEVICE_AUTHORIZATION_ERROR_CODES.POLLING_TOO_FREQUENTLY.message
		});
	}
	await input.ctx.context.adapter.update({
		model: "deviceCode",
		where: [{
			field: "id",
			value: deviceCodeRecord.id
		}],
		update: { lastPolledAt: /* @__PURE__ */ new Date() }
	});
	if (deviceCodeRecord.expiresAt < /* @__PURE__ */ new Date()) {
		await input.ctx.context.adapter.delete({
			model: "deviceCode",
			where: [{
				field: "id",
				value: deviceCodeRecord.id
			}]
		});
		throw new APIError("BAD_REQUEST", {
			error: "expired_token",
			error_description: DEVICE_AUTHORIZATION_ERROR_CODES.EXPIRED_DEVICE_CODE.message
		});
	}
	if (deviceCodeRecord.status === "pending") throw new APIError("BAD_REQUEST", {
		error: "authorization_pending",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.AUTHORIZATION_PENDING.message
	});
	if (deviceCodeRecord.status === "denied") {
		await input.ctx.context.adapter.delete({
			model: "deviceCode",
			where: [{
				field: "id",
				value: deviceCodeRecord.id
			}]
		});
		throw new APIError("BAD_REQUEST", {
			error: "access_denied",
			error_description: DEVICE_AUTHORIZATION_ERROR_CODES.ACCESS_DENIED.message
		});
	}
	if (deviceCodeRecord.status !== "approved" || !deviceCodeRecord.userId) throw new APIError("INTERNAL_SERVER_ERROR", {
		error: "server_error",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.INVALID_DEVICE_CODE_STATUS.message
	});
	const redemptionContext = await input.prepareRedemption(deviceCodeRecord, authorization.context);
	const user = await input.ctx.context.internalAdapter.findUserById(deviceCodeRecord.userId);
	if (!user) throw new APIError("INTERNAL_SERVER_ERROR", {
		error: "server_error",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.USER_NOT_FOUND.message
	});
	const claimedDeviceCode = await input.ctx.context.adapter.consumeOne({
		model: "deviceCode",
		where: [
			{
				field: "id",
				value: deviceCodeRecord.id
			},
			authorization.ownershipWhere,
			{
				field: "status",
				value: "approved"
			}
		]
	});
	if (!claimedDeviceCode?.userId) throw new APIError("BAD_REQUEST", {
		error: "invalid_grant",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.INVALID_DEVICE_CODE.message
	});
	return {
		claimedDeviceCode,
		authorizationContext: authorization.context,
		redemptionContext,
		user
	};
}
const deviceToken = (opts, grant) => createAuthEndpoint("/device/token", {
	method: "POST",
	body: deviceTokenBodySchema,
	error: deviceTokenErrorSchema,
	metadata: {
		noStore: true,
		openapi: {
			description: `Exchange device code for access token

Follow [rfc8628#section-3.4](https://datatracker.ietf.org/doc/html/rfc8628#section-3.4)`,
			responses: {
				200: {
					description: "Success",
					content: { "application/json": { schema: {
						type: "object",
						properties: {
							session: { $ref: "#/components/schemas/Session" },
							user: { $ref: "#/components/schemas/User" }
						}
					} } }
				},
				400: {
					description: "Error response",
					content: { "application/json": { schema: {
						type: "object",
						properties: {
							error: {
								type: "string",
								enum: [
									"authorization_pending",
									"slow_down",
									"expired_token",
									"access_denied",
									"invalid_request",
									"invalid_grant"
								]
							},
							error_description: { type: "string" }
						}
					} } }
				}
			}
		}
	}
}, async (ctx) => {
	const { device_code, client_id } = ctx.body;
	if (opts.validateClient) {
		if (!await opts.validateClient(client_id)) throw new APIError("BAD_REQUEST", {
			error: "invalid_grant",
			error_description: "Invalid client ID"
		});
	}
	const { claimedDeviceCode, user } = await redeemDeviceCode({
		ctx,
		deviceCode: device_code,
		authorizeRedemption: async (deviceCodeRecord) => {
			if (deviceCodeRecord.clientId && deviceCodeRecord.clientId !== client_id) throw new APIError("BAD_REQUEST", {
				error: "invalid_grant",
				error_description: "Client ID mismatch"
			});
			await grant?.assertSessionRedemption({
				ctx,
				deviceCode: deviceCodeRecord
			});
			return {
				ownershipWhere: {
					field: "clientId",
					value: client_id
				},
				context: void 0
			};
		},
		prepareRedemption: () => void 0
	});
	const session = await ctx.context.internalAdapter.createSession(user.id);
	if (!session) throw new APIError("INTERNAL_SERVER_ERROR", {
		error: "server_error",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.FAILED_TO_CREATE_SESSION.message
	});
	ctx.context.setNewSession({
		session,
		user
	});
	if (ctx.context.options.secondaryStorage) await ctx.context.secondaryStorage?.set(session.token, JSON.stringify({
		user,
		session
	}), Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1e3));
	ctx.setHeader("Cache-Control", "no-store");
	ctx.setHeader("Pragma", "no-cache");
	return ctx.json({
		access_token: session.token,
		token_type: "Bearer",
		expires_in: Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1e3),
		scope: claimedDeviceCode.scope || ""
	});
});
const deviceVerify = (grant) => createAuthEndpoint("/device", {
	method: "GET",
	query: z.object({ user_code: z.string().meta({ description: "The user code to verify" }) }),
	error: z.object({
		error: z.enum(["invalid_request"]).meta({ description: "Error code" }),
		error_description: z.string().meta({ description: "Detailed error description" })
	}),
	metadata: { openapi: {
		description: "Verify user code and get device authorization status",
		responses: { 200: {
			description: "Device authorization status",
			content: { "application/json": { schema: {
				type: "object",
				properties: {
					user_code: {
						type: "string",
						description: "The user code to verify"
					},
					status: {
						type: "string",
						enum: [
							"pending",
							"approved",
							"denied"
						],
						description: "Current status of the device authorization"
					},
					client_id: {
						type: "string",
						description: "The client requesting authorization, returned only to the authenticated user who owns this request"
					},
					scope: {
						type: "string",
						description: "The requested scopes, returned only to the authenticated user who owns this request"
					},
					...grant?.verificationOpenAPIProperties
				}
			} } }
		} }
	} }
}, async (ctx) => {
	const { user_code } = ctx.query;
	const deviceCodeRecord = await findDeviceCodeByUserCode(ctx, user_code);
	if (!deviceCodeRecord) throw new APIError("BAD_REQUEST", {
		error: "invalid_request",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.INVALID_USER_CODE.message
	});
	if (deviceCodeRecord.expiresAt < /* @__PURE__ */ new Date()) throw new APIError("BAD_REQUEST", {
		error: "expired_token",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.EXPIRED_USER_CODE.message
	});
	const session = await getSessionFromCtx(ctx);
	if (session?.user?.id && !deviceCodeRecord.userId && deviceCodeRecord.status === "pending") {
		if (await ctx.context.adapter.incrementOne({
			model: "deviceCode",
			where: [
				{
					field: "id",
					value: deviceCodeRecord.id
				},
				{
					field: "status",
					value: "pending"
				},
				{
					field: "userId",
					operator: "eq",
					value: null
				}
			],
			increment: {},
			set: { userId: session.user.id }
		})) deviceCodeRecord.userId = session.user.id;
	}
	const canReviewRequest = session?.user.id !== void 0 && deviceCodeRecord.userId === session.user.id;
	const grantContext = canReviewRequest ? grant?.getVerificationContext(deviceCodeRecord) : void 0;
	const response = {
		...canReviewRequest ? grantContext : void 0,
		user_code,
		status: deviceCodeRecord.status,
		...canReviewRequest ? {
			client_id: deviceCodeRecord.clientId,
			scope: deviceCodeRecord.scope
		} : {}
	};
	return ctx.json(response);
});
const deviceApprove = createAuthEndpoint("/device/approve", {
	method: "POST",
	body: z.object({ userCode: z.string().meta({ description: "The user code to approve" }) }),
	error: z.object({
		error: z.enum([
			"invalid_request",
			"expired_token",
			"device_code_already_processed",
			"unauthorized",
			"access_denied"
		]).meta({ description: "Error code" }),
		error_description: z.string().meta({ description: "Detailed error description" })
	}),
	requireHeaders: true,
	metadata: { openapi: {
		description: "Approve device authorization",
		responses: { 200: {
			description: "Success",
			content: { "application/json": { schema: {
				type: "object",
				properties: { success: { type: "boolean" } }
			} } }
		} }
	} }
}, async (ctx) => {
	const session = await getSessionFromCtx(ctx);
	if (!session) throw new APIError("UNAUTHORIZED", {
		error: "unauthorized",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.AUTHENTICATION_REQUIRED.message
	});
	const { userCode } = ctx.body;
	const deviceCodeRecord = await findDeviceCodeByUserCode(ctx, userCode);
	if (!deviceCodeRecord) throw new APIError("BAD_REQUEST", {
		error: "invalid_request",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.INVALID_USER_CODE.message
	});
	if (deviceCodeRecord.expiresAt < /* @__PURE__ */ new Date()) throw new APIError("BAD_REQUEST", {
		error: "expired_token",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.EXPIRED_USER_CODE.message
	});
	if (deviceCodeRecord.status !== "pending") throw new APIError("BAD_REQUEST", {
		error: "invalid_request",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.DEVICE_CODE_ALREADY_PROCESSED.message
	});
	if (!deviceCodeRecord.userId) throw new APIError("BAD_REQUEST", {
		error: "invalid_request",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.DEVICE_CODE_NOT_CLAIMED.message
	});
	if (deviceCodeRecord.userId !== session.user.id) throw new APIError("FORBIDDEN", {
		error: "access_denied",
		error_description: "You are not authorized to approve this device authorization"
	});
	await ctx.context.adapter.update({
		model: "deviceCode",
		where: [{
			field: "id",
			value: deviceCodeRecord.id
		}],
		update: {
			status: "approved",
			userId: session.user.id
		}
	});
	return ctx.json({ success: true });
});
const deviceDeny = createAuthEndpoint("/device/deny", {
	method: "POST",
	body: z.object({ userCode: z.string().meta({ description: "The user code to deny" }) }),
	error: z.object({
		error: z.enum([
			"invalid_request",
			"expired_token",
			"unauthorized",
			"access_denied"
		]).meta({ description: "Error code" }),
		error_description: z.string().meta({ description: "Detailed error description" })
	}),
	requireHeaders: true,
	metadata: { openapi: {
		description: "Deny device authorization",
		responses: { 200: {
			description: "Success",
			content: { "application/json": { schema: {
				type: "object",
				properties: { success: { type: "boolean" } }
			} } }
		} }
	} }
}, async (ctx) => {
	const session = await getSessionFromCtx(ctx);
	if (!session) throw new APIError("UNAUTHORIZED", {
		error: "unauthorized",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.AUTHENTICATION_REQUIRED.message
	});
	const { userCode } = ctx.body;
	const deviceCodeRecord = await findDeviceCodeByUserCode(ctx, userCode);
	if (!deviceCodeRecord) throw new APIError("BAD_REQUEST", {
		error: "invalid_request",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.INVALID_USER_CODE.message
	});
	if (deviceCodeRecord.expiresAt < /* @__PURE__ */ new Date()) throw new APIError("BAD_REQUEST", {
		error: "expired_token",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.EXPIRED_USER_CODE.message
	});
	if (deviceCodeRecord.status !== "pending") throw new APIError("BAD_REQUEST", {
		error: "invalid_request",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.DEVICE_CODE_ALREADY_PROCESSED.message
	});
	if (!deviceCodeRecord.userId) throw new APIError("BAD_REQUEST", {
		error: "invalid_request",
		error_description: DEVICE_AUTHORIZATION_ERROR_CODES.DEVICE_CODE_NOT_CLAIMED.message
	});
	if (deviceCodeRecord.userId !== session.user.id) throw new APIError("FORBIDDEN", {
		error: "access_denied",
		error_description: "You are not authorized to deny this device authorization"
	});
	await ctx.context.adapter.update({
		model: "deviceCode",
		where: [{
			field: "id",
			value: deviceCodeRecord.id
		}],
		update: {
			status: "denied",
			userId: session.user.id
		}
	});
	return ctx.json({ success: true });
});
/**
* @internal
*/
const buildVerificationUris = (verificationUri, baseURL, userCode) => {
	const uri = verificationUri || "/device";
	let verificationUrl;
	try {
		verificationUrl = new URL(uri);
	} catch {
		verificationUrl = new URL(uri, baseURL);
	}
	const verificationUriCompleteUrl = new URL(verificationUrl);
	verificationUriCompleteUrl.searchParams.set("user_code", userCode);
	return {
		verificationUri: verificationUrl.toString(),
		verificationUriComplete: verificationUriCompleteUrl.toString()
	};
};
/**
* @internal
*/
const defaultGenerateDeviceCode = (length) => {
	return generateRandomString(length, "a-z", "A-Z", "0-9");
};
/**
* @internal
*/
const defaultGenerateUserCode = (length) => {
	const chars = new Uint8Array(length);
	return Array.from(crypto.getRandomValues(chars)).map((byte) => defaultCharset[byte % 32]).join("");
};
//#endregion
export { deviceApprove, deviceCode, deviceDeny, deviceToken, deviceVerify, redeemDeviceCode };
