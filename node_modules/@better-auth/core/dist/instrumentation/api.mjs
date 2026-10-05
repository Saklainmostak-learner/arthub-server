import { noopOpenTelemetryAPI } from "./noop.mjs";
//#region src/instrumentation/api.ts
let openTelemetryAPIPromise;
let openTelemetryAPI;
async function loadOpenTelemetryAPI() {
	try {
		openTelemetryAPI = await import("@opentelemetry/api");
	} catch {}
}
function getOpenTelemetryAPI() {
	if (!openTelemetryAPIPromise) openTelemetryAPIPromise = loadOpenTelemetryAPI();
	return openTelemetryAPI ?? noopOpenTelemetryAPI;
}
//#endregion
export { getOpenTelemetryAPI };
