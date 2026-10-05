import { BetterAuthDBSchema } from "./type.mjs";
import { ResolvedDBTableIndex } from "./database-index.mjs";
import { BetterAuthOptions } from "../types/init-options.mjs";
//#region src/db/get-tables.d.ts
declare function getAuthTablesWithResolvedIndexes(options: BetterAuthOptions): {
  indexesByTable: ReadonlyMap<string, readonly ResolvedDBTableIndex[]>;
  tables: BetterAuthDBSchema;
};
declare const getAuthTables: (options: BetterAuthOptions) => BetterAuthDBSchema;
//#endregion
export { getAuthTables, getAuthTablesWithResolvedIndexes };