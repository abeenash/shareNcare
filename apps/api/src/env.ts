import { z } from "zod";

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    UPSTASH_REDIS_REST_URL: z.url({ protocol: /^https$/ }),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32, "Must be at least 32 characters"),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    RATE_LIMIT: z.enum(["on", "off"]).default("on"),
    STORAGE_ENDPOINT: z.url(),
    STORAGE_BUCKET: z.string().min(1),
    STORAGE_ACCESS_KEY_ID: z.string().min(1),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
    STORAGE_REGION: z.string().default("auto"),
    CRON_SECRET: z.string().min(32, "Must be at least 32 characters"),
    EMAIL_CODES: z.enum(["on", "off"]).default("off"),
    MAIL_TRANSPORT: z.enum(["console", "file", "resend"]).default("console"),
    MAIL_OUTBOX_DIR: z.string().min(1).optional(),
    MAIL_FROM: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    PASSWORD_BREACH_CHECK: z.enum(["on", "off"]).default("on"),
    SENTRY_DSN: z.url().optional(),
    AI_FEATURES: z.enum(["on", "off"]).default("off"),
    AI_PROVIDER: z.enum(["fake", "cloudflare", "groq"]).default("fake"),
    AI_MODEL: z.string().min(1).optional(),
    AI_API_KEY: z.string().min(1).optional(),
    CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    const problem = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (env.MAIL_TRANSPORT === "file" && !env.MAIL_OUTBOX_DIR) {
      problem("MAIL_OUTBOX_DIR", "Needed when MAIL_TRANSPORT is file");
    }
    if (env.MAIL_TRANSPORT === "resend") {
      if (!env.RESEND_API_KEY) problem("RESEND_API_KEY", "Needed when MAIL_TRANSPORT is resend");
      if (!env.MAIL_FROM) problem("MAIL_FROM", "Needed when MAIL_TRANSPORT is resend");
    }
    if (
      env.NODE_ENV === "production" &&
      env.EMAIL_CODES === "on" &&
      env.MAIL_TRANSPORT === "console"
    ) {
      problem("MAIL_TRANSPORT", "Codes can't be printed to the logs in production");
    }

    if (env.AI_PROVIDER !== "fake") {
      if (!env.AI_API_KEY) problem("AI_API_KEY", "Needed when AI_PROVIDER is a real one");
      if (!env.AI_MODEL) problem("AI_MODEL", "Needed when AI_PROVIDER is a real one");
    }
    if (env.AI_PROVIDER === "cloudflare" && !env.CLOUDFLARE_ACCOUNT_ID) {
      problem("CLOUDFLARE_ACCOUNT_ID", "Needed when AI_PROVIDER is cloudflare");
    }
  });

export type Env = z.infer<typeof EnvSchema>;

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  console.error(`❌ Invalid environment variables:\n${z.prettifyError(result.error)}`);
  process.exit(1);
}

export const env = result.data;
