//#region src/utils/middleware-response.ts
const middlewareResponse = ({ message, status, code }) => ({ response: new Response(JSON.stringify({
	message,
	code
}), {
	status,
	headers: { "Content-Type": "application/json" }
}) });
//#endregion
export { middlewareResponse };
