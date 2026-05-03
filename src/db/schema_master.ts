import { pgTable, foreignKey, serial, text, integer, jsonb, varchar, timestamp, unique, boolean, numeric, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { notificationTriggerType } from "./schema_enums"

export const approvalStatuses = pgTable("approval_statuses", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("approval_statuses_name_key").on(table.name),
]);

export const languages = pgTable("languages", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	code: text(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("languages_name_key").on(table.name),
]);

export const onboardingTypes = pgTable("onboarding_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("onboarding_types_name_key").on(table.name),
]);

export const client = pgTable("client", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 150 }).notNull(),
	code: text(),
}, (table) => [
	unique("client_code_key").on(table.code),
]);

export const earningTypes = pgTable("earning_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("earning_types_name_key").on(table.name),
]);

export const qrTypes = pgTable("qr_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("qr_types_name_key").on(table.name),
]);

export const redemptionStatuses = pgTable("redemption_statuses", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("redemption_statuses_name_key").on(table.name),
]);

export const redemptionChannels = pgTable("redemption_channels", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	code: text(),
}, (table) => [
	unique("redemption_channels_name_key").on(table.name),
	unique("redemption_channels_code_unique").on(table.code),
]);

export const skuLevelMaster = pgTable("sku_level_master", {
	id: serial().primaryKey().notNull(),
	clientId: integer("client_id").notNull(),
	levelNo: integer("level_no").notNull(),
	levelName: text("level_name").notNull(),
	parentLevelId: integer("parent_level_id"),
}, (table) => [
	uniqueIndex("uq_client_level").using("btree", table.clientId.asc().nullsLast().op("int4_ops"), table.levelNo.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [client.id],
		name: "sku_level_master_client_id_fkey"
	}),
]);

export const skuEntity = pgTable("sku_entity", {
	id: serial().primaryKey().notNull(),
	clientId: integer("client_id").notNull(),
	levelId: integer("level_id").notNull(),
	name: varchar({ length: 200 }).notNull(),
	code: text(),
	parentEntityId: integer("parent_entity_id"),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [client.id],
		name: "sku_entity_client_id_fkey"
	}),
	foreignKey({
		columns: [table.levelId],
		foreignColumns: [skuLevelMaster.id],
		name: "sku_entity_level_id_fkey"
	}),
	foreignKey({
		columns: [table.parentEntityId],
		foreignColumns: [table.id],
		name: "sku_entity_parent_entity_id_fkey"
	}),
]);

export const skuVariant = pgTable("sku_variant", {
	id: serial().primaryKey().notNull(),
	skuEntityId: integer("sku_entity_id").notNull(),
	variantName: varchar("variant_name", { length: 150 }).notNull(),
	packSize: text("pack_size"),
	mrp: numeric({ precision: 10, scale: 2 }),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
		columns: [table.skuEntityId],
		foreignColumns: [skuEntity.id],
		name: "sku_variant_sku_entity_id_fkey"
	}),
]);

export const userTypeLevelMaster = pgTable("user_type_level_master", {
	id: serial().primaryKey().notNull(),
	levelNo: integer("level_no").notNull(),
	levelName: text("level_name").notNull(),
	parentLevelId: integer("parent_level_id"),
}, (table) => [
	foreignKey({
		columns: [table.parentLevelId],
		foreignColumns: [table.id],
		name: "user_type_level_master_parent_level_id_fkey"
	}),
]);

export const userTypeEntity = pgTable("user_type_entity", {
	id: serial().primaryKey().notNull(),
	levelId: integer("level_id").notNull(),
	typeName: text("type_name").notNull(),
	parentTypeId: integer("parent_type_id"),
	isActive: boolean("is_active").default(true),
	remarks: text(),
	maxDailyScans: integer("max_daily_scans").default(50),
	requiredKycLevel: text("required_kyc_level").default('Basic'),
	isReferralEnabled: boolean("is_referral_enabled").default(true),
	referralRewardPoints: integer("referral_reward_points").default(0),
	refereeRewardPoints: integer("referee_reward_points").default(0),
	maxReferrals: integer("max_referrals").default(10),
	referralCodePrefix: text("referral_code_prefix"),
	referralValidityDays: integer("referral_validity_days"),
	referralSuccessMessage: text("referral_success_message"),
	allowedRedemptionChannels: jsonb("allowed_redemption_channels").default([]),
	maxRedemptionLimit: integer("max_redemption_limit").default(5000),
	minRedemptionLimit: integer("min_redemption_limit").default(100),

}, (table) => [
	foreignKey({
		columns: [table.levelId],
		foreignColumns: [userTypeLevelMaster.id],
		name: "user_type_entity_level_id_fkey"
	}),
	foreignKey({
		columns: [table.parentTypeId],
		foreignColumns: [table.id],
		name: "user_type_entity_parent_type_id_fkey"
	}),
]);

export const skuPointConfig = pgTable("sku_point_config", {
	id: serial().primaryKey().notNull(),
	clientId: integer("client_id").notNull(),
	skuVariantId: integer("sku_variant_id").notNull(),
	userTypeId: integer("user_type_id").notNull(),
	pointsPerUnit: numeric("points_per_unit", { precision: 10, scale: 2 }).notNull(),
	validFrom: timestamp("valid_from", { mode: 'string' }),
	validTo: timestamp("valid_to", { mode: 'string' }),
	remarks: text(),
	maxScansPerDay: integer("max_scans_per_day").default(5),
	isActive: boolean("is_active").default(true),
}, (table) => [
	uniqueIndex("uq_sku_user_type").using("btree", table.clientId.asc().nullsLast().op("int4_ops"), table.skuVariantId.asc().nullsLast().op("int4_ops"), table.userTypeId.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [client.id],
		name: "sku_point_config_client_id_fkey"
	}),
	foreignKey({
		columns: [table.skuVariantId],
		foreignColumns: [skuVariant.id],
		name: "sku_point_config_sku_variant_id_fkey"
	}),
	foreignKey({
		columns: [table.userTypeId],
		foreignColumns: [userTypeEntity.id],
		name: "sku_point_config_user_type_id_fkey"
	}),
]);

export const locationLevelMaster = pgTable("location_level_master", {
	id: serial().primaryKey().notNull(),
	clientId: integer("client_id").notNull(),
	levelNo: integer("level_no").notNull(),
	levelName: text("level_name").notNull(),
	parentLevelId: integer("parent_level_id"),
}, (table) => [
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [client.id],
		name: "fk_level_client"
	}),
]);

export const locationEntity = pgTable("location_entity", {
	id: serial().primaryKey().notNull(),
	clientId: integer("client_id").notNull(),
	levelId: integer("level_id").notNull(),
	name: varchar({ length: 150 }).notNull(),
	code: text(),
	parentEntityId: integer("parent_entity_id"),
}, (table) => [
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [client.id],
		name: "fk_entity_client"
	}),
	foreignKey({
		columns: [table.levelId],
		foreignColumns: [locationLevelMaster.id],
		name: "location_entity_level_id_fkey"
	}),
	foreignKey({
		columns: [table.parentEntityId],
		foreignColumns: [table.id],
		name: "location_entity_parent_entity_id_fkey"
	}),
]);

export const pincodeMaster = pgTable("pincode_master", {
	id: serial().primaryKey().notNull(),
	pincode: text().notNull(),
	city: text(),
	district: text(),
	state: text(),
	zone: text(),
	latitude: numeric({ precision: 10, scale: 7 }),
	longitude: numeric({ precision: 10, scale: 7 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	unique("pincode_master_pincode_key").on(table.pincode),
]);

export const locationEntityPincode = pgTable("location_entity_pincode", {
	id: serial().primaryKey().notNull(),
	entityId: integer("entity_id").notNull(),
	pincodeId: integer("pincode_id").notNull(),
}, (table) => [
	foreignKey({
		columns: [table.entityId],
		foreignColumns: [locationEntity.id],
		name: "location_entity_pincode_entity_id_fkey"
	}),
	foreignKey({
		columns: [table.pincodeId],
		foreignColumns: [pincodeMaster.id],
		name: "location_entity_pincode_pincode_id_fkey"
	}),
]);

export const schemeTypes = pgTable("scheme_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("scheme_types_name_key").on(table.name),
]);

export const schemes = pgTable("schemes", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	schemeType: integer("scheme_type").notNull(),
	description: text(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true),
	budget: integer().default(0),
	spentBudget: integer("spent_budget").default(0),
	config: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.schemeType],
		foreignColumns: [schemeTypes.id],
		name: "schemes_scheme_type_fkey"
	}),
]);

export const notificationTemplates = pgTable("notification_templates", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	triggerType: notificationTriggerType("trigger_type").default('automated').notNull(),
	pushTitle: text("push_title"),
	pushBody: text("push_body"),
	smsBody: text("sms_body"),
	placeholders: jsonb().default([]),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("notification_templates_slug_unique").on(table.slug),
]);

export const eventMaster = pgTable("event_master", {
	id: serial().primaryKey().notNull(),
	eventKey: text("event_key").notNull(),
	name: text().notNull(),
	description: text(),
	category: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	templateId: integer("template_id"),
}, (table) => [
	foreignKey({
		columns: [table.templateId],
		foreignColumns: [notificationTemplates.id],
		name: "event_master_template_id_fkey"
	}),
	unique("event_master_event_key_key").on(table.eventKey),
	unique("event_master_name_key").on(table.name),
]);

export const approvalRoles = pgTable("approval_roles", {
	roleId: serial("role_id").primaryKey().notNull(),
	roleName: text("role_name").notNull(),
	approvalLevel: text("approval_level").notNull(),
	maxApprovalLimit: integer("max_approval_limit"),
	canEscalate: boolean("can_escalate").default(true),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("approval_roles_role_name_unique").on(table.roleName),
]);

export const ticketStatuses = pgTable("ticket_statuses", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("ticket_statuses_name_key").on(table.name),
]);

export const ticketTypes = pgTable("ticket_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("ticket_types_name_key").on(table.name),
]);

export const creativesTypes = pgTable("creatives_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("creatives_types_name_key").on(table.name),
]);

export const physicalRewardsCatalogue = pgTable("physical_rewards_catalogue", {
	rewardId: serial("reward_id").primaryKey().notNull(),
	rewardName: text("reward_name").notNull(),
	rewardDescription: text("reward_description"),
	category: text(),
	pointsRequired: integer("points_required").notNull(),
	mrp: numeric({ precision: 10, scale: 2 }),
	inventoryCount: integer("inventory_count").default(0),
	imageUrl: text("image_url"),
	brand: text(),
	deliveryTime: text("delivery_time").default('15-21 working days'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const amazonMarketplaceProducts = pgTable("amazon_marketplace_products", {
	amazonMarketplaceProductId: serial("amazon_marketplace_product_id").primaryKey().notNull(),
	amazonAsinSku: text("amazon_asin_sku").notNull(),
	amazonProductName: text("amazon_product_name").notNull(),
	amazonModelNo: text("amazon_model_no"),
	amazonProductDescription: text("amazon_product_description"),
	amazonMrp: numeric("amazon_mrp", { precision: 10, scale: 2 }),
	amazonDiscountedPrice: numeric("amazon_discounted_price", { precision: 10, scale: 2 }),
	amazonCspOnAmazon: numeric("amazon_csp_on_amazon", { precision: 10, scale: 2 }),
	amazonInventoryCount: integer("amazon_inventory_count").default(0),
	amazonPoints: integer("amazon_points").notNull(),
	amazonDiff: numeric("amazon_diff", { precision: 10, scale: 2 }),
	amazonUrl: text("amazon_url"),
	amazonCategory: text("amazon_category"),
	amazonCategoryImagePath: text("amazon_category_image_path"),
	amazonSubCategory: text("amazon_sub_category"),
	amazonSubCategoryImagePath: text("amazon_sub_category_image_path"),
	amazonProductImagePath: text("amazon_product_image_path"),
	amazonCommentsVendor: text("amazon_comments_vendor"),
	isAmzProductActive: boolean("is_amz_product_active").default(true),
	uploadedBy: integer("uploaded_by"),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("amazon_asin_sku_unique").using("btree", table.amazonAsinSku.asc().nullsLast().op("text_ops")),
]);

export const redemptionThresholds = pgTable("redemption_thresholds", {
	thresholdId: serial("threshold_id").primaryKey().notNull(),
	thresholdType: text("threshold_type").notNull(),
	userType: text("user_type"),
	thresholdValue: integer("threshold_value").notNull(),
	requiresApproval: boolean("requires_approval").default(false),
	approvalLevel: text("approval_level").default('FINANCE'),
	isActive: boolean("is_active").default(true),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});
