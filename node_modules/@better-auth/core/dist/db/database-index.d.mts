import { DBFieldAttribute, DBTableIndex } from "./type.mjs";

//#region src/db/database-index.d.ts
declare function getPortableDatabaseIdentifierKey(identifier: string): string;
/** A table-level index resolved to physical database columns. */
interface ResolvedDBTableIndex extends Omit<DBTableIndex, "fields"> {
  /** Physical database column names, in index order. */
  columns: readonly [string, ...string[]];
  name: string;
}
interface DBTableIndexSource {
  fields: Readonly<Record<string, DBFieldAttribute>>;
  indexes: readonly DBTableIndex[] | undefined;
  tableName: string;
}
type BoundedDatabaseIndexDialect = "mssql" | "mysql";
/** Returns the stable database name for a table-level index. */
declare function getDatabaseIndexName(tableName: string, index: DBTableIndex): string;
/** Returns the database name used by legacy field-level index metadata. */
declare function getDatabaseFieldIndexName(tableName: string, columnName: string, unique: boolean): string;
/** Resolves logical index fields to their configured database column names. */
declare function resolveDatabaseTableIndexes({
  fields,
  indexes,
  tableName
}: {
  fields: Readonly<Record<string, DBFieldAttribute>>;
  indexes: readonly DBTableIndex[] | undefined;
  tableName: string;
}): readonly ResolvedDBTableIndex[];
/**
 * Returns a safe generated string length for a column across all of its table
 * indexes in byte-limited SQL dialects.
 */
declare function getDatabaseIndexStringLength({
  columnName,
  dialect,
  fields,
  indexes
}: {
  columnName: string;
  dialect: BoundedDatabaseIndexDialect;
  fields: Readonly<Record<string, DBFieldAttribute>>;
  indexes: readonly ResolvedDBTableIndex[];
}): number | undefined;
/**
 * Resolves and validates every table index as one portable database schema.
 *
 * Index names are schema-wide because SQLite and PostgreSQL do not scope them
 * to an individual table.
 */
declare function resolveDatabaseSchemaIndexes(sources: readonly DBTableIndexSource[]): ReadonlyMap<string, readonly ResolvedDBTableIndex[]>;
//#endregion
export { BoundedDatabaseIndexDialect, DBTableIndexSource, ResolvedDBTableIndex, getDatabaseFieldIndexName, getDatabaseIndexName, getDatabaseIndexStringLength, getPortableDatabaseIdentifierKey, resolveDatabaseSchemaIndexes, resolveDatabaseTableIndexes };