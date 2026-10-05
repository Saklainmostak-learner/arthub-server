//#region src/oauth2/basic-credentials.d.ts
/**
 * Encodes an OAuth client id and secret as an HTTP Basic credential string.
 *
 * Follows RFC 6749 §2.3.1: both values are `application/x-www-form-urlencoded`
 * prior to base64 encoding. The returned string is the full value of the
 * `Authorization` header, including the `Basic ` prefix.
 */
declare function encodeBasicCredentials(clientId: string, clientSecret: string): string;
/**
 * Decodes an `Authorization: Basic …` header value into its OAuth client id
 * and secret.
 *
 * Scheme matching is case-insensitive and tolerates one or more spaces
 * between the scheme and credentials per RFC 7235 §2.1. The base64 payload
 * is split on the first `:` only, so secrets containing colons round-trip
 * correctly. Each half is form-url-decoded per RFC 6749 §2.3.1, accepting
 * both `+` and `%20` as space. Per the URL Living Standard, invalid
 * percent-escapes pass through as-is; downstream client lookup will fail
 * with `invalid_client` for malformed credentials.
 *
 * Throws when the header is not a Basic credential, when the base64 payload
 * contains no `:`, or when either half is empty.
 */
declare function decodeBasicCredentials(authorization: string): {
  clientId: string;
  clientSecret: string;
};
//#endregion
export { decodeBasicCredentials, encodeBasicCredentials };