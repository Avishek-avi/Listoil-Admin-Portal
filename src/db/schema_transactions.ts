import { pgTable, foreignKey, serial, text, integer, jsonb, varchar, timestamp, unique, boolean, numeric, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { inventoryType } from "./schema_enums"
import { users, userAmazonOrders } from "./schema_users"
import { earningTypes, schemes, redemptionChannels, redemptionStatuses, qrTypes, physicalRewardsCatalogue, amazonMarketplaceProducts } from "./schema_master"

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

export const mechanicTransactions = pgTable("mechanic_transactions", {
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
		name: "mechanic_transactions_earning_type_fkey"
	}),
	foreignKey({
		columns: [table.schemeId],
		foreignColumns: [schemes.id],
		name: "mechanic_transactions_scheme_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "mechanic_transactions_user_id_fkey"
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

export const mechanicLedger = pgTable("mechanic_ledger", {
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
		name: "mechanic_ledger_user_id_fkey"
	}).onDelete("cascade"),
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

export const tblInventory = pgTable("tbl_inventory", {
	inventoryId: serial("inventory_id").primaryKey().notNull(),
	serialNumber: varchar("serial_number", { length: 255 }).notNull(),
	batchId: integer("batch_id").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isQrScanned: boolean("is_qr_scanned").default(false).notNull(),
}, (table) => [
	unique("tbl_inventory_serial_number_unique").on(table.serialNumber),
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

export const mechanicTransactionLogs = pgTable("mechanic_transaction_logs", {
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
		name: "mechanic_transaction_logs_earning_type_fkey"
	}),
	foreignKey({
		columns: [table.schemeId],
		foreignColumns: [schemes.id],
		name: "mechanic_transaction_logs_scheme_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "mechanic_transaction_logs_user_id_fkey"
	}).onDelete("cascade"),
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
