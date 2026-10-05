import * as z from "zod";

//#region src/plugins/device-authorization/schema.d.ts
declare const deviceCode: z.ZodObject<{
  id: z.ZodString;
  deviceCode: z.ZodString;
  userCode: z.ZodString;
  userId: z.ZodOptional<z.ZodString>;
  expiresAt: z.ZodDate;
  status: z.ZodString;
  lastPolledAt: z.ZodOptional<z.ZodDate>;
  pollingInterval: z.ZodOptional<z.ZodNumber>;
  clientId: z.ZodOptional<z.ZodString>;
  scope: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type DeviceCode = z.infer<typeof deviceCode>;
//#endregion
export { DeviceCode };