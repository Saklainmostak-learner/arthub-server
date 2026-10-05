import { toNodeHandler } from "../integrations/node.mjs";
import { getTestInstance } from "./test-instance.mjs";
import { createServer } from "node:http";
//#region src/test-utils/http-test-instance.ts
const closeHttpServer = (server) => new Promise((resolve, reject) => {
	server.close((error) => {
		if (error) {
			reject(error);
			return;
		}
		resolve();
	});
});
const endUnhandledErrorResponse = (res, error) => {
	if (res.writableEnded || res.destroyed) return;
	if (res.headersSent) {
		res.end();
		return;
	}
	res.statusCode = 500;
	res.end(error instanceof Error ? error.message : "Internal Server Error");
};
/**
* Binds an HTTP listener to an OS-assigned port before the final request
* handler exists. This lets tests construct URL-sensitive applications only
* after the listener owns its port, then install the application handler.
*/
async function createHttpTestServer() {
	let activeHandler = (_req, res) => {
		res.statusCode = 503;
		res.end("Test HTTP listener has no handler bound yet");
	};
	const nodeServer = createServer((req, res) => {
		Promise.resolve(activeHandler(req, res)).catch((error) => {
			endUnhandledErrorResponse(res, error);
		});
	});
	await new Promise((resolve, reject) => {
		const onError = (error) => {
			nodeServer.off("listening", onListening);
			reject(error);
		};
		const onListening = () => {
			nodeServer.off("error", onError);
			resolve();
		};
		nodeServer.once("error", onError);
		nodeServer.once("listening", onListening);
		nodeServer.listen(0, "127.0.0.1");
	});
	const address = nodeServer.address();
	if (!address || typeof address === "string") {
		await closeHttpServer(nodeServer);
		throw new Error("HTTP test listener did not report a bound port for the test listener");
	}
	return {
		url: `http://127.0.0.1:${address.port}`,
		address,
		server: nodeServer,
		setRequestHandler(handler) {
			activeHandler = handler;
		},
		close: () => closeHttpServer(nodeServer)
	};
}
/**
* Like `getTestInstance`, but bound to an actual HTTP listener on an
* OS-assigned port (`port: 0`). The discovered URL is fed back into the auth
* instance so its `baseURL` matches the listener.
*
* This removes the race window that the temp-server-then-rebind pattern
* introduces. The listener is bound once, holds the port for its lifetime,
* and only swaps in the real request handler after the auth instance is
* fully constructed.
*
* The caller is responsible for calling `server.close()` in `afterAll`. Any
* `baseURL` passed in `options` is ignored — the URL must match the
* listener.
*/
async function getHttpTestInstance(options, config) {
	const server = await createHttpTestServer();
	const baseURL = server.url;
	try {
		const instance = await getTestInstance({
			...options,
			baseURL
		}, {
			clientOptions: config?.clientOptions,
			disableTestUser: config?.disableTestUser,
			testUser: config?.testUser,
			testWith: config?.testWith,
			transaction: config?.transaction
		});
		server.setRequestHandler(config?.handler ? config.handler(instance.auth) : toNodeHandler(instance.auth.handler));
		return {
			...instance,
			server,
			baseURL,
			port: server.address.port
		};
	} catch (error) {
		await server.close();
		throw error;
	}
}
//#endregion
export { createHttpTestServer, getHttpTestInstance };
