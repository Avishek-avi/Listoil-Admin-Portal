CREATE TABLE "sku_point_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 0,
	"client_id" integer NOT NULL,
	"location_entity_id" integer,
	"sku_entity_id" integer,
	"sku_variant_id" integer,
	"user_type_id" integer,
	"action_type" varchar(20) NOT NULL,
	"action_value" numeric NOT NULL,
	"is_active" boolean DEFAULT true,
	"valid_from" timestamp,
	"valid_to" timestamp
);
