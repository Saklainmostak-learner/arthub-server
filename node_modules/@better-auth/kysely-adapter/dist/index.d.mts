import { Kysely, TableMetadata } from "kysely";
import { DBAdapter, DBAdapterDebugLogOption } from "@better-auth/core/db/adapter";
import { ExpectedSchema, IntrospectedTable } from "@better-auth/core/db/internal";
import { BetterAuthOptions } from "@better-auth/core";

//#region src/types.d.ts
type KyselyDatabaseType = "postgres" | "mysql" | "sqlite" | "mssql";
/**
 * Metadata for a column that participates in a database index.
 */
interface DatabaseIndexColumnMetadata {
  /**
   * Whether the index covers the complete column value rather than a prefix.
   */
  readonly fullLength: boolean;
  readonly name: string | null;
  readonly position: number;
}
/**
 * Database-agnostic metadata for an index.
 */
interface DatabaseIndexMetadata {
  readonly columns: readonly DatabaseIndexColumnMetadata[];
  readonly name: string;
  readonly partial: boolean;
  readonly table: string;
  readonly unique: boolean;
  /**
   * Whether the database reports the index as complete and usable.
   */
  readonly valid: boolean;
}
/**
 * Reads normalized index metadata for the provided database tables.
 */
type DatabaseIndexIntrospector = (tableNames: readonly string[]) => Promise<readonly DatabaseIndexMetadata[]>;
//#endregion
//#region src/dialect.d.ts
declare function getKyselyDatabaseType(db: BetterAuthOptions["database"]): KyselyDatabaseType | null;
declare const createKyselyAdapter: (config: BetterAuthOptions) => Promise<{
  kysely: Kysely<any>;
  databaseType: "postgres" | "mysql" | "sqlite" | "mssql";
  introspectIndexes: undefined;
  schemaName: string | undefined;
  transaction: boolean | undefined;
} | {
  kysely: Kysely<any> | null;
  databaseType: KyselyDatabaseType | null;
  introspectIndexes: DatabaseIndexIntrospector | undefined;
  schemaName: undefined;
  transaction: boolean | undefined;
}>;
//#endregion
//#region src/kysely-adapter.d.ts
interface KyselyAdapterConfig {
  /**
   * Database type.
   *
   * For `"mysql"`, this adapter depends on the driver returning
   * "rows matched" counts from `UPDATE`/`DELETE` operations (in
   * mysql2: `affectedRows`, exposed by Kysely as `numUpdatedRows`).
   * By default, `mysql2` enables this via the `FOUND_ROWS` client
   * flag.
   *
   * Do not disable this flag. If you remove it (e.g. with
   * `flags: '-FOUND_ROWS'` in your pool config), MySQL will report
   * "rows changed" semantics: an idempotent `UPDATE` (where the new
   * value equals the old value) will show zero affected rows, causing
   * adapter methods like `update`, `incrementOne`, or `updateMany` to
   * return `null` or `0` even if a row matched the predicate.
   */
  type?: KyselyDatabaseType | undefined;
  /**
   * Enable debug logs for the adapter
   *
   * @default false
   */
  debugLogs?: DBAdapterDebugLogOption | undefined;
  /**
   * Use plural for table names.
   *
   * @default false
   */
  usePlural?: boolean | undefined;
  /**
   * Whether to execute multiple operations in a transaction.
   *
   * If the database doesn't support transactions,
   * set this to `false` and operations will be executed sequentially.
   * @default false
   */
  transaction?: boolean | undefined;
}
declare const kyselyAdapter: (db: Kysely<any>, config?: KyselyAdapterConfig | undefined) => (options: BetterAuthOptions) => DBAdapter<BetterAuthOptions>;
//#endregion
//#region src/schema-check.d.ts
/**
 * Converts Kysely table metadata into the shape `diffSchema` compares.
 */
declare function toIntrospectedTables(tables: readonly TableMetadata[]): IntrospectedTable[];
/**
 * The expected schema in the identifiers the connection sends. A plugin that
 * renames identifiers, such as `CamelCasePlugin`, does so in `transformQuery`,
 * so compiling one select per table through the connection yields the names
 * the database is asked for. Without such a plugin the schema is unchanged.
 */
declare function toPhysicalSchema(db: Kysely<unknown>, expected: ExpectedSchema): ExpectedSchema;
/**
 * The default schema for migration tooling. Let PostgreSQL resolve role
 * names and privileges, retaining the legacy public fallback when none exists.
 * Runtime validation uses the effective search path instead of this fallback.
 */
declare function getPostgresSchema(db: Kysely<unknown>): Promise<string>;
declare function getMssqlSchema(db: Kysely<unknown>): Promise<string>;
//#endregion
export { DatabaseIndexColumnMetadata, DatabaseIndexIntrospector, DatabaseIndexMetadata, KyselyDatabaseType, createKyselyAdapter, getKyselyDatabaseType, getMssqlSchema, getPostgresSchema, kyselyAdapter, toIntrospectedTables, toPhysicalSchema };