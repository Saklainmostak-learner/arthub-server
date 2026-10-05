import { Awaitable } from "../types/helper.mjs";
import { BetterAuthOptions } from "../types/init-options.mjs";
import { SchemaFinding, SchemaSource } from "./schema-diff.mjs";
//#region src/db/schema-check.d.ts
/**
 * Whether the adapter validates its schema. Enabled in every environment
 * unless explicitly disabled.
 */
declare function checksSchema(options: BetterAuthOptions): boolean;
/**
 * Resolves when the schema can hold what Better Auth writes. Returns nothing
 * once that is known and the database schema revision is unchanged.
 */
type SchemaCheck = (() => Promise<void> | undefined) & {
  source?: SchemaSource;
};
type SchemaCheckRegistrationOptions = {
  runtimeEnabled?: boolean;
};
/** Invalidates cached checks after Better Auth changes this database's schema. */
declare function invalidateSchemaChecks(database: object): void;
/**
 * Attaches a check to the adapter it verifies. The adapter object itself is
 * left untouched, so this works for adapters Better Auth does not own.
 */
declare function registerSchemaCheck(adapter: object, check: SchemaCheck, options?: SchemaCheckRegistrationOptions): void;
/**
 * The registered check, regardless of whether runtime validation is enabled.
 */
declare function schemaCheckFor(adapter: object): SchemaCheck | undefined;
/**
 * The check used by runtime paths, when runtime validation is enabled.
 */
declare function runtimeSchemaCheckFor(adapter: object): SchemaCheck | undefined;
/**
 * Turns a schema comparison into a check shared by one adapter instance.
 *
 * The first call runs `find` and every concurrent call shares that promise. A
 * clean result is cached until invalidation. A mismatch is kept as one
 * {@link SchemaMismatchError} and rethrown on every later call without asking
 * the store again, until a migration invalidates it. When a database identity is supplied,
 * checks for that identity share its schema revision. Pending callers follow
 * the new check if their revision is invalidated. A failure to reach
 * the store is not kept, so the next call asks again.
 *
 * @example
 * ```ts
 * const checkSchema = createSchemaCheck(
 *   () => findSchemaProblems(db, "postgres", expected),
 *   "database",
 * );
 * const pending = checkSchema();
 * if (pending) await pending;
 * ```
 */
declare function createSchemaCheck(find: () => Awaitable<SchemaFinding[]>, source: SchemaSource, database?: object): SchemaCheck;
//#endregion
export { SchemaCheck, checksSchema, createSchemaCheck, invalidateSchemaChecks, registerSchemaCheck, runtimeSchemaCheckFor, schemaCheckFor };