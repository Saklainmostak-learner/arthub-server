import { BetterAuthOptions } from "@better-auth/core";
import { DBFieldAttribute } from "@better-auth/core/db";
import { ResolvedDBTableIndex } from "@better-auth/core/db/internal";

//#region src/db/get-schema.d.ts
declare function getSchema(config: BetterAuthOptions): Record<string, {
  fields: Record<string, DBFieldAttribute>;
  indexes?: readonly ResolvedDBTableIndex[] | undefined;
  order: number;
  disableMigrations?: boolean | undefined;
}>;
//#endregion
export { getSchema };