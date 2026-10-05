import { Where } from "../../types/adapter.mjs";
import { User } from "../../types/models.mjs";
import { DeviceCode } from "./schema.mjs";
import { GenericEndpointContext } from "@better-auth/core";
//#region src/plugins/device-authorization/routes.d.ts
interface DeviceCodeRedemptionAuthorization<AuthorizationContext> {
  /** Additional ownership predicate used by the atomic claim. */
  ownershipWhere: Where;
  /** Issuer-specific state that survives until token issuance. */
  context: AuthorizationContext;
}
interface DeviceCodeRedemptionResult<DeviceCodeFields extends Record<string, unknown>, AuthorizationContext, RedemptionContext> {
  claimedDeviceCode: DeviceCode & DeviceCodeFields & {
    userId: string;
  };
  authorizationContext: AuthorizationContext;
  redemptionContext: RedemptionContext;
  user: User;
}
/**
 * Runs the RFC 8628 polling and one-time claim state machine shared by every
 * token issuer. Issuers supply ownership checks and grant-specific validation,
 * but cannot bypass expiry, polling, denial, or atomic consumption.
 */
declare function redeemDeviceCode<DeviceCodeFields extends Record<string, unknown>, AuthorizationContext, RedemptionContext>(input: {
  ctx: GenericEndpointContext;
  deviceCode: string;
  authorizeRedemption: (deviceCode: DeviceCode & DeviceCodeFields) => DeviceCodeRedemptionAuthorization<AuthorizationContext> | Promise<DeviceCodeRedemptionAuthorization<AuthorizationContext>>;
  prepareRedemption: (deviceCode: DeviceCode & DeviceCodeFields, authorizationContext: AuthorizationContext) => RedemptionContext | Promise<RedemptionContext>;
}): Promise<DeviceCodeRedemptionResult<DeviceCodeFields, AuthorizationContext, RedemptionContext>>;
//#endregion
export { DeviceCodeRedemptionAuthorization, DeviceCodeRedemptionResult, redeemDeviceCode };