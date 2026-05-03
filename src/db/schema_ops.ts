import { pgTable, foreignKey, serial, text, integer, jsonb, varchar, timestamp, unique, boolean, numeric, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { otpType, notificationChannel, notificationStatus, notificationTriggerType } from "./schema_enums"
import { users } from "./schema_users"
import { skuVariant, schemes, skuLevelMaster, skuEntity, schemeTypes, notificationTemplates, eventMaster, creativesTypes, ticketStatuses, ticketTypes, amazonMarketplaceProducts } from "./schema_master"
import { redemptions, redemptionApprovals } from "./schema_transactions"

export const auditLogs = pgTable("audit_logs", {
	id: serial().primaryKey().notNull(),
	tableName: text("table_name").notNull(),
	recordId: integer("record_id").notNull(),
	operation: text().notNull(),
	action: text().notNull(),
	changedBy: integer("changed_by"),
	changeSource: text("change_source"),
	correlationId: text("correlation_id"),
	oldState: jsonb("old_state"),
	newState: jsonb("new_state"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.changedBy],
		foreignColumns: [users.id],
		name: "audit_logs_changed_by_fkey"
	}),
]);

export const appConfigs = pgTable("app_configs", {
	id: serial().primaryKey().notNull(),
	key: text().notNull(),
	value: jsonb().notNull(),
	description: text(),
	updatedBy: integer("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.updatedBy],
		foreignColumns: [users.id],
		name: "app_configs_updated_by_fkey"
	}),
	unique("app_configs_key_key").on(table.key),
]);

export const tickets = pgTable("tickets", {
	id: serial().primaryKey().notNull(),
	typeId: integer("type_id").notNull(),
	statusId: integer("status_id").notNull(),
	subject: text(),
	description: text().notNull(),
	imageUrl: varchar("image_url", { length: 500 }),
	videoUrl: varchar("video_url", { length: 500 }),
	priority: text().default('Medium'),
	assigneeId: integer("assignee_id"),
	createdBy: integer("created_by").notNull(),
	resolutionNotes: text("resolution_notes"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	attachments: jsonb().default([]),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.statusId],
		foreignColumns: [ticketStatuses.id],
		name: "tickets_status_id_fkey"
	}).onDelete("restrict"),
	foreignKey({
		columns: [table.typeId],
		foreignColumns: [ticketTypes.id],
		name: "tickets_type_id_fkey"
	}).onDelete("restrict"),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	type: text().notNull(),
	channel: text().notNull(),
	templateKey: text("template_key"),
	trigger: text().notNull(),
	isSent: boolean("is_sent").default(false),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "notifications_user_id_fkey"
	}),
]);

export const notificationLogs = pgTable("notification_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	channel: notificationChannel().notNull(),
	templateId: integer("template_id"),
	triggerType: notificationTriggerType("trigger_type").notNull(),
	status: notificationStatus().default('pending'),
	metadata: jsonb().default({}),
	sentAt: timestamp("sent_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "notification_logs_user_id_fkey"
	}),
	foreignKey({
		columns: [table.templateId],
		foreignColumns: [notificationTemplates.id],
		name: "notification_logs_template_id_fkey"
	}),
]);

export const creatives = pgTable("creatives", {
	id: serial().primaryKey().notNull(),
	typeId: integer("type_id").notNull(),
	url: varchar({ length: 500 }).notNull(),
	title: text().notNull(),
	description: text(),
	carouselName: text("carousel_name").notNull(),
	displayOrder: integer("display_order").default(0),
	targetAudience: jsonb("target_audience").default({}),
	metadata: jsonb().default({}),
	isActive: boolean("is_active").default(true),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.typeId],
		foreignColumns: [creativesTypes.id],
		name: "creatives_type_id_fkey"
	}).onDelete("restrict"),
]);

export const eventLogs = pgTable("event_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	eventId: integer("event_id").notNull(),
	action: text().notNull(),
	eventType: text("event_type").notNull(),
	entityId: text("entity_id"),
	correlationId: text("correlation_id"),
	metadata: jsonb(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.eventId],
		foreignColumns: [eventMaster.id],
		name: "event_logs_event_id_fkey"
	}).onDelete("restrict"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "event_logs_user_id_fkey"
	}),
]);

export const approvalAuditLogs = pgTable("approval_audit_logs", {
	auditId: serial("audit_id").primaryKey().notNull(),
	redemptionId: integer("redemption_id").notNull(),
	approvalId: integer("approval_id").notNull(),
	action: text().notNull(),
	performedBy: integer("performed_by"),
	previousStatus: text("previous_status"),
	newStatus: text("new_status"),
	notes: text(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.redemptionId],
		foreignColumns: [redemptions.id],
		name: "audit_redemption_id_fkey"
	}),
	foreignKey({
		columns: [table.approvalId],
		foreignColumns: [redemptionApprovals.approvalId],
		name: "audit_approval_id_fkey"
	}),
	foreignKey({
		columns: [table.performedBy],
		foreignColumns: [users.id],
		name: "audit_performed_by_fkey"
	}),
]);

export const inappNotifications = pgTable("inapp_notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	title: text().notNull(),
	body: text().notNull(),
	category: text().notNull(),
	isRead: boolean("is_read").default(false),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "inapp_notifications_user_id_fkey"
	}),
]);

export const otpMaster = pgTable("otp_master", {
	id: serial().primaryKey().notNull(),
	phone: varchar({ length: 20 }).notNull(),
	otp: text().notNull(),
	type: otpType().notNull(),
	userId: integer("user_id"),
	attempts: integer().default(0).notNull(),
	isUsed: boolean("is_used").default(false).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "otp_master_user_id_users_id_fk"
	}).onDelete("cascade"),
]);

export const participantSkuAccess = pgTable("participant_sku_access", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	skuLevelId: integer("sku_level_id").notNull(),
	skuEntityId: integer("sku_entity_id"),
	accessType: varchar("access_type", { length: 20 }).default('specific'),
	validFrom: timestamp("valid_from", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	validTo: timestamp("valid_to", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
		columns: [table.skuEntityId],
		foreignColumns: [skuEntity.id],
		name: "participant_sku_access_sku_entity_id_fkey"
	}),
	foreignKey({
		columns: [table.skuLevelId],
		foreignColumns: [skuLevelMaster.id],
		name: "participant_sku_access_sku_level_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "participant_sku_access_user_id_fkey"
	}).onDelete("cascade"),
	unique("participant_sku_access_user_id_sku_level_id_sku_entity_id_key").on(table.userId, table.skuLevelId, table.skuEntityId),
]);

export const skuPointRules = pgTable("sku_point_rules", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	priority: integer().default(0),
	clientId: integer("client_id").notNull(),
	locationEntityId: integer("location_entity_id"),
	skuEntityId: integer("sku_entity_id"),
	skuVariantId: integer("sku_variant_id"),
	userTypeId: integer("user_type_id"),
	actionType: varchar("action_type", { length: 20 }).notNull(),
	actionValue: numeric("action_value").notNull(),
	isActive: boolean("is_active").default(true),
	validFrom: timestamp("valid_from", { mode: 'string' }),
	validTo: timestamp("valid_to", { mode: 'string' }),
	description: text(),
});

export const campaigns = pgTable("campaigns", {
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
		name: "campaigns_scheme_type_fkey"
	}),
]);

export const eventHandlerConfig = pgTable("event_handler_config", {
	id: serial().primaryKey().notNull(),
	eventKey: text("event_key").notNull(),
	handlerName: text("handler_name").notNull(),
	priority: integer().default(0).notNull(),
	config: jsonb().default({}).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("event_handler_config_event_handler_key").on(table.eventKey, table.handlerName),
]);

export const systemLogs = pgTable("system_logs", {
	logId: serial("log_id").primaryKey().notNull(),
	logLevel: text("log_level").notNull(),
	componentName: text("component_name").notNull(),
	message: text().notNull(),
	exceptionTrace: text("exception_trace"),
	action: text().notNull(),
	correlationId: text("correlation_id"),
	apiEndpoint: text("api_endpoint"),
	userId: integer("user_id"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "system_logs_user_id_fkey"
	}),
]);

export const thirdPartyVerificationLogs = pgTable("third_party_verification_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	verificationType: text("verification_type").notNull(),
	provider: text().notNull(),
	requestData: jsonb("request_data").notNull(),
	responseData: jsonb("response_data").notNull(),
	responseObject: jsonb("response_object").notNull(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "third_party_verification_logs_user_id_fkey"
	}).onDelete("cascade"),
]);

export const thirdPartyApiLogs = pgTable("third_party_api_logs", {
	id: serial().primaryKey().notNull(),
	redemptionId: integer("redemption_id"),
	provider: text().notNull(),
	apiType: text("api_type").notNull(),
	apiEndpoint: text("api_endpoint").notNull(),
	httpMethod: text("http_method"),
	requestPayload: jsonb("request_payload"),
	responsePayload: jsonb("response_payload"),
	httpStatusCode: integer("http_status_code"),
	isSuccess: boolean("is_success"),
	errorMessage: text("error_message"),
	webhookEventType: text("webhook_event_type"),
	webhookSignature: text("webhook_signature"),
	responseTimeMs: integer("response_time_ms"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.redemptionId],
		foreignColumns: [redemptions.id],
		name: "third_party_api_logs_redemption_id_fkey"
	}).onDelete("set null"),
]);

export const userAmazonCart = pgTable("user_amazon_cart", {
	cartId: serial("cart_id").primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	amazonAsinSku: text("amazon_asin_sku").notNull(),
	quantity: integer().default(1).notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("user_cart_unique").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.amazonAsinSku.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "cart_user_id_fkey"
	}).onDelete("cascade"),
]);

export const userAmazonWishlist = pgTable("user_amazon_wishlist", {
	wishlistId: serial("wishlist_id").primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	amazonAsinSku: text("amazon_asin_sku").notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("user_wishlist_unique").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.amazonAsinSku.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "wishlist_user_id_fkey"
	}).onDelete("cascade"),
]);

export const amazonTickets = pgTable("amazon_tickets", {
	ticketId: serial("ticket_id").primaryKey().notNull(),
	ticketNumber: text("ticket_number").notNull(),
	orderId: integer("order_id").notNull(),
	userId: integer("user_id").notNull(),
	productId: integer("product_id"),
	asinSku: text("asin_sku"),
	reason: text().notNull(),
	requestType: text("request_type").notNull(),
	status: text().default('PENDING'),
	resolutionNotes: text("resolution_notes"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolvedBy: integer("resolved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "tickets_user_id_fkey"
	}),
	foreignKey({
		columns: [table.resolvedBy],
		foreignColumns: [users.id],
		name: "tickets_resolved_by_fkey"
	}),
	unique("amazon_tickets_ticket_number_unique").on(table.ticketNumber),
]);

export const tblRandomKeys = pgTable("tbl_random_keys", {
	randomKeyId: serial("random_key_id").primaryKey().notNull(),
	randomKey: varchar("random_key", { length: 255 }).notNull(),
	status: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("tbl_random_keys_random_key_unique").on(table.randomKey),
]);
