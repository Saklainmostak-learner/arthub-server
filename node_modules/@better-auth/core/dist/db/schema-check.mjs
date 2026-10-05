import { SchemaMismatchError } from "./schema-diff.mjs";
//#region src/db/schema-check.ts
/**
* Whether the adapter validates its schema. Enabled in every environment
* unless explicitly disabled.
*/
function checksSchema(options) {
	return options.advanced?.database?.validateSchema !== false;
}
const schemaChecks = /* @__PURE__ */ new WeakMap();
const schemaRevisions = /* @__PURE__ */ new WeakMap();
/** Invalidates cached checks after Better Auth changes this database's schema. */
function invalidateSchemaChecks(database) {
	const revision = schemaRevisions.get(database);
	if (revision) revision.value++;
}
/**
* Attaches a check to the adapter it verifies. The adapter object itself is
* left untouched, so this works for adapters Better Auth does not own.
*/
function registerSchemaCheck(adapter, check, options = {}) {
	const runtimeEnabled = options.runtimeEnabled ?? true;
	schemaChecks.set(adapter, {
		check,
		runtimeEnabled
	});
}
/**
* The registered check, regardless of whether runtime validation is enabled.
*/
function schemaCheckFor(adapter) {
	return schemaChecks.get(adapter)?.check;
}
/**
* The check used by runtime paths, when runtime validation is enabled.
*/
function runtimeSchemaCheckFor(adapter) {
	const registration = schemaChecks.get(adapter);
	return registration?.runtimeEnabled ? registration.check : void 0;
}
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
function createSchemaCheck(find, source, database) {
	let revision = database ? schemaRevisions.get(database) : void 0;
	if (database && !revision) {
		revision = { value: 0 };
		schemaRevisions.set(database, revision);
	}
	let checkedRevision = revision?.value;
	let clean = false;
	let verdict;
	const checkSchema = function checkSchema() {
		const currentRevision = revision?.value;
		if (checkedRevision !== currentRevision) {
			checkedRevision = currentRevision;
			clean = false;
			verdict = void 0;
		}
		if (clean) return;
		return verdict ??= Promise.resolve().then(find).then((findings) => {
			if (revision?.value !== currentRevision) return checkSchema();
			if (findings.length) throw new SchemaMismatchError(findings, source);
			if (checkedRevision === currentRevision) clean = true;
		}, (error) => {
			if (revision?.value !== currentRevision) return checkSchema();
			if (checkedRevision === currentRevision) verdict = void 0;
			throw error;
		});
	};
	checkSchema.source = source;
	return checkSchema;
}
//#endregion
export { checksSchema, createSchemaCheck, invalidateSchemaChecks, registerSchemaCheck, runtimeSchemaCheckFor, schemaCheckFor };
