import { Providers } from "./constants.mjs";

//#region src/plugins/captcha/types.d.ts
type Provider = (typeof Providers)[keyof typeof Providers];
interface BaseCaptchaOptions {
  secretKey: string;
  /**
   * Paths where captcha verification is enforced. Paths match exactly unless
   * they include wildcards, such as `/sign-in/*` or `/sign-in/**`.
   */
  endpoints?: string[] | undefined;
  siteVerifyURLOverride?: string | undefined;
}
interface GoogleRecaptchaOptions extends BaseCaptchaOptions {
  provider: typeof Providers.GOOGLE_RECAPTCHA;
  minScore?: number | undefined;
  /**
   * Expected reCAPTCHA v3 `action`. When set, a verification whose action does
   * not match is rejected, preventing a token minted for another action on the
   * same site key from being replayed against this endpoint.
   */
  expectedAction?: string | undefined;
  /**
   * Allow-list of hostnames the token must have been issued for. When set, a
   * verification reporting a different hostname is rejected.
   */
  allowedHostnames?: string[] | undefined;
}
interface CloudflareTurnstileOptions extends BaseCaptchaOptions {
  provider: typeof Providers.CLOUDFLARE_TURNSTILE;
  /**
   * Expected Turnstile `action`. When set, a verification whose action does
   * not match is rejected, preventing cross-context token reuse.
   */
  expectedAction?: string | undefined;
  /**
   * Allow-list of hostnames the token must have been issued for. When set, a
   * verification reporting a different or missing hostname is rejected.
   */
  allowedHostnames?: string[] | undefined;
}
interface HCaptchaOptions extends BaseCaptchaOptions {
  provider: typeof Providers.HCAPTCHA;
  siteKey?: string | undefined;
}
interface CaptchaFoxOptions extends BaseCaptchaOptions {
  provider: typeof Providers.CAPTCHAFOX;
  siteKey?: string | undefined;
}
/**
 * BotID verdict fields available to custom request validation.
 *
 * @see https://vercel.com/docs/botid/verified-bots
 */
type BotIdVerification = {
  isBot: boolean;
  isVerifiedBot?: boolean | undefined;
  verifiedBotName?: string | undefined;
  verifiedBotCategory?: string | undefined;
};
type ValidateRequestContext = {
  request: Request;
  verification: BotIdVerification;
};
/**
 * Protect auth requests with Vercel BotID. The browser must also protect the
 * same request paths and methods with BotID's client SDK.
 *
 * @see https://vercel.com/docs/botid/get-started
 */
interface VercelBotIdOptions {
  provider: typeof Providers.VERCEL_BOTID;
  /**
   * Auth paths to verify, without the Better Auth base path.
   *
   * @default ["/sign-up/email", "/sign-in/email", "/request-password-reset"]
   */
  endpoints?: string[] | undefined;
  /**
   * Vercel's server-side check for the current request. Pass `checkBotId` from
   * `botid/server`, or wrap it to supply SDK options.
   */
  checkBotId: () => Promise<BotIdVerification>;
  /**
   * Override the default `isBot === false` decision. Return `true` to allow
   * the request, including a verified bot you trust.
   *
   * @see https://vercel.com/docs/botid/verified-bots
   */
  validateRequest?: (ctx: ValidateRequestContext) => boolean | Promise<boolean>;
}
type CaptchaOptions = GoogleRecaptchaOptions | CloudflareTurnstileOptions | HCaptchaOptions | CaptchaFoxOptions | VercelBotIdOptions;
//#endregion
export { BaseCaptchaOptions, BotIdVerification, CaptchaFoxOptions, CaptchaOptions, CloudflareTurnstileOptions, GoogleRecaptchaOptions, HCaptchaOptions, Provider, ValidateRequestContext, VercelBotIdOptions };