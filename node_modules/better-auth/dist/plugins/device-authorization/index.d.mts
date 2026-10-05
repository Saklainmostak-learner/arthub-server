import { TimeString, ms, sec } from "../../utils/time.mjs";
import { DeviceCode } from "./schema.mjs";
import { DeviceCodeRedemptionAuthorization, DeviceCodeRedemptionResult, redeemDeviceCode } from "./routes.mjs";
import { GenericEndpointContext, StandardSchemaV1 } from "@better-auth/core";
import { DBFieldAttribute } from "@better-auth/core/db";
import * as _$_better_auth_core_utils_error_codes0 from "@better-auth/core/utils/error-codes";
import * as _$better_call0 from "better-call";
import * as z from "zod";

//#region src/plugins/device-authorization/index.d.ts
declare module "@better-auth/core" {
  interface BetterAuthPluginRegistry<AuthOptions, Options> {
    "device-authorization": {
      creator: typeof deviceAuthorization;
    };
  }
}
declare const deviceAuthorizationOptionsSchema: z.ZodObject<{
  expiresIn: z.ZodDefault<z.ZodCustom<TimeString, TimeString>>;
  interval: z.ZodDefault<z.ZodCustom<TimeString, TimeString>>;
  deviceCodeLength: z.ZodDefault<z.ZodNumber>;
  userCodeLength: z.ZodDefault<z.ZodNumber>;
  generateDeviceCode: z.ZodOptional<z.ZodCustom<() => string | Promise<string>, () => string | Promise<string>>>;
  generateUserCode: z.ZodOptional<z.ZodCustom<() => string | Promise<string>, () => string | Promise<string>>>;
  validateClient: z.ZodOptional<z.ZodCustom<(clientId: string) => boolean | Promise<boolean>, (clientId: string) => boolean | Promise<boolean>>>;
  onDeviceAuthRequest: z.ZodOptional<z.ZodCustom<(clientId: string, scope: string | undefined) => void | Promise<void>, (clientId: string, scope: string | undefined) => void | Promise<void>>>;
  verificationUri: z.ZodOptional<z.ZodString>;
  schema: z.ZodOptional<z.ZodCustom<{
    deviceCode?: {
      modelName?: string | undefined;
      fields?: {
        deviceCode?: string | undefined;
        userCode?: string | undefined;
        userId?: string | undefined;
        expiresAt?: string | undefined;
        status?: string | undefined;
        lastPolledAt?: string | undefined;
        pollingInterval?: string | undefined;
        clientId?: string | undefined;
        scope?: string | undefined;
      } | undefined;
    } | undefined;
  }, {
    deviceCode?: {
      modelName?: string | undefined;
      fields?: {
        deviceCode?: string | undefined;
        userCode?: string | undefined;
        userId?: string | undefined;
        expiresAt?: string | undefined;
        status?: string | undefined;
        lastPolledAt?: string | undefined;
        pollingInterval?: string | undefined;
        clientId?: string | undefined;
        scope?: string | undefined;
      } | undefined;
    } | undefined;
  }>>;
}, z.core.$strip>;
type DeviceAuthorizationOptions = z.infer<typeof deviceAuthorizationOptionsSchema>;
interface DeviceAuthorizationRequest {
  client_id?: string | undefined;
  user_id?: string | undefined;
  scope?: string | undefined;
}
/** The client binding and grant-owned fields produced by request authorization. */
interface DeviceAuthorizationGrantAuthorization {
  /** The client identifier that owns the device code. */
  clientId: string;
  /** Additional grant-owned fields persisted with the device code. */
  deviceCodeFields: Record<string, unknown>;
}
/**
 * A token grant that contributes its request state to device authorization
 * without expanding the standalone plugin's database or endpoint contracts.
 */
interface DeviceAuthorizationGrant<RequestFields extends z.ZodRawShape = z.ZodRawShape, VerificationContext extends Record<string, unknown> = Record<string, unknown>> {
  /** Additional request fields accepted only when this grant is configured. */
  requestSchemaFields: RequestFields;
  /** Additional request errors introduced by the grant's protocol extensions. */
  requestErrorCodes?: readonly string[];
  /** Additional OpenAPI responses introduced by the grant's request protocol. */
  requestOpenAPIResponses?: Record<string, Record<string, unknown>>;
  /** Translate validation issues raised by the grant's request fields. */
  onRequestValidationError?: (issues: readonly StandardSchemaV1.Issue[]) => void;
  /** Database fields persisted only when this grant is configured. */
  deviceCodeSchemaFields: Record<string, DBFieldAttribute>;
  /** Validate a request and return its client binding and fields to persist. */
  authorizeRequest: (input: {
    ctx: GenericEndpointContext;
    request: DeviceAuthorizationRequest & z.infer<z.ZodObject<RequestFields>>;
  }) => DeviceAuthorizationGrantAuthorization | undefined | Promise<DeviceAuthorizationGrantAuthorization | undefined>;
  /** Refuse the standalone session-token endpoint for grant-owned codes. */
  assertSessionRedemption: (input: {
    ctx: GenericEndpointContext;
    deviceCode: Record<string, unknown>;
  }) => void | Promise<void>;
  /** Add grant-owned information to the owner-only verification response. */
  getVerificationContext: (deviceCode: Record<string, unknown>) => VerificationContext | undefined;
  /** OpenAPI properties matching `getVerificationContext()`. */
  verificationOpenAPIProperties?: Record<string, Record<string, unknown>>;
}
type DeviceAuthorizationPluginOptions<Grant extends DeviceAuthorizationGrant | undefined = undefined> = Partial<DeviceAuthorizationOptions> & {
  /** Optional token grant that extends the device authorization flow. */grant?: Grant;
};
declare const deviceAuthorization: <Grant extends DeviceAuthorizationGrant | undefined = undefined>(options?: DeviceAuthorizationPluginOptions<Grant>) => {
  id: "device-authorization";
  version: string;
  schema: {
    deviceCode: {
      fields: {
        deviceCode: {
          type: "string";
          required: true;
        };
        userCode: {
          type: "string";
          required: true;
        };
        userId: {
          type: "string";
          required: false;
        };
        expiresAt: {
          type: "date";
          required: true;
        };
        status: {
          type: "string";
          required: true;
        };
        lastPolledAt: {
          type: "date";
          required: false;
        };
        pollingInterval: {
          type: "number";
          required: false;
        };
        clientId: {
          type: "string";
          required: false;
        };
        scope: {
          type: "string";
          required: false;
        };
      };
      indexes: {
        fields: [string];
        unique: true;
      }[];
    };
  };
  endpoints: {
    deviceCode: _$better_call0.StrictEndpoint<"/device/code", {
      method: "POST";
      cloneRequest: true;
      body: z.ZodObject<(("scope" | "user_id" | "client_id") & keyof (Grant extends DeviceAuthorizationGrant<infer RequestFields extends Readonly<{
        [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
      }>, Record<string, unknown>> ? RequestFields : Record<never, never>) extends never ? {
        client_id: z.ZodString;
        user_id: z.ZodOptional<z.ZodString>;
        scope: z.ZodOptional<z.ZodString>;
      } & ((Grant extends DeviceAuthorizationGrant<infer RequestFields extends Readonly<{
        [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
      }>, Record<string, unknown>> ? RequestFields : Record<never, never>) extends infer T_1 ? { -readonly [P in keyof T_1]: T_1[P] } : never) : ({
        client_id: z.ZodString;
        user_id: z.ZodOptional<z.ZodString>;
        scope: z.ZodOptional<z.ZodString>;
      } extends infer T_2 extends z.core.util.SomeObject ? { [K in keyof T_2 as K extends keyof (Grant extends DeviceAuthorizationGrant<infer RequestFields extends Readonly<{
        [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
      }>, Record<string, unknown>> ? RequestFields : Record<never, never>) ? never : K]: T_2[K] } : never) & (((Grant extends DeviceAuthorizationGrant<infer RequestFields extends Readonly<{
        [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
      }>, Record<string, unknown>> ? RequestFields : Record<never, never>) extends infer T_4 ? { -readonly [P in keyof T_4]: T_4[P] } : never) extends infer T_3 extends z.core.util.SomeObject ? { [K_1 in keyof T_3]: T_3[K_1] } : never)) extends infer T ? { [k in keyof T]: T[k] } : never, z.core.$strip> | z.ZodObject<(("scope" | "user_id" | "client_id") & keyof (Grant extends DeviceAuthorizationGrant<infer RequestFields extends Readonly<{
        [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
      }>, Record<string, unknown>> ? RequestFields : Record<never, never>) extends never ? {
        user_id: z.ZodOptional<z.ZodString>;
        scope: z.ZodOptional<z.ZodString>;
        client_id: z.ZodOptional<z.ZodString>;
      } & ((Grant extends DeviceAuthorizationGrant<infer RequestFields extends Readonly<{
        [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
      }>, Record<string, unknown>> ? RequestFields : Record<never, never>) extends infer T_6 ? { -readonly [P in keyof T_6]: T_6[P] } : never) : ({
        user_id: z.ZodOptional<z.ZodString>;
        scope: z.ZodOptional<z.ZodString>;
        client_id: z.ZodOptional<z.ZodString>;
      } extends infer T_7 extends z.core.util.SomeObject ? { [K_2 in keyof T_7 as K_2 extends keyof (Grant extends DeviceAuthorizationGrant<infer RequestFields extends Readonly<{
        [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
      }>, Record<string, unknown>> ? RequestFields : Record<never, never>) ? never : K_2]: T_7[K_2] } : never) & (((Grant extends DeviceAuthorizationGrant<infer RequestFields extends Readonly<{
        [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
      }>, Record<string, unknown>> ? RequestFields : Record<never, never>) extends infer T_9 ? { -readonly [P in keyof T_9]: T_9[P] } : never) extends infer T_8 extends z.core.util.SomeObject ? { [K_1 in keyof T_8]: T_8[K_1] } : never)) extends infer T_5 ? { [k_1 in keyof T_5]: T_5[k_1] } : never, z.core.$strip>;
      error: z.ZodObject<{
        error: z.ZodEnum<{ [k_3 in (readonly ["invalid_request", "invalid_client", "unauthorized_client", "invalid_scope", ...Grant extends {
          requestErrorCodes: infer ErrorCodes extends readonly string[];
        } ? ErrorCodes : readonly [], "server_error"])[number]]: k_3 } extends infer T_10 ? { [k_2 in keyof T_10]: T_10[k_2] } : never>;
        error_description: z.ZodString;
      }, z.core.$strip>;
      onValidationError: ({
        issues,
        message
      }: {
        message: string;
        issues: readonly _$better_call0.StandardSchemaV1.Issue[];
      }) => never;
      metadata: {
        noStore: boolean;
        allowedMediaTypes: string[];
        openapi: {
          description: string;
          responses: {
            200: {
              description: string;
              content: {
                "application/json": {
                  schema: {
                    type: "object";
                    properties: {
                      device_code: {
                        type: string;
                        description: string;
                      };
                      user_code: {
                        type: string;
                        description: string;
                      };
                      verification_uri: {
                        type: string;
                        format: string;
                        description: string;
                      };
                      verification_uri_complete: {
                        type: string;
                        format: string;
                        description: string;
                      };
                      expires_in: {
                        type: string;
                        description: string;
                      };
                      interval: {
                        type: string;
                        description: string;
                      };
                    };
                  };
                };
              };
            };
            400: {
              description: string;
              content: {
                "application/json": {
                  schema: {
                    type: "object";
                    properties: {
                      error: {
                        type: string;
                        enum: ["invalid_request", "invalid_client", "unauthorized_client", "invalid_scope", ...Grant extends {
                          requestErrorCodes: infer ErrorCodes extends readonly string[];
                        } ? ErrorCodes : readonly []];
                      };
                      error_description: {
                        type: string;
                      };
                    };
                  };
                };
              };
            };
            500: {
              description: string;
              content: {
                "application/json": {
                  schema: {
                    type: "object";
                    properties: {
                      error: {
                        type: string;
                        enum: string[];
                      };
                      error_description: {
                        type: string;
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    }, {
      device_code: string;
      user_code: string;
      verification_uri: string;
      verification_uri_complete: string;
      expires_in: number;
      interval: number;
    }>;
    deviceToken: _$better_call0.StrictEndpoint<"/device/token", {
      method: "POST";
      body: z.ZodObject<{
        grant_type: z.ZodLiteral<"urn:ietf:params:oauth:grant-type:device_code">;
        device_code: z.ZodString;
        client_id: z.ZodString;
      }, z.core.$strip>;
      error: z.ZodObject<{
        error: z.ZodEnum<{
          invalid_request: "invalid_request";
          authorization_pending: "authorization_pending";
          slow_down: "slow_down";
          expired_token: "expired_token";
          access_denied: "access_denied";
          invalid_grant: "invalid_grant";
        }>;
        error_description: z.ZodString;
      }, z.core.$strip>;
      metadata: {
        noStore: boolean;
        openapi: {
          description: string;
          responses: {
            200: {
              description: string;
              content: {
                "application/json": {
                  schema: {
                    type: "object";
                    properties: {
                      session: {
                        $ref: string;
                      };
                      user: {
                        $ref: string;
                      };
                    };
                  };
                };
              };
            };
            400: {
              description: string;
              content: {
                "application/json": {
                  schema: {
                    type: "object";
                    properties: {
                      error: {
                        type: string;
                        enum: string[];
                      };
                      error_description: {
                        type: string;
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    }, {
      access_token: string;
      token_type: string;
      expires_in: number;
      scope: string;
    }>;
    deviceVerify: _$better_call0.StrictEndpoint<"/device", {
      method: "GET";
      query: z.ZodObject<{
        user_code: z.ZodString;
      }, z.core.$strip>;
      error: z.ZodObject<{
        error: z.ZodEnum<{
          invalid_request: "invalid_request";
        }>;
        error_description: z.ZodString;
      }, z.core.$strip>;
      metadata: {
        openapi: {
          description: string;
          responses: {
            200: {
              description: string;
              content: {
                "application/json": {
                  schema: {
                    type: "object";
                    properties: {
                      user_code: {
                        type: string;
                        description: string;
                      };
                      status: {
                        type: string;
                        enum: string[];
                        description: string;
                      };
                      client_id: {
                        type: string;
                        description: string;
                      };
                      scope: {
                        type: string;
                        description: string;
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    }, {
      user_code: string;
      status: string;
      client_id?: string | undefined;
      scope?: string | undefined;
    } & Partial<Grant extends DeviceAuthorizationGrant<infer _RequestFields extends Readonly<{
      [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
    }>, infer VerificationContext extends Record<string, unknown>> ? VerificationContext : Record<never, never>>>;
    deviceApprove: _$better_call0.StrictEndpoint<"/device/approve", {
      method: "POST";
      body: z.ZodObject<{
        userCode: z.ZodString;
      }, z.core.$strip>;
      error: z.ZodObject<{
        error: z.ZodEnum<{
          invalid_request: "invalid_request";
          expired_token: "expired_token";
          access_denied: "access_denied";
          device_code_already_processed: "device_code_already_processed";
          unauthorized: "unauthorized";
        }>;
        error_description: z.ZodString;
      }, z.core.$strip>;
      requireHeaders: true;
      metadata: {
        openapi: {
          description: string;
          responses: {
            200: {
              description: string;
              content: {
                "application/json": {
                  schema: {
                    type: "object";
                    properties: {
                      success: {
                        type: string;
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    }, {
      success: boolean;
    }>;
    deviceDeny: _$better_call0.StrictEndpoint<"/device/deny", {
      method: "POST";
      body: z.ZodObject<{
        userCode: z.ZodString;
      }, z.core.$strip>;
      error: z.ZodObject<{
        error: z.ZodEnum<{
          invalid_request: "invalid_request";
          expired_token: "expired_token";
          access_denied: "access_denied";
          unauthorized: "unauthorized";
        }>;
        error_description: z.ZodString;
      }, z.core.$strip>;
      requireHeaders: true;
      metadata: {
        openapi: {
          description: string;
          responses: {
            200: {
              description: string;
              content: {
                "application/json": {
                  schema: {
                    type: "object";
                    properties: {
                      success: {
                        type: string;
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    }, {
      success: boolean;
    }>;
  };
  rateLimit: {
    pathMatcher(path: string): path is "/device";
    window: number;
    max: number;
  }[];
  $ERROR_CODES: {
    USER_NOT_FOUND: _$_better_auth_core_utils_error_codes0.RawError<"USER_NOT_FOUND">;
    FAILED_TO_CREATE_SESSION: _$_better_auth_core_utils_error_codes0.RawError<"FAILED_TO_CREATE_SESSION">;
    INVALID_DEVICE_CODE: _$_better_auth_core_utils_error_codes0.RawError<"INVALID_DEVICE_CODE">;
    EXPIRED_DEVICE_CODE: _$_better_auth_core_utils_error_codes0.RawError<"EXPIRED_DEVICE_CODE">;
    EXPIRED_USER_CODE: _$_better_auth_core_utils_error_codes0.RawError<"EXPIRED_USER_CODE">;
    AUTHORIZATION_PENDING: _$_better_auth_core_utils_error_codes0.RawError<"AUTHORIZATION_PENDING">;
    ACCESS_DENIED: _$_better_auth_core_utils_error_codes0.RawError<"ACCESS_DENIED">;
    INVALID_USER_CODE: _$_better_auth_core_utils_error_codes0.RawError<"INVALID_USER_CODE">;
    DEVICE_CODE_ALREADY_PROCESSED: _$_better_auth_core_utils_error_codes0.RawError<"DEVICE_CODE_ALREADY_PROCESSED">;
    DEVICE_CODE_NOT_CLAIMED: _$_better_auth_core_utils_error_codes0.RawError<"DEVICE_CODE_NOT_CLAIMED">;
    POLLING_TOO_FREQUENTLY: _$_better_auth_core_utils_error_codes0.RawError<"POLLING_TOO_FREQUENTLY">;
    INVALID_DEVICE_CODE_STATUS: _$_better_auth_core_utils_error_codes0.RawError<"INVALID_DEVICE_CODE_STATUS">;
    AUTHENTICATION_REQUIRED: _$_better_auth_core_utils_error_codes0.RawError<"AUTHENTICATION_REQUIRED">;
  };
  options: {
    grant: DeviceAuthorizationGrant<Readonly<{
      [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
    }>, Record<string, unknown>> | undefined;
    expiresIn: TimeString;
    interval: TimeString;
    deviceCodeLength: number;
    userCodeLength: number;
    generateDeviceCode?: (() => string | Promise<string>) | undefined;
    generateUserCode?: (() => string | Promise<string>) | undefined;
    validateClient?: ((clientId: string) => boolean | Promise<boolean>) | undefined;
    onDeviceAuthRequest?: ((clientId: string, scope: string | undefined) => void | Promise<void>) | undefined;
    verificationUri?: string | undefined;
    schema?: {
      deviceCode?: {
        modelName?: string | undefined;
        fields?: {
          deviceCode?: string | undefined;
          userCode?: string | undefined;
          userId?: string | undefined;
          expiresAt?: string | undefined;
          status?: string | undefined;
          lastPolledAt?: string | undefined;
          pollingInterval?: string | undefined;
          clientId?: string | undefined;
          scope?: string | undefined;
        } | undefined;
      } | undefined;
    } | undefined;
  };
};
//#endregion
export { DeviceAuthorizationGrant, DeviceAuthorizationGrantAuthorization, DeviceAuthorizationOptions, DeviceAuthorizationPluginOptions, DeviceAuthorizationRequest, type DeviceCode, type DeviceCodeRedemptionAuthorization, type DeviceCodeRedemptionResult, TimeString, deviceAuthorization, deviceAuthorizationOptionsSchema, ms, redeemDeviceCode, sec };