import { CODE_MINUTES, MIN_PASSWORD_LENGTH } from "@sharencare/shared";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, haveIBeenPwned } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema";
import { env } from "./env";
import { codeEmail } from "./lib/code-email";
import { sendMail } from "./lib/mailer";

type Switches = {
  emailCodes: boolean;
  breachCheck: boolean;
};

const fromEnv: Switches = {
  emailCodes: env.EMAIL_CODES === "on",
  breachCheck: env.PASSWORD_BREACH_CHECK === "on",
};

export function createAuth(switches: Switches = fromEnv) {
  const codes = emailOTP({
    overrideDefaultEmailVerification: true,
    expiresIn: CODE_MINUTES * 60,
    allowedAttempts: 3,
    storeOTP: "encrypted",
    async sendVerificationOTP({ email, otp, type }) {
      await sendMail({ to: email, ...codeEmail(type, otp, CODE_MINUTES) });
    },
  });

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      requireEmailVerification: switches.emailCodes,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
    },
    account: {
      encryptOAuthTokens: true,
      accountLinking: { updateUserInfoOnLink: true },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ["true-client-ip"] },
    },
    rateLimit: { enabled: env.NODE_ENV === "production" && env.RATE_LIMIT === "on" },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
    },
    plugins: [
      ...(switches.emailCodes ? [codes] : []),
      haveIBeenPwned({
        enabled: switches.breachCheck,
        customPasswordCompromisedMessage:
          "This password has shown up in a data breach, so attackers try it first. Please choose another.",
      }),
    ],
  });
}
