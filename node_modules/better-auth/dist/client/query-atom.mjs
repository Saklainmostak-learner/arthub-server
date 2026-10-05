import { atom } from "nanostores";
//#region src/client/query-atom.ts
const kAuthQuery = Symbol.for("better-auth:auth-query");
function isAuthQueryStore(store) {
	return kAuthQuery in store && store[kAuthQuery] === true;
}
function createAuthQueryAtom(initialValue) {
	const queryAtom = atom(initialValue);
	Object.defineProperty(queryAtom, kAuthQuery, { value: true });
	return queryAtom;
}
//#endregion
export { createAuthQueryAtom, isAuthQueryStore };
