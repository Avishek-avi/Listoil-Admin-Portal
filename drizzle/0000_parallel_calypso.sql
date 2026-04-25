CREATE TABLE "app_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "app_configs_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "approval_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "approval_statuses_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"record_id" integer NOT NULL,
	"operation" text NOT NULL,
	"action" text NOT NULL,
	"changed_by" integer,
	"change_source" text,
	"correlation_id" text,
	"old_state" jsonb,
	"new_state" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scheme_type" integer NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"budget" integer DEFAULT 0,
	"spent_budget" integer DEFAULT 0,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "client" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" text,
	CONSTRAINT "client_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "counter_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"unique_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"aadhaar" text NOT NULL,
	"pan" text,
	"gst" text,
	"address" text,
	"city" text,
	"district" text,
	"state" text,
	"dob" timestamp,
	"referral_code" text,
	"is_kyc_verified" boolean DEFAULT false,
	"onboarding_type_id" integer NOT NULL,
	"tds_consent" boolean DEFAULT false NOT NULL,
	"bank_account_no" text,
	"bank_account_ifsc" text,
	"bank_account_name" text,
	"upi_id" text,
	"is_bank_validated" boolean DEFAULT false,
	"points_balance" integer DEFAULT 0,
	"sap_customer_code" text,
	"kyc_documents" jsonb,
	"attached_retailer_id" integer,
	"total_earnings" numeric DEFAULT '0',
	"total_balance" numeric DEFAULT '0',
	"total_redeemed" numeric DEFAULT '0',
	"tds_percentage" integer DEFAULT 0,
	"tds_kitty" numeric DEFAULT '0',
	"tds_deducted" numeric DEFAULT '0',
	"last_settlement_date" timestamp,
	CONSTRAINT "counter_sales_unique_id_key" UNIQUE("unique_id"),
	CONSTRAINT "counter_sales_phone_key" UNIQUE("phone"),
	CONSTRAINT "counter_sales_referral_code_key" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "counter_sales_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"earning_type" integer NOT NULL,
	"redemption_type" integer NOT NULL,
	"amount" numeric NOT NULL,
	"type" text NOT NULL,
	"remarks" text,
	"opening_balance" numeric NOT NULL,
	"closing_balance" numeric NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "counter_sales_transaction_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"earning_type" integer NOT NULL,
	"points" numeric NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"sku" text,
	"status" text NOT NULL,
	"batch_number" text,
	"serial_number" text,
	"qr_code" text,
	"remarks" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"metadata" jsonb NOT NULL,
	"scheme_id" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "counter_sales_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"earning_type" integer NOT NULL,
	"points" numeric NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"sku" text,
	"batch_number" text,
	"serial_number" text,
	"qr_code" text,
	"remarks" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"metadata" jsonb NOT NULL,
	"scheme_id" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "creatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_id" integer NOT NULL,
	"url" varchar(500) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"carousel_name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"target_audience" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "creatives_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "creatives_types_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "earning_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "earning_types_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "electrician_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"earning_type" integer NOT NULL,
	"redemption_type" integer NOT NULL,
	"amount" numeric NOT NULL,
	"type" text NOT NULL,
	"remarks" text,
	"opening_balance" numeric NOT NULL,
	"closing_balance" numeric NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "electrician_transaction_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"earning_type" integer NOT NULL,
	"points" numeric NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"sku" text,
	"status" text NOT NULL,
	"batch_number" text,
	"serial_number" text,
	"qr_code" text,
	"remarks" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"metadata" jsonb NOT NULL,
	"scheme_id" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "electrician_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"earning_type" integer NOT NULL,
	"points" numeric NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"sku" text,
	"batch_number" text,
	"serial_number" text,
	"qr_code" text,
	"remarks" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"metadata" jsonb NOT NULL,
	"scheme_id" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "electricians" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"unique_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"aadhaar" text NOT NULL,
	"pan" text,
	"gst" text,
	"address" text,
	"city" text,
	"district" text,
	"state" text,
	"dob" timestamp,
	"referral_code" text,
	"is_kyc_verified" boolean DEFAULT false,
	"onboarding_type_id" integer NOT NULL,
	"tds_consent" boolean DEFAULT false NOT NULL,
	"bank_account_no" text,
	"bank_account_ifsc" text,
	"bank_account_name" text,
	"upi_id" text,
	"is_bank_validated" boolean DEFAULT false,
	"points_balance" integer DEFAULT 0,
	"sap_customer_code" text,
	"kyc_documents" jsonb,
	"electrician_certificate" text,
	"total_earnings" numeric DEFAULT '0',
	"total_balance" numeric DEFAULT '0',
	"total_redeemed" numeric DEFAULT '0',
	"tds_percentage" integer DEFAULT 0,
	"tds_kitty" numeric DEFAULT '0',
	"tds_deducted" numeric DEFAULT '0',
	"last_settlement_date" timestamp,
	CONSTRAINT "electricians_unique_id_key" UNIQUE("unique_id"),
	CONSTRAINT "electricians_phone_key" UNIQUE("phone"),
	CONSTRAINT "electricians_referral_code_key" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "event_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" integer NOT NULL,
	"action" text NOT NULL,
	"event_type" text NOT NULL,
	"entity_id" text,
	"correlation_id" text,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "event_master_event_key_key" UNIQUE("event_key"),
	CONSTRAINT "event_master_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "languages_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "location_entity" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"level_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" text,
	"parent_entity_id" integer
);
--> statement-breakpoint
CREATE TABLE "location_entity_pincode" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"pincode_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_level_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"level_no" integer NOT NULL,
	"level_name" text NOT NULL,
	"parent_level_id" integer
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"type" text NOT NULL,
	"channel" text NOT NULL,
	"template_key" text,
	"trigger" text NOT NULL,
	"is_sent" boolean DEFAULT false,
	"sent_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "onboarding_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "onboarding_types_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "participant_sku_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sku_level_id" integer NOT NULL,
	"sku_entity_id" integer,
	"access_type" varchar(20) DEFAULT 'specific',
	"valid_from" timestamp DEFAULT CURRENT_TIMESTAMP,
	"valid_to" timestamp,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "participant_sku_access_user_id_sku_level_id_sku_entity_id_key" UNIQUE("user_id","sku_level_id","sku_entity_id")
);
--> statement-breakpoint
CREATE TABLE "pincode_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"pincode" text NOT NULL,
	"city" text,
	"district" text,
	"state" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "pincode_master_pincode_key" UNIQUE("pincode")
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"batch_number" text NOT NULL,
	"type_id" integer NOT NULL,
	"code" text NOT NULL,
	"security_code" text NOT NULL,
	"manufacturing_date" timestamp NOT NULL,
	"mono_sub_mono_id" text,
	"parent_qr_id" integer,
	"is_scanned" boolean DEFAULT false,
	"scanned_by" integer,
	"monthly_volume" integer,
	"location_access" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "qr_codes_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "qr_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "qr_types_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "redemption_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "redemption_channels_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "redemption_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "redemption_statuses_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"redemption_id" text NOT NULL,
	"channel_id" integer NOT NULL,
	"points_redeemed" integer NOT NULL,
	"amount" integer,
	"status" integer NOT NULL,
	"scheme_id" integer,
	"metadata" jsonb NOT NULL,
	"approved_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "redemptions_redemption_id_key" UNIQUE("redemption_id")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"bonus_awarded" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "retailer_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"earning_type" integer NOT NULL,
	"redemption_type" integer NOT NULL,
	"amount" numeric NOT NULL,
	"type" text NOT NULL,
	"remarks" text,
	"opening_balance" numeric NOT NULL,
	"closing_balance" numeric NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "retailer_transaction_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"earning_type" integer NOT NULL,
	"points" numeric NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"sku" text,
	"status" text NOT NULL,
	"batch_number" text,
	"serial_number" text,
	"qr_code" text,
	"remarks" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"metadata" jsonb NOT NULL,
	"scheme_id" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "retailer_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"earning_type" integer NOT NULL,
	"points" numeric NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"sku" text,
	"batch_number" text,
	"serial_number" text,
	"qr_code" text,
	"remarks" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"metadata" jsonb NOT NULL,
	"scheme_id" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "retailers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"unique_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"aadhaar" text NOT NULL,
	"pan" text,
	"gst" text,
	"address" text,
	"city" text,
	"district" text,
	"state" text,
	"dob" timestamp,
	"referral_code" text,
	"is_kyc_verified" boolean DEFAULT false,
	"onboarding_type_id" integer NOT NULL,
	"tds_consent" boolean DEFAULT false NOT NULL,
	"bank_account_no" text,
	"bank_account_ifsc" text,
	"bank_account_name" text,
	"upi_id" text,
	"is_bank_validated" boolean DEFAULT false,
	"points_balance" integer DEFAULT 0,
	"sap_customer_code" text,
	"kyc_documents" jsonb,
	"total_earnings" numeric DEFAULT '0',
	"total_balance" numeric DEFAULT '0',
	"total_redeemed" numeric DEFAULT '0',
	"tds_percentage" integer DEFAULT 0,
	"tds_kitty" numeric DEFAULT '0',
	"tds_deducted" numeric DEFAULT '0',
	"last_settlement_date" timestamp,
	CONSTRAINT "retailers_unique_id_key" UNIQUE("unique_id"),
	CONSTRAINT "retailers_phone_key" UNIQUE("phone"),
	CONSTRAINT "retailers_referral_code_key" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "scheme_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "scheme_types_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "schemes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scheme_type" integer NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"budget" integer DEFAULT 0,
	"spent_budget" integer DEFAULT 0,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "sku_entity" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"level_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" text,
	"parent_entity_id" integer,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "sku_level_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"level_no" integer NOT NULL,
	"level_name" text NOT NULL,
	"parent_level_id" integer
);
--> statement-breakpoint
CREATE TABLE "sku_point_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"sku_variant_id" integer NOT NULL,
	"user_type_id" integer NOT NULL,
	"points_per_unit" numeric(10, 2) NOT NULL,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "sku_variant" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku_entity_id" integer NOT NULL,
	"variant_name" varchar(150) NOT NULL,
	"pack_size" text,
	"mrp" numeric(10, 2),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"log_level" text NOT NULL,
	"component_name" text NOT NULL,
	"message" text NOT NULL,
	"exception_trace" text,
	"action" text NOT NULL,
	"correlation_id" text,
	"api_endpoint" text,
	"user_id" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "ticket_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ticket_statuses_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ticket_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ticket_types_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_id" integer NOT NULL,
	"status_id" integer NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"image_url" varchar(500),
	"video_url" varchar(500),
	"priority" text DEFAULT 'Medium',
	"assignee_id" integer,
	"created_by" integer NOT NULL,
	"resolution_notes" text,
	"resolved_at" timestamp,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_type_entity" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_id" integer NOT NULL,
	"type_name" text NOT NULL,
	"parent_type_id" integer,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "user_type_level_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_no" integer NOT NULL,
	"level_name" text NOT NULL,
	"parent_level_id" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"city" text,
	"district" text,
	"state" text,
	"password" text,
	"branch" integer,
	"zone" integer,
	"location" jsonb,
	"referral_code" text,
	"referrer_id" integer,
	"onboarding_type_id" integer NOT NULL,
	"approval_status_id" integer NOT NULL,
	"language_id" integer DEFAULT 1 NOT NULL,
	"is_suspended" boolean DEFAULT false,
	"suspended_at" timestamp,
	"fcm_token" text,
	"last_login_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "users_phone_key" UNIQUE("phone"),
	CONSTRAINT "users_referral_code_key" UNIQUE("referral_code")
);
--> statement-breakpoint
ALTER TABLE "app_configs" ADD CONSTRAINT "app_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_scheme_type_fkey" FOREIGN KEY ("scheme_type") REFERENCES "public"."scheme_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sales" ADD CONSTRAINT "counter_sales_attached_retailer_id_fkey" FOREIGN KEY ("attached_retailer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sales" ADD CONSTRAINT "counter_sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sales_ledger" ADD CONSTRAINT "counter_sales_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sales_transaction_logs" ADD CONSTRAINT "counter_sales_transaction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sales_transaction_logs" ADD CONSTRAINT "counter_sales_transaction_logs_earning_type_fkey" FOREIGN KEY ("earning_type") REFERENCES "public"."earning_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sales_transaction_logs" ADD CONSTRAINT "counter_sales_transaction_logs_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "public"."schemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sales_transactions" ADD CONSTRAINT "counter_sales_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sales_transactions" ADD CONSTRAINT "counter_sales_transactions_earning_type_fkey" FOREIGN KEY ("earning_type") REFERENCES "public"."earning_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sales_transactions" ADD CONSTRAINT "counter_sales_transactions_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "public"."schemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."creatives_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrician_ledger" ADD CONSTRAINT "electrician_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrician_transaction_logs" ADD CONSTRAINT "electrician_transaction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrician_transaction_logs" ADD CONSTRAINT "electrician_transaction_logs_earning_type_fkey" FOREIGN KEY ("earning_type") REFERENCES "public"."earning_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrician_transaction_logs" ADD CONSTRAINT "electrician_transaction_logs_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "public"."schemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrician_transactions" ADD CONSTRAINT "electrician_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrician_transactions" ADD CONSTRAINT "electrician_transactions_earning_type_fkey" FOREIGN KEY ("earning_type") REFERENCES "public"."earning_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrician_transactions" ADD CONSTRAINT "electrician_transactions_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "public"."schemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electricians" ADD CONSTRAINT "electricians_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."event_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_entity" ADD CONSTRAINT "location_entity_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."location_level_master"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_entity" ADD CONSTRAINT "location_entity_parent_entity_id_fkey" FOREIGN KEY ("parent_entity_id") REFERENCES "public"."location_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_entity" ADD CONSTRAINT "fk_entity_client" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_entity_pincode" ADD CONSTRAINT "location_entity_pincode_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."location_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_entity_pincode" ADD CONSTRAINT "location_entity_pincode_pincode_id_fkey" FOREIGN KEY ("pincode_id") REFERENCES "public"."pincode_master"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_level_master" ADD CONSTRAINT "fk_level_client" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_sku_access" ADD CONSTRAINT "participant_sku_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_sku_access" ADD CONSTRAINT "participant_sku_access_sku_level_id_fkey" FOREIGN KEY ("sku_level_id") REFERENCES "public"."sku_level_master"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_sku_access" ADD CONSTRAINT "participant_sku_access_sku_entity_id_fkey" FOREIGN KEY ("sku_entity_id") REFERENCES "public"."sku_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."qr_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_parent_qr_id_fkey" FOREIGN KEY ("parent_qr_id") REFERENCES "public"."qr_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."redemption_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_status_fkey" FOREIGN KEY ("status") REFERENCES "public"."redemption_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "public"."schemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_ledger" ADD CONSTRAINT "retailer_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_transaction_logs" ADD CONSTRAINT "retailer_transaction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_transaction_logs" ADD CONSTRAINT "retailer_transaction_logs_earning_type_fkey" FOREIGN KEY ("earning_type") REFERENCES "public"."earning_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_transaction_logs" ADD CONSTRAINT "retailer_transaction_logs_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "public"."schemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_transactions" ADD CONSTRAINT "retailer_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_transactions" ADD CONSTRAINT "retailer_transactions_earning_type_fkey" FOREIGN KEY ("earning_type") REFERENCES "public"."earning_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_transactions" ADD CONSTRAINT "retailer_transactions_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "public"."schemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailers" ADD CONSTRAINT "retailers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schemes" ADD CONSTRAINT "schemes_scheme_type_fkey" FOREIGN KEY ("scheme_type") REFERENCES "public"."scheme_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_entity" ADD CONSTRAINT "sku_entity_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_entity" ADD CONSTRAINT "sku_entity_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."sku_level_master"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_entity" ADD CONSTRAINT "sku_entity_parent_entity_id_fkey" FOREIGN KEY ("parent_entity_id") REFERENCES "public"."sku_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_level_master" ADD CONSTRAINT "sku_level_master_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_point_config" ADD CONSTRAINT "sku_point_config_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_point_config" ADD CONSTRAINT "sku_point_config_sku_variant_id_fkey" FOREIGN KEY ("sku_variant_id") REFERENCES "public"."sku_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_point_config" ADD CONSTRAINT "sku_point_config_user_type_id_fkey" FOREIGN KEY ("user_type_id") REFERENCES "public"."user_type_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_variant" ADD CONSTRAINT "sku_variant_sku_entity_id_fkey" FOREIGN KEY ("sku_entity_id") REFERENCES "public"."sku_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."ticket_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."ticket_statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_type_entity" ADD CONSTRAINT "user_type_entity_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."user_type_level_master"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_type_entity" ADD CONSTRAINT "user_type_entity_parent_type_id_fkey" FOREIGN KEY ("parent_type_id") REFERENCES "public"."user_type_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_type_level_master" ADD CONSTRAINT "user_type_level_master_parent_level_id_fkey" FOREIGN KEY ("parent_level_id") REFERENCES "public"."user_type_level_master"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."user_type_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_onboarding_type_id_fkey" FOREIGN KEY ("onboarding_type_id") REFERENCES "public"."onboarding_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approval_status_id_fkey" FOREIGN KEY ("approval_status_id") REFERENCES "public"."approval_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_client_level" ON "sku_level_master" USING btree ("client_id" int4_ops,"level_no" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sku_user_type" ON "sku_point_config" USING btree ("client_id" int4_ops,"sku_variant_id" int4_ops,"user_type_id" int4_ops);