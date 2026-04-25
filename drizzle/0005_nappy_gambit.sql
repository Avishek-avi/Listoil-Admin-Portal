CREATE TYPE "public"."block_status" AS ENUM('basic_registration', 'phone_number_verified', 'digilocker', 'pan_verification', 'gst_number_verification', 'bank_account_verified', 'pending_kyc_verification', 'profile_updated', 'none');--> statement-breakpoint
CREATE TYPE "public"."otp_type" AS ENUM('login', 'password_reset', 'registration', 'kyc');--> statement-breakpoint
CREATE TABLE "amazon_marketplace_products" (
	"amazon_marketplace_product_id" serial PRIMARY KEY NOT NULL,
	"amazon_asin_sku" text NOT NULL,
	"amazon_product_name" text NOT NULL,
	"amazon_model_no" text,
	"amazon_product_description" text,
	"amazon_mrp" numeric(10, 2),
	"amazon_discounted_price" numeric(10, 2),
	"amazon_csp_on_amazon" numeric(10, 2),
	"amazon_inventory_count" integer DEFAULT 0,
	"amazon_points" integer NOT NULL,
	"amazon_diff" numeric(10, 2),
	"amazon_url" text,
	"amazon_category" text,
	"amazon_category_image_path" text,
	"amazon_sub_category" text,
	"amazon_sub_category_image_path" text,
	"amazon_product_image_path" text,
	"amazon_comments_vendor" text,
	"is_amz_product_active" boolean DEFAULT true,
	"uploaded_by" integer,
	"uploaded_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "amazon_order_items" (
	"order_item_id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"asin_sku" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"points_per_item" integer NOT NULL,
	"total_points" integer NOT NULL,
	"status" text DEFAULT 'processing',
	"status_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "amazon_tickets" (
	"ticket_id" serial PRIMARY KEY NOT NULL,
	"ticket_number" text NOT NULL,
	"order_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer,
	"asin_sku" text,
	"reason" text NOT NULL,
	"request_type" text NOT NULL,
	"status" text DEFAULT 'PENDING',
	"resolution_notes" text,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "amazon_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "approval_audit_logs" (
	"audit_id" serial PRIMARY KEY NOT NULL,
	"redemption_id" integer NOT NULL,
	"approval_id" integer NOT NULL,
	"action" text NOT NULL,
	"performed_by" integer,
	"previous_status" text,
	"new_status" text,
	"notes" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_roles" (
	"role_id" serial PRIMARY KEY NOT NULL,
	"role_name" text NOT NULL,
	"approval_level" text NOT NULL,
	"max_approval_limit" integer,
	"can_escalate" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "approval_roles_role_name_unique" UNIQUE("role_name")
);
--> statement-breakpoint
CREATE TABLE "inapp_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"category" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"document_value" text NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"verification_result" jsonb,
	"verified_at" timestamp,
	"rejection_reason" text,
	"expiry_date" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "kyc_documents_user_id_type_key" UNIQUE("user_id","document_type")
);
--> statement-breakpoint
CREATE TABLE "otp_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"otp" text NOT NULL,
	"type" "otp_type" NOT NULL,
	"user_id" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_rewards_catalogue" (
	"reward_id" serial PRIMARY KEY NOT NULL,
	"reward_name" text NOT NULL,
	"reward_description" text,
	"category" text,
	"points_required" integer NOT NULL,
	"mrp" numeric(10, 2),
	"inventory_count" integer DEFAULT 0,
	"image_url" text,
	"brand" text,
	"delivery_time" text DEFAULT '15-21 working days',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "physical_rewards_redemptions" (
	"redemption_id" serial PRIMARY KEY NOT NULL,
	"redemption_request_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"reward_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"points_deducted" integer NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING',
	"tracking_number" text,
	"courier_name" text,
	"estimated_delivery" timestamp,
	"delivered_at" timestamp,
	"delivery_proof" text,
	"approved_by" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "physical_rewards_redemptions_redemption_request_id_unique" UNIQUE("redemption_request_id")
);
--> statement-breakpoint
CREATE TABLE "redemption_approvals" (
	"approval_id" serial PRIMARY KEY NOT NULL,
	"redemption_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"requested_points" integer NOT NULL,
	"redemption_type" text NOT NULL,
	"approval_status" text DEFAULT 'PENDING',
	"approval_level" text DEFAULT 'FINANCE',
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"flagged_reasons" text[],
	"escalation_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "redemption_thresholds" (
	"threshold_id" serial PRIMARY KEY NOT NULL,
	"threshold_type" text NOT NULL,
	"user_type" text,
	"threshold_value" integer NOT NULL,
	"requires_approval" boolean DEFAULT false,
	"approval_level" text DEFAULT 'FINANCE',
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tds_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"financial_year" text NOT NULL,
	"tds_kitty" numeric DEFAULT '0' NOT NULL,
	"tds_deducted" numeric DEFAULT '0' NOT NULL,
	"reversed_amount" numeric DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"settled_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "tds_records_user_id_fy_key" UNIQUE("user_id","financial_year")
);
--> statement-breakpoint
CREATE TABLE "third_party_verification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"verification_type" text NOT NULL,
	"provider" text NOT NULL,
	"request_data" jsonb NOT NULL,
	"response_data" jsonb NOT NULL,
	"response_object" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmp_third_party_verification_logs" (
	"id" text,
	"user_id" text,
	"verification_type" text,
	"provider" text,
	"request_data" text,
	"response_data" text,
	"response_object" text,
	"metadata" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "user_amazon_cart" (
	"cart_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amazon_asin_sku" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"added_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_amazon_orders" (
	"user_amz_order_id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"redemption_id" text,
	"order_data" jsonb NOT NULL,
	"order_status" text DEFAULT 'processing',
	"points_deducted" integer NOT NULL,
	"tds_deducted" integer DEFAULT 0,
	"shipping_details" jsonb,
	"tracking_details" jsonb,
	"estimated_delivery" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_amazon_orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "user_amazon_wishlist" (
	"wishlist_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amazon_asin_sku" text NOT NULL,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_approval_roles" (
	"mapping_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"assigned_by" integer,
	"assigned_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "user_associations" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_user_id" integer NOT NULL,
	"child_user_id" integer NOT NULL,
	"association_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "user_associations_parent_child_type_key" UNIQUE("parent_user_id","child_user_id","association_type")
);
--> statement-breakpoint
CREATE TABLE "user_scope_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_type_id" integer,
	"user_id" integer,
	"scope_type" varchar(20) NOT NULL,
	"scope_level_id" integer NOT NULL,
	"scope_entity_id" integer,
	"access_type" varchar(20) DEFAULT 'specific' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sku_level1_master" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sku_level2_master" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sku_level3_master" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sku_level4_master" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sku_level5_master" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sku_level6_master" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tbl_sku_master" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sku_level1_master" CASCADE;--> statement-breakpoint
DROP TABLE "sku_level2_master" CASCADE;--> statement-breakpoint
DROP TABLE "sku_level3_master" CASCADE;--> statement-breakpoint
DROP TABLE "sku_level4_master" CASCADE;--> statement-breakpoint
DROP TABLE "sku_level5_master" CASCADE;--> statement-breakpoint
DROP TABLE "sku_level6_master" CASCADE;--> statement-breakpoint
DROP TABLE "tbl_sku_master" CASCADE;--> statement-breakpoint
ALTER TABLE "counter_sales" RENAME COLUMN "address" TO "address_line_1";--> statement-breakpoint
ALTER TABLE "electricians" RENAME COLUMN "address" TO "address_line_1";--> statement-breakpoint
ALTER TABLE "retailers" RENAME COLUMN "address" TO "address_line_1";--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "points_balance" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "points_balance" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "total_earnings" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "total_earnings" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "total_balance" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "total_balance" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "total_redeemed" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "total_redeemed" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "tds_kitty" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "tds_kitty" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "tds_deducted" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "counter_sales" ALTER COLUMN "tds_deducted" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "points_balance" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "points_balance" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "total_earnings" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "total_earnings" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "total_balance" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "total_balance" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "total_redeemed" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "total_redeemed" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "tds_kitty" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "tds_kitty" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "tds_deducted" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "electricians" ALTER COLUMN "tds_deducted" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "pincode_master" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pincode_master" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "points_balance" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "points_balance" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "total_earnings" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "total_earnings" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "total_balance" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "total_balance" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "total_redeemed" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "total_redeemed" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "tds_kitty" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "tds_kitty" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "tds_deducted" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "retailers" ALTER COLUMN "tds_deducted" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "subject" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "counter_sales" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "counter_sales" ADD COLUMN "address_line_2" text;--> statement-breakpoint
ALTER TABLE "counter_sales" ADD COLUMN "pincode" text;--> statement-breakpoint
ALTER TABLE "counter_sales" ADD COLUMN "redeemable_points" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "counter_sales" ADD COLUMN "aadhaar_address" text;--> statement-breakpoint
ALTER TABLE "electricians" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "electricians" ADD COLUMN "address_line_2" text;--> statement-breakpoint
ALTER TABLE "electricians" ADD COLUMN "pincode" text;--> statement-breakpoint
ALTER TABLE "electricians" ADD COLUMN "redeemable_points" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "electricians" ADD COLUMN "aadhaar_address" text;--> statement-breakpoint
ALTER TABLE "pincode_master" ADD COLUMN "zone" text;--> statement-breakpoint
ALTER TABLE "redemptions" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "shop_name" text;--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "address_line_2" text;--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "pincode" text;--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "redeemable_points" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "aadhaar_address" text;--> statement-breakpoint
ALTER TABLE "sku_point_config" ADD COLUMN "max_scans_per_day" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "sku_point_config" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "sku_point_rules" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "user_type_entity" ADD COLUMN "max_daily_scans" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "user_type_entity" ADD COLUMN "required_kyc_level" text DEFAULT 'Basic';--> statement-breakpoint
ALTER TABLE "user_type_entity" ADD COLUMN "allowed_redemption_channels" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "user_type_entity" ADD COLUMN "remarks" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "block_status" "block_status" DEFAULT 'basic_registration';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_photo_url" text;--> statement-breakpoint
ALTER TABLE "amazon_marketplace_products" ADD CONSTRAINT "amazon_products_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amazon_order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."user_amazon_orders"("user_amz_order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amazon_order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."amazon_marketplace_products"("amazon_marketplace_product_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amazon_tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."user_amazon_orders"("user_amz_order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amazon_tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amazon_tickets" ADD CONSTRAINT "tickets_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_logs" ADD CONSTRAINT "audit_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "public"."redemptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_logs" ADD CONSTRAINT "audit_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "public"."redemption_approvals"("approval_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_logs" ADD CONSTRAINT "audit_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inapp_notifications" ADD CONSTRAINT "inapp_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_master" ADD CONSTRAINT "otp_master_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_rewards_redemptions" ADD CONSTRAINT "physical_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_rewards_redemptions" ADD CONSTRAINT "physical_rewards_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."physical_rewards_catalogue"("reward_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_approvals" ADD CONSTRAINT "approvals_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "public"."redemptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_approvals" ADD CONSTRAINT "approvals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_approvals" ADD CONSTRAINT "approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_thresholds" ADD CONSTRAINT "thresholds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tds_records" ADD CONSTRAINT "tds_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_party_verification_logs" ADD CONSTRAINT "third_party_verification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_amazon_cart" ADD CONSTRAINT "cart_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_amazon_orders" ADD CONSTRAINT "amazon_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_amazon_wishlist" ADD CONSTRAINT "wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_approval_roles" ADD CONSTRAINT "user_approval_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_approval_roles" ADD CONSTRAINT "user_approval_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."approval_roles"("role_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_approval_roles" ADD CONSTRAINT "user_approval_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_associations" ADD CONSTRAINT "user_associations_child_user_id_fkey" FOREIGN KEY ("child_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_associations" ADD CONSTRAINT "user_associations_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_scope_mapping" ADD CONSTRAINT "user_scope_mapping_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_scope_mapping" ADD CONSTRAINT "user_scope_mapping_user_type_id_fkey" FOREIGN KEY ("user_type_id") REFERENCES "public"."user_type_entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "amazon_asin_sku_unique" ON "amazon_marketplace_products" USING btree ("amazon_asin_sku" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "approval_redemption_unique" ON "redemption_approvals" USING btree ("redemption_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_cart_unique" ON "user_amazon_cart" USING btree ("user_id" int4_ops,"amazon_asin_sku" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_wishlist_unique" ON "user_amazon_wishlist" USING btree ("user_id" int4_ops,"amazon_asin_sku" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_unique" ON "user_approval_roles" USING btree ("user_id" int4_ops,"role_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_scope_mapping_unique" ON "user_scope_mapping" USING btree ("user_type_id" text_ops,"user_id" text_ops,"scope_type" text_ops,"scope_level_id" int4_ops,"scope_entity_id" int4_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_not_null" ON "users" USING btree ("email" text_ops) WHERE (email IS NOT NULL);--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "district";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "branch";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "zone";