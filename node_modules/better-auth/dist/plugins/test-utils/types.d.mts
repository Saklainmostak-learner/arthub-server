import { Session, User } from "../../types/models.mjs";
//#region src/plugins/test-utils/types.d.ts
interface TestUtilsOptions {
  /** Capture OTPs in memory when created (doesn't prevent sending) */
  captureOTP?: boolean;
}
interface TestCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  expires?: number;
}
interface LoginResult {
  session: Session;
  user: User;
  headers: Headers;
  cookies: TestCookie[];
  token: string;
}
/** Options for creating a session with the test auth helpers. */
interface TestAuthOptions {
  userId: string;
  /** Additional session fields. Standard session fields are ignored. */
  session?: Record<string, unknown>;
}
interface TestHelpers {
  createUser(overrides?: Partial<User> & Record<string, unknown>): User;
  createOrganization?(overrides?: Record<string, unknown>): Record<string, unknown>;
  saveUser(user: User): Promise<User>;
  saveOrganization?(org: Record<string, unknown>): Promise<Record<string, unknown>>;
  addMember?(opts: {
    userId: string;
    organizationId: string;
    role?: string;
  }): Promise<Record<string, unknown>>;
  deleteUser(userId: string): Promise<void>;
  deleteOrganization?(orgId: string): Promise<void>;
  login(opts: TestAuthOptions): Promise<LoginResult>;
  getAuthHeaders(opts: TestAuthOptions): Promise<Headers>;
  getCookies(opts: TestAuthOptions & {
    domain?: string;
  }): Promise<TestCookie[]>;
  getOTP?(identifier: string): string | undefined;
  clearOTPs?(): void;
}
//#endregion
export { LoginResult, TestAuthOptions, TestCookie, TestHelpers, TestUtilsOptions };