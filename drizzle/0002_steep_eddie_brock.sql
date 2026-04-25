CREATE TYPE "public"."inventory_type" AS ENUM('inner', 'outer');--> statement-breakpoint
CREATE TABLE "tbl_inventory_batch" (
	"batch_id" serial PRIMARY KEY NOT NULL,
	"sku_code" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"type" "inventory_type" NOT NULL,
	"file_url" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tbl_inventory" (
	"inventory_id" serial PRIMARY KEY NOT NULL,
	"serial_number" varchar(255) NOT NULL,
	"batch_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_qr_scanned" boolean DEFAULT false NOT NULL,
	CONSTRAINT "tbl_inventory_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "tbl_random_keys" (
	"random_key_id" serial PRIMARY KEY NOT NULL,
	"random_key" varchar(255) NOT NULL,
	"status" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tbl_random_keys_random_key_unique" UNIQUE("random_key")
);
