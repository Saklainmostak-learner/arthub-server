import { Session, User } from "../types/models.mjs";
import { BetterAuthClientOptions } from "@better-auth/core";
import { BetterFetch } from "@better-fetch/fetch";

//#region src/client/session-atom.d.ts
type SessionData = {
  user: User;
  session: Session;
} & Record<string, any>;
//#endregion
export { SessionData };