import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

import { getDatabase } from "../config/db.js";

export function createAuth() {
  const db = getDatabase();

  const clientUrl =
    process.env.CLIENT_URL ||
    "http://localhost:3000";

  const authUrl =
    process.env.BETTER_AUTH_URL ||
    "http://localhost:5000";

  const trustedOrigins = [
    clientUrl,
    authUrl,
    "http://localhost:3000",
    "http://localhost:5000",
  ].filter(Boolean);

  return betterAuth({
    database: mongodbAdapter(db),

    secret:
      process.env.BETTER_AUTH_SECRET,

    baseURL: authUrl,

    trustedOrigins,

    emailAndPassword: {
      enabled: true,
    },

    socialProviders: {
      google: {
        clientId:
          process.env.GOOGLE_CLIENT_ID,

        clientSecret:
          process.env.GOOGLE_CLIENT_SECRET,
      },
    },

    user: {
      additionalFields: {
        role: {
          type: ["user", "artist"],
          required: false,
          defaultValue: "user",
          input: true,
        },
      },
    },
  });
}