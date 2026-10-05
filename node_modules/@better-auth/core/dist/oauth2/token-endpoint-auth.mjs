import { getPrimaryClientId } from "./utils.mjs";
import { encodeBasicCredentials } from "./basic-credentials.mjs";
import { resolveClientAssertionParams } from "./client-assertion.mjs";
//#region src/oauth2/token-endpoint-auth.ts
function getDefaultTokenEndpointAuth(options, authentication) {
	if (authentication === "basic") return { method: "client_secret_basic" };
	if (options.clientSecret) return { method: "client_secret_post" };
	return { method: "none" };
}
function assertNoClientSecret(method, options, body) {
	if (options.clientSecret || body.has("client_secret")) throw new Error(`${method} token endpoint authentication cannot be combined with clientSecret`);
}
function setClientId(body, clientId) {
	if (clientId) body.set("client_id", clientId);
}
function assertClientSecretConfigured(method, options) {
	if (!options.clientSecret) throw new Error(`${method} token endpoint authentication requires clientSecret`);
}
function assertClientIdConfigured(method, clientId) {
	if (!clientId) throw new Error(`${method} token endpoint authentication requires clientId`);
}
function setClientSecretPostAuth({ body, options, clientId, requireClientSecret }) {
	if (requireClientSecret) assertClientSecretConfigured("client_secret_post", options);
	if (options.clientSecret) {
		assertClientIdConfigured("client_secret_post", clientId);
		setClientId(body, clientId);
		body.set("client_secret", options.clientSecret);
	}
}
function setClientSecretBasicAuth({ headers, options, clientId, body }) {
	if (body.has("client_secret")) throw new Error("client_secret_basic token endpoint authentication cannot be combined with client_secret body parameters");
	assertClientSecretConfigured("client_secret_basic", options);
	assertClientIdConfigured("client_secret_basic", clientId);
	headers.authorization = encodeBasicCredentials(clientId, options.clientSecret);
}
function assertCompleteManualClientAssertion(body) {
	if (body.has("client_assertion") !== body.has("client_assertion_type")) throw new Error("client_assertion and client_assertion_type must both be provided");
}
async function applyTokenEndpointAuth({ body, headers, options, tokenEndpoint, grantType, tokenEndpointAuth, authentication }) {
	assertCompleteManualClientAssertion(body);
	const clientId = getPrimaryClientId(options.clientId);
	if (body.has("client_assertion")) {
		if (tokenEndpointAuth) throw new Error("client_assertion body parameters cannot be combined with tokenEndpointAuth");
		assertNoClientSecret("private_key_jwt", options, body);
		setClientId(body, clientId);
		return;
	}
	const auth = tokenEndpointAuth ?? getDefaultTokenEndpointAuth(options, authentication);
	if (auth.method === "custom") {
		await auth.customizeRequest({
			body,
			headers,
			options,
			tokenEndpoint,
			grantType
		});
		assertCompleteManualClientAssertion(body);
		return;
	}
	if (auth.method === "private_key_jwt") {
		assertNoClientSecret(auth.method, options, body);
		assertClientIdConfigured(auth.method, clientId);
		if (!tokenEndpoint) throw new Error("private_key_jwt token endpoint authentication requires tokenEndpoint");
		const assertionParams = await resolveClientAssertionParams({
			getClientAssertion: auth.getClientAssertion,
			context: {
				clientId,
				tokenEndpoint,
				grantType
			}
		});
		setClientId(body, clientId);
		for (const [key, value] of Object.entries(assertionParams)) body.set(key, value);
		return;
	}
	if (auth.method === "none") {
		assertNoClientSecret(auth.method, options, body);
		if (grantType === "client_credentials") throw new Error("none token endpoint authentication cannot be used with client_credentials grant");
		assertClientIdConfigured(auth.method, clientId);
		setClientId(body, clientId);
		return;
	}
	if (auth.method === "client_secret_basic") {
		setClientSecretBasicAuth({
			headers,
			options,
			clientId,
			body
		});
		return;
	}
	setClientSecretPostAuth({
		body,
		options,
		clientId,
		requireClientSecret: tokenEndpointAuth?.method === "client_secret_post"
	});
}
//#endregion
export { applyTokenEndpointAuth };
