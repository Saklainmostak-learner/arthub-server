import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

import { getDatabase } from "../config/db.js";

export function createAuth() {
  const db = getDatabase();

  return betterAuth({
    database: mongodbAdapter(db),

    secret: process.env.BETTER_AUTH_SECRET,

    baseURL:
      process.env.NODE_ENV === "production"
        ? "https://arthub-client-sigma.vercel.app"
        : "http://localhost:5000",

    trustedOrigins: [
      "https://arthub-client-sigma.vercel.app",
      "http://localhost:3000",
      "http://localhost:5000",
    ],

    advanced: {
      useSecureCookies:
        process.env.NODE_ENV === "production",

      defaultCookieAttributes: {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    },

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
          before: async (userData) => {
            const {
              role: _role,
              ...safeUserData
            } = userData;

            return {
              data: safeUserData,
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

          defaultValue: "user",

          input: true,
        },
      },
    },
  });
}