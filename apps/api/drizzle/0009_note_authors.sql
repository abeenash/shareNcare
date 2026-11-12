ALTER TABLE "board_notes" ADD COLUMN "author_id" text;--> statement-breakpoint
ALTER TABLE "board_notes" ADD CONSTRAINT "board_notes_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "board_notes_one_per_author" ON "board_notes" USING btree ("board_id","author_id");