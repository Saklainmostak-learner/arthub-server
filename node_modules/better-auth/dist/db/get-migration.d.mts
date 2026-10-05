import { BetterAuthOptions } from "@better-auth/core";
import { DBFieldAttribute, DBFieldType } from "@better-auth/core/db";
import { BetterAuthError } from "@better-auth/core/error";
import { KyselyDatabaseType } from "@better-auth/kysely-adapter";
import { ResolvedDBTableIndex } from "@better-auth/core/db/internal";

//#region src/db/get-migration.d.ts
/**
 * Thrown when {@link getMigrations} refuses to add a required column with no
 * default value to a populated table. Distinct from the plain
 * {@link BetterAuthError} thrown for index-definition conflicts, so callers
 * can tell the two apart without matching on message text.
 */
declare class UnsafeMigrationError extends BetterAuthError {}
declare function matchType(columnDataType: string, fieldType: DBFieldType, dbType: KyselyDatabaseType): boolean;
/**
 * Build the migration plan that `auth migrate` executes and `auth generate`
 * prints for the Kysely adapter.
 *
 * Adding a required column without a default to a populated table is refused:
 * existing rows have no value to backfill. `throwOnUnsafe` picks how that
 * refusal is delivered: executing callers get an {@link UnsafeMigrationError},
 * read-only callers get the plan plus the same message in `unsafeChanges`.
 *
 * @throws {UnsafeMigrationError} when a required column cannot be migrated
 * safely and `throwOnUnsafe` is left on.
 * @throws {BetterAuthError} when an index definition conflicts with an
 * existing or already-planned index.
 */
declare function getMigrations(config: BetterAuthOptions, {
  throwOnUnsafe
}?: {
  throwOnUnsafe?: boolean;
}): Promise<{
  toBeCreated: {
    table: string;
    fields: Record<string, DBFieldAttribute>;
    order: number;
  }[];
  toBeAdded: {
    table: string;
    fields: Record<string, DBFieldAttribute>;
    order: number;
  }[];
  toBeAddedIndexes: {
    table: string;
    index: ResolvedDBTableIndex;
    name: string;
  }[];
  unsafeChanges: string[];
  schemaProblems: string[];
  runMigrations: () => Promise<void>;
  compileMigrations: () => Promise<string>;
}>;
//#endregion
export { UnsafeMigrationError, getMigrations, matchType };