ALTER TABLE "notes" ADD COLUMN "recipient" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_share_token_unique" UNIQUE("share_token");