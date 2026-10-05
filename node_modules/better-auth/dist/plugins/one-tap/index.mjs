import { parseUserOutput } from "../../db/schema.mjs";
import { setSessionCookie } from "../../cookies/index.mjs";
import { OAUTH_CALLBACK_ERROR_CODES } from "../../oauth2/errors.mjs";
import { handleOAuthUserInfo } from "../../oauth2/link-account.mjs";
import { APIError as APIError$1 } from "../../api/index.mjs";
import { PACKAGE_VERSION } from "../../version.mjs";
import { toBoolean } from "../../utils/boolean.mjs";
import { BASE_ERROR_CODES } from "@better-auth/core/error";
import { isGoogleHostedDomainAllowed, verifyGoogleIdToken } from "@better-auth/core/social-providers";
import { createAuthEndpoint } from "@better-auth/core/api";
import * as z from "zod";
//#region src/plugins/one-tap/index.ts
const oneTapCallbackBodySchema = z.object({
	idToken: z.string().meta({ description: "Google ID token, which the client obtains from the One Tap API" }),
	/**
	* Sent so the global origin-check middleware validates the post-login
	* redirect target against `trustedOrigins`. Without it the client performs
	* an unvalidated `window.location` redirect, which is an open redirect.
	*/
	callbackURL: z.string().meta({ description: "URL to redirect to after a successful sign-in" }).optional()
});
const oneTap = (options) => ({
	id: "one-tap",
	version: PACKAGE_VERSION,
	endpoints: { oneTapCallback: createAuthEndpoint("/one-tap/callback", {
		method: "POST",
		body: oneTapCallbackBodySchema,
		metadata: { openapi: {
			summary: "One tap callback",
			description: "Use this endpoint to authenticate with Google One Tap",
			responses: {
				200: {
					description: "Successful response",
					content: { "application/json": { schema: {
						type: "object",
						properties: {
							session: { $ref: "#/components/schemas/Session" },
							user: { $ref: "#/components/schemas/User" }
						}
					} } }
				},
				400: { description: "Invalid token" }
			}
		} }
	}, async (ctx) => {
		const { idToken } = ctx.body;
		const googleProvider = typeof ctx.context.options.socialProviders?.google === "function" ? await ctx.context.options.socialProviders?.google() : ctx.context.options.socialProviders?.google;
		const audience = options?.clientId || googleProvider?.clientId;
		if (!audience || Array.isArray(audience) && audience.length === 0) throw new APIError$1("BAD_REQUEST", { message: "Google client ID is required for One Tap. Set it on the oneTap plugin (clientId) or on socialProviders.google." });
		const payload = await verifyGoogleIdToken({
			token: idToken,
			audience
		});
		if (!payload) throw new APIError$1("BAD_REQUEST", { message: "invalid id token" });
		if (!payload.sub) throw new APIError$1("BAD_REQUEST", { message: "invalid id token" });
		const configuredHostedDomain = googleProvider?.hd;
		if (!isGoogleHostedDomainAllowed(configuredHostedDomain, payload.hd)) {
			ctx.context.logger.error(`Google One Tap sign-in rejected: id token hosted domain (hd) "${payload.hd ?? "<missing>"}" does not satisfy the configured "hd" option "${configuredHostedDomain}".`);
			throw new APIError$1("BAD_REQUEST", { message: "invalid id token" });
		}
		const { email: rawEmail, email_verified, name, picture, sub } = payload;
		if (typeof rawEmail !== "string" || !rawEmail) throw new APIError$1("BAD_REQUEST", { message: "Email not available in token" });
		if (typeof sub !== "string" || !sub) throw new APIError$1("BAD_REQUEST", { message: "invalid id token" });
		const result = await handleOAuthUserInfo(ctx, {
			userInfo: {
				id: sub,
				email: rawEmail.toLowerCase(),
				emailVerified: typeof email_verified === "boolean" ? email_verified : toBoolean(email_verified),
				name: typeof name === "string" ? name : "",
				image: typeof picture === "string" ? picture : void 0
			},
			account: {
				providerId: "google",
				accountId: sub,
				idToken,
				scope: "openid,profile,email"
			},
			disableSignUp: options?.disableSignup || googleProvider?.disableSignUp,
			source: {
				method: "oauth",
				oauth: {
					providerId: "google",
					profile: payload
				}
			}
		});
		if (result.error) {
			if (result.error === OAUTH_CALLBACK_ERROR_CODES.EMAIL_NOT_VERIFIED) throw APIError$1.from("FORBIDDEN", BASE_ERROR_CODES.EMAIL_NOT_VERIFIED);
			throw new APIError$1("UNAUTHORIZED", { message: result.error });
		}
		await setSessionCookie(ctx, result.data);
		return ctx.json({
			token: result.data.session.token,
			user: parseUserOutput(ctx.context.options, result.data.user)
		});
	}) },
	options
});
//#endregion
export { oneTap };
