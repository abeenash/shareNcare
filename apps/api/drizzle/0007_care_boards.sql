CREATE TABLE "board_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"message" text NOT NULL,
	"color" text DEFAULT 'yellow' NOT NULL,
	"guest_key_hash" text NOT NULL,
	"hidden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_reports" (
	"note_id" uuid NOT NULL,
	"reporter_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "board_reports_note_id_reporter_hash_pk" PRIMARY KEY("note_id","reporter_hash")
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"recipient" text NOT NULL,
	"token" text NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boards_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "board_notes" ADD CONSTRAINT "board_notes_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_reports" ADD CONSTRAINT "board_reports_note_id_board_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."board_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_notes_board_id_idx" ON "board_notes" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "boards_owner_id_idx" ON "boards" USING btree ("owner_id");