CREATE TABLE IF NOT EXISTS "event_cost_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"description" text NOT NULL,
	"total_cost" integer DEFAULT 0 NOT NULL,
	"markup_rate" integer DEFAULT 10 NOT NULL,
	"billing_date" date,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_cost_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cost_item_id" uuid NOT NULL,
	"recipient_name" text NOT NULL,
	"base_amount" integer DEFAULT 0 NOT NULL,
	"markup_amount" integer DEFAULT 0 NOT NULL,
	"total_billed" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "looop_contracts" ALTER COLUMN "payment_method" SET DEFAULT 'credit_card';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kana" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "affiliation" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lark_user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lark_email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lark_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "source_type" text DEFAULT 'event' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "condition" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "has_solar_panel" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "has_battery" text;--> statement-breakpoint
ALTER TABLE "looop_contracts" ADD COLUMN "is_telemarketing_acquisition" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_cost_items" ADD CONSTRAINT "event_cost_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_cost_splits" ADD CONSTRAINT "event_cost_splits_cost_item_id_event_cost_items_id_fk" FOREIGN KEY ("cost_item_id") REFERENCES "public"."event_cost_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_cost_items_event_idx" ON "event_cost_items" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_cost_splits_cost_item_idx" ON "event_cost_splits" USING btree ("cost_item_id");