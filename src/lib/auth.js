import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

import { getDatabase } from "../config/db.js";

export function createAuth() {
  const db = getDatabase();

  return betterAuth({
    database: mongodbAdapter(db),

    secret: process.env.BETTER_AUTH_SECRET,

    baseURL:
      process.env.BETTER_AUTH_URL ||
      "http://localhost:5000",

    trustedOrigins: [
      process.env.CLIENT_URL ||
        "http://localhost:3000",

      "http://localhost:3000",

      "http://localhost:5000",

      "https://arthub-client-sigma.vercel.app",

      "https://arthub-client-*.vercel.app",
    ],

    advanced: {
      useSecureCookies:
        process.env.NODE_ENV ===
        "production",

      defaultCookieAttributes: {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          process.env.NODE_ENV ===
          "production"
            ? "none"
            : "lax",
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
          process.env
            .GOOGLE_CLIENT_SECRET,
      },
    },

    /*
     * SECURITY:
     *
     * Collector and Artist are public
     * registration roles.
     *
     * Admin is never accepted from
     * public signup input.
     *
     * Admin promotion is handled by
     * the protected Admin API.
     */
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
            /*
             * Prevent Better Auth's
             * normal user-update flow
             * from changing roles.
             *
             * Admin role changes are
             * performed directly by
             * the protected admin API.
             */
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

          /*
           * The public registration UI
           * sends user/artist.
           *
           * databaseHooks above validates
           * the value before storage and
           * never permits admin signup.
           */
          input: true,
        },
      },
    },
  });
}