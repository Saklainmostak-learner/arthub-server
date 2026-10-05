import { middlewareResponse } from "../../../utils/middleware-response.mjs";
import { CAPTCHA_VERIFY_TIMEOUT_MS } from "../constants.mjs";
import { EXTERNAL_ERROR_CODES, INTERNAL_ERROR_CODES } from "../error-codes.mjs";
import { withTimeout } from "../utils.mjs";
//#region src/plugins/captcha/verify-handlers/vercel-botid.ts
const vercelBotId = async ({ request, checkBotId, validateRequest }) => {
	let isValid;
	try {
		isValid = await withTimeout((async () => {
			const verification = await checkBotId();
			return validateRequest ? validateRequest({
				request,
				verification
			}) : verification.isBot === false;
		})(), CAPTCHA_VERIFY_TIMEOUT_MS);
	} catch (error) {
		throw new Error(INTERNAL_ERROR_CODES.SERVICE_UNAVAILABLE.message, { cause: error });
	}
	if (isValid) return void 0;
	return middlewareResponse({
		message: EXTERNAL_ERROR_CODES.VERIFICATION_FAILED.message,
		code: EXTERNAL_ERROR_CODES.VERIFICATION_FAILED.code,
		status: 403
	});
};
//#endregion
export { vercelBotId };
