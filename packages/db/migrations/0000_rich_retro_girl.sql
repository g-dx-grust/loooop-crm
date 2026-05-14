CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"manager_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_user_id" text,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"team_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"auth_provider" text DEFAULT 'password' NOT NULL,
	"password_hash" text,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_external_user_id_unique" UNIQUE("external_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"venue_name" text,
	"venue_address" text,
	"event_date" date,
	"area" text,
	"staff_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"cost" integer,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"postal_code" text,
	"prefecture" text,
	"city" text,
	"street" text,
	"building" text,
	"address_text" text,
	"google_formatted_address" text,
	"google_maps_url" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"google_place_id" text,
	"pin_confirmed" boolean DEFAULT false NOT NULL,
	"pin_corrected" boolean DEFAULT false NOT NULL,
	"pin_correction_note" text,
	"accuracy_status" text DEFAULT 'unconfirmed' NOT NULL,
	"residence_type" text,
	"ownership_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_id" text NOT NULL,
	"name" text NOT NULL,
	"kana" text,
	"phone_enc" "bytea" NOT NULL,
	"phone_hash" "bytea" NOT NULL,
	"phone_sub_enc" "bytea",
	"email_enc" "bytea",
	"birth_date" date,
	"age_range" text,
	"household_info" text,
	"preferred_contact_time" text,
	"current_mobile_carrier" text,
	"current_wifi_carrier" text,
	"memo" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "customers_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"event_id" uuid,
	"staff_id" uuid,
	"lead_status" text DEFAULT 'new' NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "looop_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"lead_id" uuid,
	"application_id" text,
	"current_power_company" text,
	"current_plan" text,
	"monthly_electric_bill" integer,
	"wattage" integer,
	"bill_usage_month" text,
	"plan_code" text DEFAULT 'smart_time_one_lighting' NOT NULL,
	"payment_method" text DEFAULT 'bank_account' NOT NULL,
	"supply_start_date" date,
	"termination_date" date,
	"memo" text,
	"status" text DEFAULT 'not_proposed' NOT NULL,
	"application_date" date,
	"contract_date" date,
	"opened_date" date,
	"cancel_date" date,
	"cancel_reason" text,
	"unit_price" integer DEFAULT 30000 NOT NULL,
	"revenue_month" text,
	"payment_status" text DEFAULT 'unbilled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "electricity_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"contract_id" uuid,
	"bill_month" text NOT NULL,
	"usage_kwh" integer,
	"electric_fee" integer,
	"payment_method" text NOT NULL,
	"plan_code" text DEFAULT 'smart_time_one_lighting' NOT NULL,
	"application_month" text,
	"contract_month" text,
	"supply_start_date" date,
	"expected_payment_month" text,
	"paid_amount" integer,
	"fee_amount" integer NOT NULL,
	"admin_fee" integer DEFAULT 2000 NOT NULL,
	"net_fee" integer NOT NULL,
	"minimum_applied" integer DEFAULT 0 NOT NULL,
	"refund_flagged" integer DEFAULT 0 NOT NULL,
	"fee_master_id" uuid,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fee_master" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_code" text NOT NULL,
	"payment_method" text NOT NULL,
	"kwh_min" integer NOT NULL,
	"kwh_max" integer,
	"fee_amount" integer NOT NULL,
	"admin_fee" integer DEFAULT 2000 NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"contract_id" uuid,
	"bill_id" uuid,
	"reason_code" text NOT NULL,
	"cancel_date" date,
	"termination_date" date,
	"supply_start_date" date,
	"refund_month" text,
	"refund_amount" integer NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cross_sell_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_type" text NOT NULL,
	"interest_rank" text,
	"status" text DEFAULT 'not_proposed' NOT NULL,
	"next_action_date" date,
	"expected_revenue" integer,
	"actual_revenue" integer,
	"gross_profit" integer,
	"memo" text,
	"ai_score" text,
	"ai_score_reason" text,
	"ai_scored_at" timestamp with time zone,
	"last_reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_text_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" text NOT NULL,
	"consent_type" text NOT NULL,
	"body" text NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_text_versions_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"consent_type" text NOT NULL,
	"consent_status" text NOT NULL,
	"consent_text_version" text NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"consented_by" uuid,
	"ip_address" "inet",
	"user_agent" text,
	"withdrawn_at" timestamp with time zone,
	"withdrawal_reason" text,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"product_type" text NOT NULL,
	"contact_email" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_handoffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"partner_company_id" uuid,
	"product_type" text NOT NULL,
	"shared_items" jsonb NOT NULL,
	"shared_at" timestamp with time zone NOT NULL,
	"shared_by" uuid,
	"handoff_status" text DEFAULT 'handed_off' NOT NULL,
	"csv_export_id" uuid,
	"partner_result" text,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"staff_id" uuid,
	"activity_type" text NOT NULL,
	"content" text,
	"next_action_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"file_type" text NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text,
	"mime_type" text,
	"size_bytes" integer,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"diff" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "csv_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exporter_user_id" uuid,
	"exported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"target_partner_id" uuid,
	"record_count" integer NOT NULL,
	"customer_ids" jsonb NOT NULL,
	"filter_snapshot" jsonb,
	"file_blob_url" text,
	"reason" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "looop_contracts" ADD CONSTRAINT "looop_contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "looop_contracts" ADD CONSTRAINT "looop_contracts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "electricity_bills" ADD CONSTRAINT "electricity_bills_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "electricity_bills" ADD CONSTRAINT "electricity_bills_contract_id_looop_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."looop_contracts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "electricity_bills" ADD CONSTRAINT "electricity_bills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refunds" ADD CONSTRAINT "refunds_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refunds" ADD CONSTRAINT "refunds_contract_id_looop_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."looop_contracts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refunds" ADD CONSTRAINT "refunds_bill_id_electricity_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."electricity_bills"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refunds" ADD CONSTRAINT "refunds_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_sell_opportunities" ADD CONSTRAINT "cross_sell_opportunities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consents" ADD CONSTRAINT "consents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consents" ADD CONSTRAINT "consents_consented_by_users_id_fk" FOREIGN KEY ("consented_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_handoffs" ADD CONSTRAINT "partner_handoffs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_handoffs" ADD CONSTRAINT "partner_handoffs_partner_company_id_partner_companies_id_fk" FOREIGN KEY ("partner_company_id") REFERENCES "public"."partner_companies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_handoffs" ADD CONSTRAINT "partner_handoffs_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "csv_exports" ADD CONSTRAINT "csv_exports_exporter_user_id_users_id_fk" FOREIGN KEY ("exporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "csv_exports" ADD CONSTRAINT "csv_exports_target_partner_id_partner_companies_id_fk" FOREIGN KEY ("target_partner_id") REFERENCES "public"."partner_companies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_roles_role_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_addresses_customer_idx" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_phone_hash_active_uq" ON "customers" USING btree ("phone_hash") WHERE "customers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_created_at_idx" ON "customers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_event_staff_idx" ON "leads" USING btree ("event_id","staff_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_customer_idx" ON "leads" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "looop_status_idx" ON "looop_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "looop_revenue_month_idx" ON "looop_contracts" USING btree ("revenue_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "looop_customer_idx" ON "looop_contracts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "electricity_bills_customer_idx" ON "electricity_bills" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "electricity_bills_month_idx" ON "electricity_bills" USING btree ("bill_month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "electricity_bills_customer_month_uq" ON "electricity_bills" USING btree ("customer_id","bill_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fee_master_lookup_idx" ON "fee_master" USING btree ("plan_code","payment_method","effective_from");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refunds_customer_idx" ON "refunds" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refunds_month_idx" ON "refunds" USING btree ("refund_month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cross_sell_customer_product_uq" ON "cross_sell_opportunities" USING btree ("customer_id","product_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cross_sell_status_idx" ON "cross_sell_opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consents_customer_type_idx" ON "consents" USING btree ("customer_id","consent_type","consented_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handoffs_customer_idx" ON "partner_handoffs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handoffs_status_idx" ON "partner_handoffs" USING btree ("handoff_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_customer_idx" ON "activities" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_customer_idx" ON "files" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_action_idx" ON "audit_logs" USING btree ("action");