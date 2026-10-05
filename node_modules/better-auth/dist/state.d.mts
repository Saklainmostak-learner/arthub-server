import { GenericEndpointContext } from "@better-auth/core";
import { BetterAuthError } from "@better-auth/core/error";
import * as z from "zod";

//#region src/state.d.ts
declare const stateDataSchema: z.ZodObject<{
  callbackURL: z.ZodString;
  codeVerifier: z.ZodString;
  errorURL: z.ZodOptional<z.ZodString>;
  newUserURL: z.ZodOptional<z.ZodString>;
  expiresAt: z.ZodNumber;
  oauthState: z.ZodOptional<z.ZodString>;
  link: z.ZodOptional<z.ZodObject<{
    email: z.ZodString;
    userId: z.ZodCoercedString<unknown>;
  }, z.core.$strip>>;
  requestSignUp: z.ZodOptional<z.ZodBoolean>;
  idTokenNonce: z.ZodOptional<z.ZodString>;
  serverContext: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$loose>;
type StateData = z.infer<typeof stateDataSchema>;
declare function generateGenericState(c: GenericEndpointContext, stateData: StateData, settings?: {
  cookieName: string;
}): Promise<{
  state: string;
  codeVerifier: string;
}>;
declare function parseGenericState(c: GenericEndpointContext, state: string | undefined, settings?: {
  cookieName?: string;
  skipStateCookieCheck?: boolean;
}): Promise<{
  [x: string]: unknown;
  callbackURL: string;
  codeVerifier: string;
  expiresAt: number;
  errorURL?: string | undefined;
  newUserURL?: string | undefined;
  oauthState?: string | undefined;
  link?: {
    email: string;
    userId: string;
  } | undefined;
  requestSignUp?: boolean | undefined;
  idTokenNonce?: string | undefined;
  serverContext?: Record<string, unknown> | undefined;
}>;
//#endregion
export { StateData, generateGenericState, parseGenericState };