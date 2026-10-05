import { DBFieldAttribute } from "./type.mjs";
import { BetterAuthOptions } from "../types/init-options.mjs";
import { BetterAuthError } from "../error/index.mjs";
//#region src/db/schema-diff.d.ts
/**
 * A column as the database, or an ORM schema definition, reports it.
 */
interface IntrospectedColumn {
  name: string;
  nullable: boolean;
  /**
   * The store fills the column when an insert omits it.
   */
  hasDefault: boolean;
}
/**
 * A table as the database, or an ORM schema definition, reports it.
 */
interface IntrospectedTable {
  name: string;
  /**
   * The schema the table lives in, when the store has schemas.
   */
  schema?: string | undefined;
  columns: IntrospectedColumn[];
}
/**
 * The tables Better Auth writes, keyed the way the store addresses them:
 * physical table name, then physical column name. A table that manages its
 * own storage is excluded from migrations and from this comparison.
 */
type ExpectedSchema = Record<string, {
  fields: Record<string, DBFieldAttribute>;
  idColumn?: string | undefined;
  disableMigrations?: boolean | undefined;
  /**
   * The schema the table is addressed in. Unset when the store has no
   * schemas or the table is found by name alone.
   */
  schema?: string | undefined;
}>;
/**
 * The tables this configuration writes, keyed the way the adapter addresses
 * them. Tables that share a physical name are merged into one entry.
 */
declare function getExpectedSchema(options: BetterAuthOptions, {
  usePlural
}?: {
  usePlural?: boolean | undefined;
}): ExpectedSchema;
type SchemaFinding = {
  kind: "missing-table";
  table: string;
} | {
  kind: "missing-column";
  table: string;
  column: string;
} | {
  kind: "unexpected-required-column";
  table: string;
  column: string;
};
/**
 * How the schema reaches the store, which decides the fix each finding names.
 */
type SchemaSource = "database" | "drizzle" | "prisma";
/**
 * Compares the tables Better Auth writes with what the store holds.
 *
 * A table or column Better Auth writes must exist. A column Better Auth does
 * not write must accept an insert that omits it, so it is nullable or carries
 * a default. Otherwise every insert into that table fails with a constraint
 * error that says nothing about why the schema drifted.
 */
declare function diffSchema(expected: ExpectedSchema, actual: readonly IntrospectedTable[]): SchemaFinding[];
/**
 * One finding as a sentence that names the change resolving it.
 */
declare function formatSchemaFinding(finding: SchemaFinding, source: SchemaSource): string;
/**
 * The store cannot hold what this configuration writes.
 *
 * `findings` carries every problem as data; `message` lists each one with the
 * change that resolves it. Reported during initialization and thrown when
 * requests await validation, in every environment. Also thrown by
 * `auth migrate` before it changes anything.
 *
 * @example
 * ```ts
 * try {
 *   await auth.api.getSession({ headers });
 * } catch (error) {
 *   if (error instanceof SchemaMismatchError) console.error(error.findings);
 * }
 * ```
 */
declare class SchemaMismatchError extends BetterAuthError {
  readonly findings: readonly SchemaFinding[];
  readonly source: SchemaSource;
  readonly code = "SCHEMA_MISMATCH";
  constructor(findings: readonly SchemaFinding[], source: SchemaSource);
}
//#endregion
export { ExpectedSchema, IntrospectedColumn, IntrospectedTable, SchemaFinding, SchemaMismatchError, SchemaSource, diffSchema, formatSchemaFinding, getExpectedSchema };