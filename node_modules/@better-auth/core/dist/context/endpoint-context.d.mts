import { AuthContext } from "../types/context.mjs";
import { EndpointContext, InputContext } from "better-call";
import { AsyncLocalStorage } from "@better-auth/core/async_hooks";

//#region src/context/endpoint-context.d.ts
type AuthEndpointContext = Partial<InputContext<string, any> & EndpointContext<string, any>> & {
  context: AuthContext;
};
type AuthEndpointContextStorage = AsyncLocalStorage<AuthEndpointContext>;
/**
 * @deprecated Use `getCurrentAuthEndpointContext`,
 * `tryGetCurrentAuthEndpointContext`, or `runWithEndpointContext` instead.
 */
declare function getCurrentAuthContextAsyncLocalStorage(): Promise<AuthEndpointContextStorage>;
/**
 * Returns the current auth endpoint context, or `undefined` when called outside
 * of `runWithEndpointContext`.
 */
declare function tryGetCurrentAuthEndpointContext(): AuthEndpointContext | undefined;
/**
 * Returns the current auth endpoint context.
 *
 * @throws When called outside of `runWithEndpointContext`.
 */
declare function getCurrentAuthEndpointContext(): AuthEndpointContext;
/**
 * @deprecated Use `getCurrentAuthEndpointContext` instead.
 */
declare function getCurrentAuthContext(): Promise<AuthEndpointContext>;
declare function runWithEndpointContext<T>(authEndpointContext: AuthEndpointContext, fn: () => T): Promise<T>;
//#endregion
export { AuthEndpointContext, getCurrentAuthContext, getCurrentAuthContextAsyncLocalStorage, getCurrentAuthEndpointContext, runWithEndpointContext, tryGetCurrentAuthEndpointContext };