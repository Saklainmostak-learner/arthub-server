import { DBFieldAttribute, DBTableIndex } from "./type.mjs";

//#region src/db/plugin.d.ts
type BetterAuthPluginDBSchema = { [table in string]: {
  fields: {
    [field: string]: DBFieldAttribute;
  }; /** Table-level indexes, including compound indexes. */
  indexes?: readonly DBTableIndex[] | undefined;
  disableMigration?: boolean | undefined;
  modelName?: string | undefined;
} };
//#endregion
export { BetterAuthPluginDBSchema };