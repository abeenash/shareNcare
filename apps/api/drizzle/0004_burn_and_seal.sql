ALTER TABLE "notes" ADD COLUMN "burn_after_reading" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "burned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "unseal_at" timestamp with time zone;