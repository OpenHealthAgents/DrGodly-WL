import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { getBaseUrl } from "./region-shared";
import prisma from "./prisma";

const baseURL = getBaseUrl();

function getTrustedOrigins(url: string) {
  try {
    const parsedUrl = new URL(url);
    const origins = [parsedUrl.origin];

    if (parsedUrl.hostname.startsWith("www.")) {
      origins.push(`${parsedUrl.protocol}//${parsedUrl.hostname.slice(4)}`);
    } else if (!parsedUrl.hostname.includes("localhost")) {
      origins.push(`${parsedUrl.protocol}//www.${parsedUrl.hostname}`);
    }

    return Array.from(new Set(origins));
  } catch {
    return [];
  }
}

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    ? {
        apple: {
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
        },
      }
    : {}),
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL,
  trustedOrigins: getTrustedOrigins(baseURL),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders,
  plugins: [
    admin()
  ]
});
