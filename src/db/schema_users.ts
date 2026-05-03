import { pgTable, foreignKey, serial, text, integer, jsonb, varchar, timestamp, unique, boolean, numeric, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { blockStatus } from "./schema_enums"
import { approvalStatuses, languages, onboardingTypes, userTypeEntity, approvalRoles } from "./schema_master"

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
	retailerCertificate: text("retailer_certificate"),
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
	attachedDistributorId: integer("attached_distributor_id"),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "retailers_user_id_fkey"
	}),
	foreignKey({
		columns: [table.attachedDistributorId],
		foreignColumns: [users.id],
		name: "retailers_attached_distributor_id_fkey"
	}),
	unique("retailers_unique_id_key").on(table.uniqueId),
	unique("retailers_phone_key").on(table.phone),
	unique("retailers_referral_code_key").on(table.referralCode),
]);

export const mechanics = pgTable("mechanics", {
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
	mechanicCertificate: text("mechanic_certificate"),
	totalEarnings: numeric("total_earnings", { precision: 10, scale: 2 }).default('0'),
	totalBalance: numeric("total_balance", { precision: 10, scale: 2 }).default('0'),
	totalRedeemed: numeric("total_redeemed", { precision: 10, scale: 2 }).default('0'),
	tdsPercentage: integer("tds_percentage").default(0),
	tdsKitty: numeric("tds_kitty", { precision: 10, scale: 2 }).default('0'),
	tdsDeducted: numeric("tds_deducted", { precision: 10, scale: 2 }).default('0'),
	lastSettlementDate: timestamp("last_settlement_date", { mode: 'string' }),
	attachedRetailerId: integer("attached_retailer_id"),
	addressLine1: text("address_line_1"),
	addressLine2: text("address_line_2"),
	pincode: text(),
	redeemablePoints: numeric("redeemable_points", { precision: 10, scale: 2 }).default('0'),
	aadhaarAddress: text("aadhaar_address"),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "mechanics_user_id_fkey"
	}),
	foreignKey({
		columns: [table.attachedRetailerId],
		foreignColumns: [users.id],
		name: "mechanics_attached_retailer_id_fkey"
	}),
	unique("mechanics_unique_id_key").on(table.uniqueId),
	unique("mechanics_phone_key").on(table.phone),
	unique("mechanics_referral_code_key").on(table.referralCode),
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

export const distributors = pgTable("distributors", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	uniqueId: text("unique_id").notNull(),
	name: text(),
	phone: text().notNull(),
	email: text(),
	aadhaar: text(),
	pan: text(),
	gst: text(),
	city: text(),
	district: text(),
	state: text(),
	onboardingTypeId: integer("onboarding_type_id").notNull(),
	shopName: text("shop_name"),
	addressLine1: text("address_line_1"),
	addressLine2: text("address_line_2"),
	pincode: text(),
	sapCustomerCode: text("sap_customer_code"),
	isKycVerified: boolean("is_kyc_verified").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "distributors_user_id_fkey"
	}),
	unique("distributors_unique_id_key").on(table.uniqueId),
	unique("distributors_phone_key").on(table.phone),
]);

export const tdsRecords = pgTable("tds_records", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	panNumber: text("pan_number").notNull(),
	amount: numeric({ precision: 10, scale: 2 }).notNull(),
	tdsAmount: numeric("tds_amount", { precision: 10, scale: 2 }).notNull(),
	financialYear: text("financial_year").notNull(),
	quarter: integer().notNull(),
	status: text().default('pending').notNull(),
	certificateUrl: text("certificate_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "tds_records_user_id_fkey"
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
