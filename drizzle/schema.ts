import { pgTable, foreignKey, serial, text, integer, jsonb, varchar, timestamp, unique, boolean, numeric, uniqueIndex, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const blockStatus = pgEnum("block_status", ['basic_registration', 'phone_number_verified', 'digilocker', 'pan_verification', 'gst_number_verification', 'bank_account_verified', 'pending_kyc_verification', 'profile_updated', 'none'])
export const inventoryType = pgEnum("inventory_type", ['inner', 'outer'])
export const notificationChannel = pgEnum("notification_channel", ['sms', 'push'])
export const notificationStatus = pgEnum("notification_status", ['pending', 'sent', 'failed', 'delivered'])
export const notificationTriggerType = pgEnum("notification_trigger_type", ['automated', 'campaign', 'manual'])
export const otpType = pgEnum("otp_type", ['login', 'password_reset', 'registration', 'kyc'])


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

export const counterSales = pgTable("counter_sales", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	uniqueId: text("unique_id").notNull(),
	name: text(),
	phone: text().notNull(),
	email: text(),
	aadhaar: text().notNull(),
	pan: text(),
	gst: text(),
	city: text(),
	district: text(),
	state: text(),
	dob: timestamp({ mode: 'string' }),
	gender: text(),
	referralCode: text("referral_code"),
	isKycVerified: boolean("is_kyc_verified").default(false),
	onboardingTypeId: integer("onboarding_type_id").notNull(),
	tdsConsent: boolean("tds_consent").default(false).notNull(),
	bankAccountNo: text("bank_account_no"),
	bankAccountIfsc: text("bank_account_ifsc"),
	bankAccountName: text("bank_account_name"),
	upiId: text("upi_id"),
	isBankValidated: boolean("is_bank_validated").default(false),
	pointsBalance: numeric("points_balance", { precision: 10, scale: 2 }).default('0'),
	sapCustomerCode: text("sap_customer_code"),
	kycDocuments: jsonb("kyc_documents"),
	attachedRetailerId: integer("attached_retailer_id"),
	totalEarnings: numeric("total_earnings", { precision: 10, scale: 2 }).default('0'),
	totalBalance: numeric("total_balance", { precision: 10, scale: 2 }).default('0'),
	totalRedeemed: numeric("total_redeemed", { precision: 10, scale: 2 }).default('0'),
	tdsPercentage: integer("tds_percentage").default(0),
	tdsKitty: numeric("tds_kitty", { precision: 10, scale: 2 }).default('0'),
	tdsDeducted: numeric("tds_deducted", { precision: 10, scale: 2 }).default('0'),
	lastSettlementDate: timestamp("last_settlement_date", { mode: 'string' }),
	addressLine1: text("address_line_1"),
	addressLine2: text("address_line_2"),
	pincode: text(),
	redeemablePoints: numeric("redeemable_points", { precision: 10, scale: 2 }).default('0'),
	aadhaarAddress: text("aadhaar_address"),
}, (table) => [
	foreignKey({
		columns: [table.attachedRetailerId],
		foreignColumns: [users.id],
		name: "counter_sales_attached_retailer_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "counter_sales_user_id_fkey"
	}),
	unique("counter_sales_unique_id_key").on(table.uniqueId),
	unique("counter_sales_phone_key").on(table.phone),
	unique("counter_sales_referral_code_key").on(table.referralCode),
]);

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

export const approvalStatuses = pgTable("approval_statuses", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("approval_statuses_name_key").on(table.name),
]);

export const counterSalesLedger = pgTable("counter_sales_ledger", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	redemptionType: integer("redemption_type").notNull(),
	amount: numeric().notNull(),
	type: text().notNull(),
	remarks: text(),
	openingBalance: numeric("opening_balance").notNull(),
	closingBalance: numeric("closing_balance").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "counter_sales_ledger_user_id_fkey"
	}).onDelete("cascade"),
]);

export const counterSalesTransactionLogs = pgTable("counter_sales_transaction_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	status: text().notNull(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale: 7 }),
	longitude: numeric({ precision: 10, scale: 7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.earningType],
		foreignColumns: [earningTypes.id],
		name: "counter_sales_transaction_logs_earning_type_fkey"
	}),
	foreignKey({
		columns: [table.schemeId],
		foreignColumns: [schemes.id],
		name: "counter_sales_transaction_logs_scheme_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "counter_sales_transaction_logs_user_id_fkey"
	}).onDelete("cascade"),
]);

export const counterSalesTransactions = pgTable("counter_sales_transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale: 7 }),
	longitude: numeric({ precision: 10, scale: 7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.earningType],
		foreignColumns: [earningTypes.id],
		name: "counter_sales_transactions_earning_type_fkey"
	}),
	foreignKey({
		columns: [table.schemeId],
		foreignColumns: [schemes.id],
		name: "counter_sales_transactions_scheme_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "counter_sales_transactions_user_id_fkey"
	}).onDelete("cascade"),
]);

export const client = pgTable("client", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 150 }).notNull(),
	code: text(),
}, (table) => [
	unique("client_code_key").on(table.code),
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

export const electricianLedger = pgTable("electrician_ledger", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	redemptionType: integer("redemption_type").notNull(),
	amount: numeric().notNull(),
	type: text().notNull(),
	remarks: text(),
	openingBalance: numeric("opening_balance").notNull(),
	closingBalance: numeric("closing_balance").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "electrician_ledger_user_id_fkey"
	}).onDelete("cascade"),
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

export const earningTypes = pgTable("earning_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("earning_types_name_key").on(table.name),
]);

export const electricianTransactionLogs = pgTable("electrician_transaction_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	status: text().notNull(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale: 7 }),
	longitude: numeric({ precision: 10, scale: 7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.earningType],
		foreignColumns: [earningTypes.id],
		name: "electrician_transaction_logs_earning_type_fkey"
	}),
	foreignKey({
		columns: [table.schemeId],
		foreignColumns: [schemes.id],
		name: "electrician_transaction_logs_scheme_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "electrician_transaction_logs_user_id_fkey"
	}).onDelete("cascade"),
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

export const electricians = pgTable("electricians", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	uniqueId: text("unique_id").notNull(),
	name: text(),
	phone: text().notNull(),
	email: text(),
	aadhaar: text().notNull(),
	pan: text(),
	gst: text(),
	city: text(),
	district: text(),
	state: text(),
	dob: timestamp({ mode: 'string' }),
	gender: text(),
	referralCode: text("referral_code"),
	isKycVerified: boolean("is_kyc_verified").default(false),
	onboardingTypeId: integer("onboarding_type_id").notNull(),
	tdsConsent: boolean("tds_consent").default(false).notNull(),
	bankAccountNo: text("bank_account_no"),
	bankAccountIfsc: text("bank_account_ifsc"),
	bankAccountName: text("bank_account_name"),
	upiId: text("upi_id"),
	isBankValidated: boolean("is_bank_validated").default(false),
	pointsBalance: numeric("points_balance", { precision: 10, scale: 2 }).default('0'),
	sapCustomerCode: text("sap_customer_code"),
	kycDocuments: jsonb("kyc_documents"),
	electricianCertificate: text("electrician_certificate"),
	totalEarnings: numeric("total_earnings", { precision: 10, scale: 2 }).default('0'),
	totalBalance: numeric("total_balance", { precision: 10, scale: 2 }).default('0'),
	totalRedeemed: numeric("total_redeemed", { precision: 10, scale: 2 }).default('0'),
	tdsPercentage: integer("tds_percentage").default(0),
	tdsKitty: numeric("tds_kitty", { precision: 10, scale: 2 }).default('0'),
	tdsDeducted: numeric("tds_deducted", { precision: 10, scale: 2 }).default('0'),
	lastSettlementDate: timestamp("last_settlement_date", { mode: 'string' }),
	addressLine1: text("address_line_1"),
	addressLine2: text("address_line_2"),
	pincode: text(),
	redeemablePoints: numeric("redeemable_points", { precision: 10, scale: 2 }).default('0'),
	aadhaarAddress: text("aadhaar_address"),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "electricians_user_id_fkey"
	}),
	unique("electricians_unique_id_key").on(table.uniqueId),
	unique("electricians_phone_key").on(table.phone),
	unique("electricians_referral_code_key").on(table.referralCode),
]);

export const kycDocuments = pgTable("kyc_documents", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	documentType: text("document_type").notNull(),
	documentValue: text("document_value").notNull(),
	verificationStatus: text("verification_status").default('pending').notNull(),
	verificationResult: jsonb("verification_result"),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	expiryDate: timestamp("expiry_date", { mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "kyc_documents_user_id_fkey"
	}).onDelete("cascade"),
	unique("kyc_documents_user_id_type_key").on(table.userId, table.documentType),
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

export const electricianTransactions = pgTable("electrician_transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale: 7 }),
	longitude: numeric({ precision: 10, scale: 7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.earningType],
		foreignColumns: [earningTypes.id],
		name: "electrician_transactions_earning_type_fkey"
	}),
	foreignKey({
		columns: [table.schemeId],
		foreignColumns: [schemes.id],
		name: "electrician_transactions_scheme_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "electrician_transactions_user_id_fkey"
	}).onDelete("cascade"),
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

export const qrTypes = pgTable("qr_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("qr_types_name_key").on(table.name),
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

export const qrCodes = pgTable("qr_codes", {
	id: serial().primaryKey().notNull(),
	sku: text().notNull(),
	batchNumber: text("batch_number").notNull(),
	typeId: integer("type_id").notNull(),
	code: text().notNull(),
	securityCode: text("security_code").notNull(),
	manufacturingDate: timestamp("manufacturing_date", { mode: 'string' }).notNull(),
	monoSubMonoId: text("mono_sub_mono_id"),
	parentQrId: integer("parent_qr_id"),
	isScanned: boolean("is_scanned").default(false),
	scannedBy: integer("scanned_by"),
	monthlyVolume: integer("monthly_volume"),
	locationAccess: jsonb("location_access"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.parentQrId],
		foreignColumns: [table.id],
		name: "qr_codes_parent_qr_id_fkey"
	}),
	foreignKey({
		columns: [table.scannedBy],
		foreignColumns: [users.id],
		name: "qr_codes_scanned_by_fkey"
	}),
	foreignKey({
		columns: [table.typeId],
		foreignColumns: [qrTypes.id],
		name: "qr_codes_type_id_fkey"
	}),
	unique("qr_codes_code_key").on(table.code),
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

export const retailerLedger = pgTable("retailer_ledger", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	redemptionType: integer("redemption_type").notNull(),
	amount: numeric().notNull(),
	type: text().notNull(),
	remarks: text(),
	openingBalance: numeric("opening_balance").notNull(),
	closingBalance: numeric("closing_balance").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "retailer_ledger_user_id_fkey"
	}).onDelete("cascade"),
]);

export const redemptions = pgTable("redemptions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	redemptionId: text("redemption_id").notNull(),
	channelId: integer("channel_id").notNull(),
	pointsRedeemed: integer("points_redeemed").notNull(),
	amount: integer(),
	status: integer().notNull(),
	schemeId: integer("scheme_id"),
	metadata: jsonb().notNull(),
	approvedBy: integer("approved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	channelReferenceId: integer("channel_reference_id"),
}, (table) => [
	foreignKey({
		columns: [table.approvedBy],
		foreignColumns: [users.id],
		name: "redemptions_approved_by_fkey"
	}),
	foreignKey({
		columns: [table.channelId],
		foreignColumns: [redemptionChannels.id],
		name: "redemptions_channel_id_fkey"
	}),
	foreignKey({
		columns: [table.schemeId],
		foreignColumns: [schemes.id],
		name: "redemptions_scheme_id_fkey"
	}),
	foreignKey({
		columns: [table.status],
		foreignColumns: [redemptionStatuses.id],
		name: "redemptions_status_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "redemptions_user_id_fkey"
	}).onDelete("cascade"),
	unique("redemptions_redemption_id_key").on(table.redemptionId),
]);

export const referrals = pgTable("referrals", {
	id: serial().primaryKey().notNull(),
	referrerId: integer("referrer_id").notNull(),
	referredId: integer("referred_id").notNull(),
	status: text().default('pending').notNull(),
	bonusAwarded: integer("bonus_awarded").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.referredId],
		foreignColumns: [users.id],
		name: "referrals_referred_id_fkey"
	}),
	foreignKey({
		columns: [table.referrerId],
		foreignColumns: [users.id],
		name: "referrals_referrer_id_fkey"
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

export const retailerTransactionLogs = pgTable("retailer_transaction_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	status: text().notNull(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale: 7 }),
	longitude: numeric({ precision: 10, scale: 7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.earningType],
		foreignColumns: [earningTypes.id],
		name: "retailer_transaction_logs_earning_type_fkey"
	}),
	foreignKey({
		columns: [table.schemeId],
		foreignColumns: [schemes.id],
		name: "retailer_transaction_logs_scheme_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "retailer_transaction_logs_user_id_fkey"
	}).onDelete("cascade"),
]);

export const retailers = pgTable("retailers", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	uniqueId: text("unique_id").notNull(),
	name: text(),
	phone: text().notNull(),
	email: text(),
	aadhaar: text().notNull(),
	pan: text(),
	gst: text(),
	city: text(),
	district: text(),
	state: text(),
	dob: timestamp({ mode: 'string' }),
	gender: text(),
	referralCode: text("referral_code"),
	isKycVerified: boolean("is_kyc_verified").default(false),
	onboardingTypeId: integer("onboarding_type_id").notNull(),
	tdsConsent: boolean("tds_consent").default(false).notNull(),
	bankAccountNo: text("bank_account_no"),
	bankAccountIfsc: text("bank_account_ifsc"),
	bankAccountName: text("bank_account_name"),
	upiId: text("upi_id"),
	isBankValidated: boolean("is_bank_validated").default(false),
	pointsBalance: numeric("points_balance", { precision: 10, scale: 2 }).default('0'),
	sapCustomerCode: text("sap_customer_code"),
	kycDocuments: jsonb("kyc_documents"),
	totalEarnings: numeric("total_earnings", { precision: 10, scale: 2 }).default('0'),
	totalBalance: numeric("total_balance", { precision: 10, scale: 2 }).default('0'),
	totalRedeemed: numeric("total_redeemed", { precision: 10, scale: 2 }).default('0'),
	tdsPercentage: integer("tds_percentage").default(0),
	tdsKitty: numeric("tds_kitty", { precision: 10, scale: 2 }).default('0'),
	tdsDeducted: numeric("tds_deducted", { precision: 10, scale: 2 }).default('0'),
	lastSettlementDate: timestamp("last_settlement_date", { mode: 'string' }),
	shopName: text("shop_name"),
	addressLine1: text("address_line_1"),
	addressLine2: text("address_line_2"),
	pincode: text(),
	redeemablePoints: numeric("redeemable_points", { precision: 10, scale: 2 }).default('0'),
	aadhaarAddress: text("aadhaar_address"),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "retailers_user_id_fkey"
	}),
	unique("retailers_unique_id_key").on(table.uniqueId),
	unique("retailers_phone_key").on(table.phone),
	unique("retailers_referral_code_key").on(table.referralCode),
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

export const retailerTransactions = pgTable("retailer_transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale: 7 }),
	longitude: numeric({ precision: 10, scale: 7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.earningType],
		foreignColumns: [earningTypes.id],
		name: "retailer_transactions_earning_type_fkey"
	}),
	foreignKey({
		columns: [table.schemeId],
		foreignColumns: [schemes.id],
		name: "retailer_transactions_scheme_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "retailer_transactions_user_id_fkey"
	}).onDelete("cascade"),
]);

export const tdsRecords = pgTable("tds_records", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	financialYear: text("financial_year").notNull(),
	tdsKitty: numeric("tds_kitty").default('0').notNull(),
	tdsDeducted: numeric("tds_deducted").default('0').notNull(),
	reversedAmount: numeric("reversed_amount").default('0').notNull(),
	status: text().default('active').notNull(),
	settledAt: timestamp("settled_at", { mode: 'string' }),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "tds_records_user_id_fkey"
	}).onDelete("cascade"),
	unique("tds_records_user_id_fy_key").on(table.userId, table.financialYear),
]);

export const tblInventory = pgTable("tbl_inventory", {
	inventoryId: serial("inventory_id").primaryKey().notNull(),
	serialNumber: varchar("serial_number", { length: 255 }).notNull(),
	batchId: integer("batch_id").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isQrScanned: boolean("is_qr_scanned").default(false).notNull(),
}, (table) => [
	unique("tbl_inventory_serial_number_unique").on(table.serialNumber),
]);

export const tblRandomKeys = pgTable("tbl_random_keys", {
	randomKeyId: serial("random_key_id").primaryKey().notNull(),
	randomKey: varchar("random_key", { length: 255 }).notNull(),
	status: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("tbl_random_keys_random_key_unique").on(table.randomKey),
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

export const userAssociations = pgTable("user_associations", {
	id: serial().primaryKey().notNull(),
	parentUserId: integer("parent_user_id").notNull(),
	childUserId: integer("child_user_id").notNull(),
	associationType: text("association_type").notNull(),
	status: text().default('active').notNull(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.childUserId],
		foreignColumns: [users.id],
		name: "user_associations_child_user_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.parentUserId],
		foreignColumns: [users.id],
		name: "user_associations_parent_user_id_fkey"
	}).onDelete("cascade"),
	unique("user_associations_parent_child_type_key").on(table.parentUserId, table.childUserId, table.associationType),
]);

export const tmpThirdPartyVerificationLogs = pgTable("tmp_third_party_verification_logs", {
	id: text(),
	userId: text("user_id"),
	verificationType: text("verification_type"),
	provider: text(),
	requestData: text("request_data"),
	responseData: text("response_data"),
	responseObject: text("response_object"),
	metadata: text(),
	createdAt: text("created_at"),
});

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

export const tblInventoryBatch = pgTable("tbl_inventory_batch", {
	batchId: serial("batch_id").primaryKey().notNull(),
	skuCode: varchar("sku_code", { length: 255 }).notNull(),
	quantity: integer().notNull(),
	type: inventoryType().notNull(),
	fileUrl: varchar("file_url", { length: 255 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: integer("created_by"),
	updatedBy: integer("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userScopeMapping = pgTable("user_scope_mapping", {
	id: serial().primaryKey().notNull(),
	userTypeId: integer("user_type_id"),
	userId: integer("user_id"),
	scopeType: varchar("scope_type", { length: 20 }).notNull(),
	scopeLevelId: integer("scope_level_id").notNull(),
	scopeEntityId: integer("scope_entity_id"),
	accessType: varchar("access_type", { length: 20 }).default('specific').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("user_scope_mapping_unique").using("btree", table.userTypeId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops"), table.scopeType.asc().nullsLast().op("text_ops"), table.scopeLevelId.asc().nullsLast().op("int4_ops"), table.scopeEntityId.asc().nullsLast().op("int4_ops")).where(sql`(is_active = true)`),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "user_scope_mapping_user_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.userTypeId],
		foreignColumns: [userTypeEntity.id],
		name: "user_scope_mapping_user_type_id_fkey"
	}).onDelete("cascade"),
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

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	roleId: integer("role_id").notNull(),
	name: text(),
	phone: text().notNull(),
	email: text(),
	password: text(),
	location: jsonb(),
	referralCode: text("referral_code"),
	referrerId: integer("referrer_id"),
	onboardingTypeId: integer("onboarding_type_id").notNull(),
	approvalStatusId: integer("approval_status_id").notNull(),
	languageId: integer("language_id").default(1).notNull(),
	isSuspended: boolean("is_suspended").default(false),
	suspendedAt: timestamp("suspended_at", { mode: 'string' }),
	fcmToken: text("fcm_token"),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	blockStatus: blockStatus("block_status").default('basic_registration'),
	profilePhotoUrl: text("profile_photo_url"),
}, (table) => [
	uniqueIndex("users_email_unique_not_null").using("btree", table.email.asc().nullsLast().op("text_ops")).where(sql`(email IS NOT NULL)`),
	foreignKey({
		columns: [table.approvalStatusId],
		foreignColumns: [approvalStatuses.id],
		name: "users_approval_status_id_fkey"
	}),
	foreignKey({
		columns: [table.languageId],
		foreignColumns: [languages.id],
		name: "users_language_id_fkey"
	}),
	foreignKey({
		columns: [table.onboardingTypeId],
		foreignColumns: [onboardingTypes.id],
		name: "users_onboarding_type_id_fkey"
	}),
	foreignKey({
		columns: [table.referrerId],
		foreignColumns: [table.id],
		name: "users_referrer_id_fkey"
	}),
	foreignKey({
		columns: [table.roleId],
		foreignColumns: [userTypeEntity.id],
		name: "users_role_id_fkey"
	}),
	unique("users_phone_key").on(table.phone),
	unique("users_referral_code_key").on(table.referralCode),
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
	foreignKey({
		columns: [table.uploadedBy],
		foreignColumns: [users.id],
		name: "amazon_products_uploaded_by_fkey"
	}),
]);

export const userAmazonOrders = pgTable("user_amazon_orders", {
	userAmzOrderId: serial("user_amz_order_id").primaryKey().notNull(),
	orderId: text("order_id").notNull(),
	userId: integer("user_id").notNull(),
	redemptionId: text("redemption_id"),
	orderData: jsonb("order_data").notNull(),
	orderStatus: text("order_status").default('processing'),
	pointsDeducted: integer("points_deducted").notNull(),
	tdsDeducted: integer("tds_deducted").default(0),
	shippingDetails: jsonb("shipping_details"),
	trackingDetails: jsonb("tracking_details"),
	estimatedDelivery: timestamp("estimated_delivery", { mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "amazon_orders_user_id_fkey"
	}).onDelete("cascade"),
	unique("user_amazon_orders_order_id_unique").on(table.orderId),
]);

export const amazonOrderItems = pgTable("amazon_order_items", {
	orderItemId: serial("order_item_id").primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	productId: integer("product_id").notNull(),
	asinSku: text("asin_sku").notNull(),
	productName: text("product_name").notNull(),
	quantity: integer().default(1).notNull(),
	pointsPerItem: integer("points_per_item").notNull(),
	totalPoints: integer("total_points").notNull(),
	status: text().default('processing'),
	statusHistory: jsonb("status_history").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.orderId],
		foreignColumns: [userAmazonOrders.userAmzOrderId],
		name: "order_items_order_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.productId],
		foreignColumns: [amazonMarketplaceProducts.amazonMarketplaceProductId],
		name: "order_items_product_id_fkey"
	}),
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
		columns: [table.orderId],
		foreignColumns: [userAmazonOrders.userAmzOrderId],
		name: "tickets_order_id_fkey"
	}),
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

export const redemptionApprovals = pgTable("redemption_approvals", {
	approvalId: serial("approval_id").primaryKey().notNull(),
	redemptionId: integer("redemption_id").notNull(),
	userId: integer("user_id").notNull(),
	requestedPoints: integer("requested_points").notNull(),
	redemptionType: text("redemption_type").notNull(),
	approvalStatus: text("approval_status").default('PENDING'),
	approvalLevel: text("approval_level").default('FINANCE'),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	metadata: jsonb().default({}),
	flaggedReasons: text("flagged_reasons").array(),
	escalationNotes: text("escalation_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("approval_redemption_unique").using("btree", table.redemptionId.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.redemptionId],
		foreignColumns: [redemptions.id],
		name: "approvals_redemption_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "approvals_user_id_fkey"
	}),
	foreignKey({
		columns: [table.approvedBy],
		foreignColumns: [users.id],
		name: "approvals_approved_by_fkey"
	}),
]);

export const physicalRewardsRedemptions = pgTable("physical_rewards_redemptions", {
	redemptionId: serial("redemption_id").primaryKey().notNull(),
	redemptionRequestId: text("redemption_request_id").notNull(),
	userId: integer("user_id").notNull(),
	rewardId: integer("reward_id").notNull(),
	quantity: integer().default(1).notNull(),
	pointsDeducted: integer("points_deducted").notNull(),
	shippingAddress: jsonb("shipping_address").notNull(),
	status: text().default('PENDING'),
	trackingNumber: text("tracking_number"),
	courierName: text("courier_name"),
	estimatedDelivery: timestamp("estimated_delivery", { mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
	deliveryProof: text("delivery_proof"),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "physical_rewards_user_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.rewardId],
		foreignColumns: [physicalRewardsCatalogue.rewardId],
		name: "physical_rewards_reward_id_fkey"
	}),
	unique("physical_rewards_redemptions_redemption_request_id_unique").on(table.redemptionRequestId),
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
}, (table) => [
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [users.id],
		name: "thresholds_created_by_fkey"
	}),
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

export const userApprovalRoles = pgTable("user_approval_roles", {
	mappingId: serial("mapping_id").primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	roleId: integer("role_id").notNull(),
	assignedBy: integer("assigned_by"),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	uniqueIndex("user_role_unique").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.roleId.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "user_approval_roles_user_id_fkey"
	}),
	foreignKey({
		columns: [table.roleId],
		foreignColumns: [approvalRoles.roleId],
		name: "user_approval_roles_role_id_fkey"
	}),
	foreignKey({
		columns: [table.assignedBy],
		foreignColumns: [users.id],
		name: "user_approval_roles_assigned_by_fkey"
	}),
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

export const redemptionUpi = pgTable("redemption_upi", {
	id: serial().primaryKey().notNull(),
	redemptionId: integer("redemption_id").notNull(),
	upiId: text("upi_id").notNull(),
	razorpayPayoutId: text("razorpay_payout_id"),
	razorpayFundAccountId: text("razorpay_fund_account_id"),
	razorpayContactId: text("razorpay_contact_id"),
	utr: text(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.redemptionId],
		foreignColumns: [redemptions.id],
		name: "redemption_upi_redemption_id_fkey"
	}).onDelete("cascade"),
	unique("redemption_upi_redemption_id_unique").on(table.redemptionId),
]);

export const redemptionVouchers = pgTable("redemption_vouchers", {
	id: serial().primaryKey().notNull(),
	redemptionId: integer("redemption_id").notNull(),
	voucherCode: text("voucher_code").notNull(),
	voucherPin: text("voucher_pin"),
	platformVoucherId: text("platform_voucher_id"),
	platformOrderId: text("platform_order_id"),
	validFrom: timestamp("valid_from", { mode: 'string' }).defaultNow(),
	validUntil: timestamp("valid_until", { mode: 'string' }),
	isRedeemed: boolean("is_redeemed").default(false),
	redeemedAt: timestamp("redeemed_at", { mode: 'string' }),
	brand: text(),
	denomination: numeric({ precision: 10, scale: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.redemptionId],
		foreignColumns: [redemptions.id],
		name: "redemption_vouchers_redemption_id_fkey"
	}).onDelete("cascade"),
	unique("redemption_vouchers_redemption_id_unique").on(table.redemptionId),
	unique("redemption_vouchers_voucher_code_unique").on(table.voucherCode),
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

export const redemptionBankTransfers = pgTable("redemption_bank_transfers", {
	id: serial().primaryKey().notNull(),
	redemptionId: integer("redemption_id").notNull(),
	accountNumber: text("account_number").notNull(),
	ifscCode: text("ifsc_code").notNull(),
	accountHolderName: text("account_holder_name").notNull(),
	bankName: text("bank_name"),
	razorpayPayoutId: text("razorpay_payout_id"),
	razorpayFundAccountId: text("razorpay_fund_account_id"),
	razorpayContactId: text("razorpay_contact_id"),
	utr: text(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.redemptionId],
		foreignColumns: [redemptions.id],
		name: "redemption_bank_transfers_redemption_id_fkey"
	}).onDelete("cascade"),
	unique("redemption_bank_transfers_redemption_id_unique").on(table.redemptionId),
]);
