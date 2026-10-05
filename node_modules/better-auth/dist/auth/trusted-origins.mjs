import { wildcardMatch } from "../utils/wildcard.mjs";
import { getHost, getOrigin, getProtocol } from "../utils/url.mjs";
//#region src/auth/trusted-origins.ts
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/;
const RELATIVE_URL_PARSER_ORIGIN = "https://better-auth.invalid";
const ENCODED_PATH_SEPARATOR_PATTERN = /%2[fF]|%5[cC]/;
/**
* Resolves `.` and `..` segments in a path after percent-decoding so a
* path-pinned pattern cannot be bypassed with traversal: e.g.
* `myapp://host/cb/../evil` must not satisfy pattern `myapp://host/cb`.
* Returns "" for an empty or root path.
*/
const normalizePath = (path) => {
	let decoded = path;
	try {
		decoded = decodeURIComponent(path);
	} catch {}
	const segments = [];
	for (const segment of decoded.split("/")) if (segment === "..") segments.pop();
	else if (segment !== "." && segment !== "") segments.push(segment);
	return segments.length > 0 ? `/${segments.join("/")}` : "";
};
/**
* Splits a custom-scheme origin into its scheme, authority and path using
* plain string operations.
*
* `new URL()` is deliberately avoided here: its parsing of non-special schemes
* (e.g. `myapp://`, `exp://`) is not consistent across the runtimes Better Auth
* targets (Node, Bun, Deno, Cloudflare Workers), and the result of an origin
* check must not depend on which engine extracts the authority.
*
* Scheme and authority are lower-cased (matching how a URL canonicalizes its
* host); the path is percent-decoded and resolved so traversal cannot bypass
* a path-pinned pattern.
*/
const parseCustomSchemeOrigin = (value) => {
	if (CONTROL_CHARACTER_PATTERN.test(value)) return null;
	const schemeEnd = value.indexOf(":");
	if (schemeEnd <= 0) return null;
	const scheme = value.slice(0, schemeEnd).toLowerCase();
	let rest = value.slice(schemeEnd + 1);
	let authority = "";
	if (rest.startsWith("//")) {
		rest = rest.slice(2);
		const authorityEnd = rest.search(/[/?#]/);
		if (authorityEnd === -1) {
			authority = rest;
			rest = "";
		} else {
			authority = rest.slice(0, authorityEnd);
			rest = rest.slice(authorityEnd);
		}
	}
	const pathEnd = rest.search(/[?#]/);
	const path = normalizePath(pathEnd === -1 ? rest : rest.slice(0, pathEnd));
	return {
		scheme,
		authority: authority.toLowerCase(),
		path
	};
};
/**
* Validates root-relative redirects against ambiguous browser and router parsing.
*
* @see https://www.rfc-editor.org/rfc/rfc3986.html#section-4.2
* @see https://url.spec.whatwg.org/#concept-basic-url-parser
*/
const isSafeRelativeURL = (value) => {
	if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || CONTROL_CHARACTER_PATTERN.test(value)) return false;
	const pathEnd = value.search(/[?#]/);
	const path = pathEnd === -1 ? value : value.slice(0, pathEnd);
	if (ENCODED_PATH_SEPARATOR_PATTERN.test(path)) return false;
	try {
		return new URL(value, RELATIVE_URL_PARSER_ORIGIN).origin === RELATIVE_URL_PARSER_ORIGIN;
	} catch {
		return false;
	}
};
/**
* Matches the given url against an origin or origin pattern
* See "options.trustedOrigins" for details of supported patterns
*
* @param url The url to test
* @param pattern The origin pattern
* @param [settings] Specify supported pattern matching settings
* @returns {boolean} true if the URL matches the origin pattern, false otherwise.
*/
const matchesOriginPattern = (url, pattern, settings) => {
	if (url.startsWith("/")) return settings?.allowRelativePaths === true && isSafeRelativeURL(url);
	if (pattern.includes("*") || pattern.includes("?")) {
		if (pattern.includes("://")) return wildcardMatch(pattern)(getOrigin(url) || url);
		const host = getHost(url);
		if (!host) return false;
		return wildcardMatch(pattern)(host);
	}
	const protocol = getProtocol(url);
	if (protocol === "http:" || protocol === "https:" || !protocol) return pattern === getOrigin(url);
	const parsed = parseCustomSchemeOrigin(url);
	const parsedPattern = parseCustomSchemeOrigin(pattern);
	if (!parsed || !parsedPattern || parsed.scheme !== parsedPattern.scheme) return false;
	if (parsedPattern.authority && parsed.authority !== parsedPattern.authority) return false;
	if (!parsedPattern.path) return true;
	return parsed.path === parsedPattern.path || parsed.path.startsWith(`${parsedPattern.path}/`);
};
//#endregion
export { matchesOriginPattern };
