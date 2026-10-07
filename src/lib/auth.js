import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

import { getDatabase } from "../config/db.js";

export function createAuth() {
  const db = getDatabase();

  const appUrl =
    process.env.CLIENT_URL ||
    "http://localhost:3000";

  return betterAuth({
    database: mongodbAdapter(db),

    secret:
      process.env.BETTER_AUTH_SECRET,

    baseURL: appUrl,

    trustedOrigins: [
      appUrl,
      "http://localhost:3000",
      "http://localhost:5000",
    ],

    advanced: {
      useSecureCookies:
        appUrl.startsWith("https://"),

      defaultCookieAttributes: {
        httpOnly: true,

        secure:
          appUrl.startsWith("https://"),

        sameSite: "lax",
      },
    },

    emailAndPassword: {
      enabled: true,
    },

    account: {
      accountLinking: {
        enabled: true,

        trustedProviders: [
          "google",
        ],
      },
    },

    socialProviders: {
      google: {
        clientId:
          process.env.GOOGLE_CLIENT_ID,

        clientSecret:
          process.env
            .GOOGLE_CLIENT_SECRET,

        prompt:
          "select_account",
      },
    },

    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const safeRole =
              user.role === "artist"
                ? "artist"
                : "user";

            return {
              data: {
                ...user,
                role: safeRole,
              },
            };
          },
        },

        update: {
          before: async (
            userData
          ) => {
            const {
              role: _role,
              ...safeUserData
            } = userData;

            return {
              data:
                safeUserData,
            };
          },
        },
      },
    },

    user: {
      additionalFields: {
        role: {
          type: [
            "user",
            "artist",
            "admin",
          ],

          required: false,

          defaultValue:
            "user",

          input: true,
        },
      },
    },
  });
}