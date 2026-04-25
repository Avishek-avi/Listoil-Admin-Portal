import { relations } from "drizzle-orm/relations";
import { users, auditLogs, counterSales, schemeTypes, campaigns, counterSalesLedger, earningTypes, counterSalesTransactionLogs, schemes, counterSalesTransactions, appConfigs, electricianLedger, electricianTransactionLogs, client, locationEntity, locationLevelMaster, locationEntityPincode, pincodeMaster, electricians, kycDocuments, electricianTransactions, notificationTemplates, eventMaster, otpMaster, skuEntity, participantSkuAccess, skuLevelMaster, notifications, qrCodes, qrTypes, retailerLedger, redemptions, redemptionChannels, redemptionStatuses, referrals, skuPointConfig, skuVariant, userTypeEntity, retailerTransactionLogs, retailers, retailerTransactions, tdsRecords, thirdPartyVerificationLogs, userAssociations, systemLogs, userScopeMapping, userTypeLevelMaster, approvalStatuses, languages, onboardingTypes, creativesTypes, creatives, eventLogs, ticketStatuses, tickets, ticketTypes, amazonMarketplaceProducts, userAmazonOrders, amazonOrderItems, amazonTickets, approvalAuditLogs, redemptionApprovals, physicalRewardsRedemptions, physicalRewardsCatalogue, redemptionThresholds, userAmazonCart, userAmazonWishlist, userApprovalRoles, approvalRoles, inappNotifications, notificationLogs, redemptionUpi, redemptionVouchers, thirdPartyApiLogs, redemptionBankTransfers } from "./schema";

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.changedBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	auditLogs: many(auditLogs),
	counterSales_attachedRetailerId: many(counterSales, {
		relationName: "counterSales_attachedRetailerId_users_id"
	}),
	counterSales_userId: many(counterSales, {
		relationName: "counterSales_userId_users_id"
	}),
	counterSalesLedgers: many(counterSalesLedger),
	counterSalesTransactionLogs: many(counterSalesTransactionLogs),
	counterSalesTransactions: many(counterSalesTransactions),
	appConfigs: many(appConfigs),
	electricianLedgers: many(electricianLedger),
	electricianTransactionLogs: many(electricianTransactionLogs),
	electricians: many(electricians),
	kycDocuments: many(kycDocuments),
	electricianTransactions: many(electricianTransactions),
	otpMasters: many(otpMaster),
	participantSkuAccesses: many(participantSkuAccess),
	notifications: many(notifications),
	qrCodes: many(qrCodes),
	retailerLedgers: many(retailerLedger),
	redemptions_approvedBy: many(redemptions, {
		relationName: "redemptions_approvedBy_users_id"
	}),
	redemptions_userId: many(redemptions, {
		relationName: "redemptions_userId_users_id"
	}),
	referrals_referredId: many(referrals, {
		relationName: "referrals_referredId_users_id"
	}),
	referrals_referrerId: many(referrals, {
		relationName: "referrals_referrerId_users_id"
	}),
	retailerTransactionLogs: many(retailerTransactionLogs),
	retailers: many(retailers),
	retailerTransactions: many(retailerTransactions),
	tdsRecords: many(tdsRecords),
	thirdPartyVerificationLogs: many(thirdPartyVerificationLogs),
	userAssociations_childUserId: many(userAssociations, {
		relationName: "userAssociations_childUserId_users_id"
	}),
	userAssociations_parentUserId: many(userAssociations, {
		relationName: "userAssociations_parentUserId_users_id"
	}),
	systemLogs: many(systemLogs),
	userScopeMappings: many(userScopeMapping),
	approvalStatus: one(approvalStatuses, {
		fields: [users.approvalStatusId],
		references: [approvalStatuses.id]
	}),
	language: one(languages, {
		fields: [users.languageId],
		references: [languages.id]
	}),
	onboardingType: one(onboardingTypes, {
		fields: [users.onboardingTypeId],
		references: [onboardingTypes.id]
	}),
	user: one(users, {
		fields: [users.referrerId],
		references: [users.id],
		relationName: "users_referrerId_users_id"
	}),
	users: many(users, {
		relationName: "users_referrerId_users_id"
	}),
	userTypeEntity: one(userTypeEntity, {
		fields: [users.roleId],
		references: [userTypeEntity.id]
	}),
	eventLogs: many(eventLogs),
	amazonMarketplaceProducts: many(amazonMarketplaceProducts),
	userAmazonOrders: many(userAmazonOrders),
	amazonTickets_userId: many(amazonTickets, {
		relationName: "amazonTickets_userId_users_id"
	}),
	amazonTickets_resolvedBy: many(amazonTickets, {
		relationName: "amazonTickets_resolvedBy_users_id"
	}),
	approvalAuditLogs: many(approvalAuditLogs),
	redemptionApprovals_userId: many(redemptionApprovals, {
		relationName: "redemptionApprovals_userId_users_id"
	}),
	redemptionApprovals_approvedBy: many(redemptionApprovals, {
		relationName: "redemptionApprovals_approvedBy_users_id"
	}),
	physicalRewardsRedemptions: many(physicalRewardsRedemptions),
	redemptionThresholds: many(redemptionThresholds),
	userAmazonCarts: many(userAmazonCart),
	userAmazonWishlists: many(userAmazonWishlist),
	userApprovalRoles_userId: many(userApprovalRoles, {
		relationName: "userApprovalRoles_userId_users_id"
	}),
	userApprovalRoles_assignedBy: many(userApprovalRoles, {
		relationName: "userApprovalRoles_assignedBy_users_id"
	}),
	inappNotifications: many(inappNotifications),
	notificationLogs: many(notificationLogs),
}));

export const counterSalesRelations = relations(counterSales, ({one}) => ({
	user_attachedRetailerId: one(users, {
		fields: [counterSales.attachedRetailerId],
		references: [users.id],
		relationName: "counterSales_attachedRetailerId_users_id"
	}),
	user_userId: one(users, {
		fields: [counterSales.userId],
		references: [users.id],
		relationName: "counterSales_userId_users_id"
	}),
}));

export const campaignsRelations = relations(campaigns, ({one}) => ({
	schemeType: one(schemeTypes, {
		fields: [campaigns.schemeType],
		references: [schemeTypes.id]
	}),
}));

export const schemeTypesRelations = relations(schemeTypes, ({many}) => ({
	campaigns: many(campaigns),
	schemes: many(schemes),
}));

export const counterSalesLedgerRelations = relations(counterSalesLedger, ({one}) => ({
	user: one(users, {
		fields: [counterSalesLedger.userId],
		references: [users.id]
	}),
}));

export const counterSalesTransactionLogsRelations = relations(counterSalesTransactionLogs, ({one}) => ({
	earningType: one(earningTypes, {
		fields: [counterSalesTransactionLogs.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [counterSalesTransactionLogs.schemeId],
		references: [schemes.id]
	}),
	user: one(users, {
		fields: [counterSalesTransactionLogs.userId],
		references: [users.id]
	}),
}));

export const earningTypesRelations = relations(earningTypes, ({many}) => ({
	counterSalesTransactionLogs: many(counterSalesTransactionLogs),
	counterSalesTransactions: many(counterSalesTransactions),
	electricianTransactionLogs: many(electricianTransactionLogs),
	electricianTransactions: many(electricianTransactions),
	retailerTransactionLogs: many(retailerTransactionLogs),
	retailerTransactions: many(retailerTransactions),
}));

export const schemesRelations = relations(schemes, ({one, many}) => ({
	counterSalesTransactionLogs: many(counterSalesTransactionLogs),
	counterSalesTransactions: many(counterSalesTransactions),
	electricianTransactionLogs: many(electricianTransactionLogs),
	electricianTransactions: many(electricianTransactions),
	redemptions: many(redemptions),
	schemeType: one(schemeTypes, {
		fields: [schemes.schemeType],
		references: [schemeTypes.id]
	}),
	retailerTransactionLogs: many(retailerTransactionLogs),
	retailerTransactions: many(retailerTransactions),
}));

export const counterSalesTransactionsRelations = relations(counterSalesTransactions, ({one}) => ({
	earningType: one(earningTypes, {
		fields: [counterSalesTransactions.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [counterSalesTransactions.schemeId],
		references: [schemes.id]
	}),
	user: one(users, {
		fields: [counterSalesTransactions.userId],
		references: [users.id]
	}),
}));

export const appConfigsRelations = relations(appConfigs, ({one}) => ({
	user: one(users, {
		fields: [appConfigs.updatedBy],
		references: [users.id]
	}),
}));

export const electricianLedgerRelations = relations(electricianLedger, ({one}) => ({
	user: one(users, {
		fields: [electricianLedger.userId],
		references: [users.id]
	}),
}));

export const electricianTransactionLogsRelations = relations(electricianTransactionLogs, ({one}) => ({
	earningType: one(earningTypes, {
		fields: [electricianTransactionLogs.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [electricianTransactionLogs.schemeId],
		references: [schemes.id]
	}),
	user: one(users, {
		fields: [electricianTransactionLogs.userId],
		references: [users.id]
	}),
}));

export const locationEntityRelations = relations(locationEntity, ({one, many}) => ({
	client: one(client, {
		fields: [locationEntity.clientId],
		references: [client.id]
	}),
	locationLevelMaster: one(locationLevelMaster, {
		fields: [locationEntity.levelId],
		references: [locationLevelMaster.id]
	}),
	locationEntity: one(locationEntity, {
		fields: [locationEntity.parentEntityId],
		references: [locationEntity.id],
		relationName: "locationEntity_parentEntityId_locationEntity_id"
	}),
	locationEntities: many(locationEntity, {
		relationName: "locationEntity_parentEntityId_locationEntity_id"
	}),
	locationEntityPincodes: many(locationEntityPincode),
}));

export const clientRelations = relations(client, ({many}) => ({
	locationEntities: many(locationEntity),
	locationLevelMasters: many(locationLevelMaster),
	skuPointConfigs: many(skuPointConfig),
	skuEntities: many(skuEntity),
	skuLevelMasters: many(skuLevelMaster),
}));

export const locationLevelMasterRelations = relations(locationLevelMaster, ({one, many}) => ({
	locationEntities: many(locationEntity),
	client: one(client, {
		fields: [locationLevelMaster.clientId],
		references: [client.id]
	}),
}));

export const locationEntityPincodeRelations = relations(locationEntityPincode, ({one}) => ({
	locationEntity: one(locationEntity, {
		fields: [locationEntityPincode.entityId],
		references: [locationEntity.id]
	}),
	pincodeMaster: one(pincodeMaster, {
		fields: [locationEntityPincode.pincodeId],
		references: [pincodeMaster.id]
	}),
}));

export const pincodeMasterRelations = relations(pincodeMaster, ({many}) => ({
	locationEntityPincodes: many(locationEntityPincode),
}));

export const electriciansRelations = relations(electricians, ({one}) => ({
	user: one(users, {
		fields: [electricians.userId],
		references: [users.id]
	}),
}));

export const kycDocumentsRelations = relations(kycDocuments, ({one}) => ({
	user: one(users, {
		fields: [kycDocuments.userId],
		references: [users.id]
	}),
}));

export const electricianTransactionsRelations = relations(electricianTransactions, ({one}) => ({
	earningType: one(earningTypes, {
		fields: [electricianTransactions.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [electricianTransactions.schemeId],
		references: [schemes.id]
	}),
	user: one(users, {
		fields: [electricianTransactions.userId],
		references: [users.id]
	}),
}));

export const eventMasterRelations = relations(eventMaster, ({one, many}) => ({
	notificationTemplate: one(notificationTemplates, {
		fields: [eventMaster.templateId],
		references: [notificationTemplates.id]
	}),
	eventLogs: many(eventLogs),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({many}) => ({
	eventMasters: many(eventMaster),
	notificationLogs: many(notificationLogs),
}));

export const otpMasterRelations = relations(otpMaster, ({one}) => ({
	user: one(users, {
		fields: [otpMaster.userId],
		references: [users.id]
	}),
}));

export const participantSkuAccessRelations = relations(participantSkuAccess, ({one}) => ({
	skuEntity: one(skuEntity, {
		fields: [participantSkuAccess.skuEntityId],
		references: [skuEntity.id]
	}),
	skuLevelMaster: one(skuLevelMaster, {
		fields: [participantSkuAccess.skuLevelId],
		references: [skuLevelMaster.id]
	}),
	user: one(users, {
		fields: [participantSkuAccess.userId],
		references: [users.id]
	}),
}));

export const skuEntityRelations = relations(skuEntity, ({one, many}) => ({
	participantSkuAccesses: many(participantSkuAccess),
	client: one(client, {
		fields: [skuEntity.clientId],
		references: [client.id]
	}),
	skuLevelMaster: one(skuLevelMaster, {
		fields: [skuEntity.levelId],
		references: [skuLevelMaster.id]
	}),
	skuEntity: one(skuEntity, {
		fields: [skuEntity.parentEntityId],
		references: [skuEntity.id],
		relationName: "skuEntity_parentEntityId_skuEntity_id"
	}),
	skuEntities: many(skuEntity, {
		relationName: "skuEntity_parentEntityId_skuEntity_id"
	}),
	skuVariants: many(skuVariant),
}));

export const skuLevelMasterRelations = relations(skuLevelMaster, ({one, many}) => ({
	participantSkuAccesses: many(participantSkuAccess),
	skuEntities: many(skuEntity),
	client: one(client, {
		fields: [skuLevelMaster.clientId],
		references: [client.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const qrCodesRelations = relations(qrCodes, ({one, many}) => ({
	qrCode: one(qrCodes, {
		fields: [qrCodes.parentQrId],
		references: [qrCodes.id],
		relationName: "qrCodes_parentQrId_qrCodes_id"
	}),
	qrCodes: many(qrCodes, {
		relationName: "qrCodes_parentQrId_qrCodes_id"
	}),
	user: one(users, {
		fields: [qrCodes.scannedBy],
		references: [users.id]
	}),
	qrType: one(qrTypes, {
		fields: [qrCodes.typeId],
		references: [qrTypes.id]
	}),
}));

export const qrTypesRelations = relations(qrTypes, ({many}) => ({
	qrCodes: many(qrCodes),
}));

export const retailerLedgerRelations = relations(retailerLedger, ({one}) => ({
	user: one(users, {
		fields: [retailerLedger.userId],
		references: [users.id]
	}),
}));

export const redemptionsRelations = relations(redemptions, ({one, many}) => ({
	user_approvedBy: one(users, {
		fields: [redemptions.approvedBy],
		references: [users.id],
		relationName: "redemptions_approvedBy_users_id"
	}),
	redemptionChannel: one(redemptionChannels, {
		fields: [redemptions.channelId],
		references: [redemptionChannels.id]
	}),
	scheme: one(schemes, {
		fields: [redemptions.schemeId],
		references: [schemes.id]
	}),
	redemptionStatus: one(redemptionStatuses, {
		fields: [redemptions.status],
		references: [redemptionStatuses.id]
	}),
	user_userId: one(users, {
		fields: [redemptions.userId],
		references: [users.id],
		relationName: "redemptions_userId_users_id"
	}),
	approvalAuditLogs: many(approvalAuditLogs),
	redemptionApprovals: many(redemptionApprovals),
	redemptionUpis: many(redemptionUpi),
	redemptionVouchers: many(redemptionVouchers),
	thirdPartyApiLogs: many(thirdPartyApiLogs),
	redemptionBankTransfers: many(redemptionBankTransfers),
}));

export const redemptionChannelsRelations = relations(redemptionChannels, ({many}) => ({
	redemptions: many(redemptions),
}));

export const redemptionStatusesRelations = relations(redemptionStatuses, ({many}) => ({
	redemptions: many(redemptions),
}));

export const referralsRelations = relations(referrals, ({one}) => ({
	user_referredId: one(users, {
		fields: [referrals.referredId],
		references: [users.id],
		relationName: "referrals_referredId_users_id"
	}),
	user_referrerId: one(users, {
		fields: [referrals.referrerId],
		references: [users.id],
		relationName: "referrals_referrerId_users_id"
	}),
}));

export const skuPointConfigRelations = relations(skuPointConfig, ({one}) => ({
	client: one(client, {
		fields: [skuPointConfig.clientId],
		references: [client.id]
	}),
	skuVariant: one(skuVariant, {
		fields: [skuPointConfig.skuVariantId],
		references: [skuVariant.id]
	}),
	userTypeEntity: one(userTypeEntity, {
		fields: [skuPointConfig.userTypeId],
		references: [userTypeEntity.id]
	}),
}));

export const skuVariantRelations = relations(skuVariant, ({one, many}) => ({
	skuPointConfigs: many(skuPointConfig),
	skuEntity: one(skuEntity, {
		fields: [skuVariant.skuEntityId],
		references: [skuEntity.id]
	}),
}));

export const userTypeEntityRelations = relations(userTypeEntity, ({one, many}) => ({
	skuPointConfigs: many(skuPointConfig),
	userScopeMappings: many(userScopeMapping),
	userTypeLevelMaster: one(userTypeLevelMaster, {
		fields: [userTypeEntity.levelId],
		references: [userTypeLevelMaster.id]
	}),
	userTypeEntity: one(userTypeEntity, {
		fields: [userTypeEntity.parentTypeId],
		references: [userTypeEntity.id],
		relationName: "userTypeEntity_parentTypeId_userTypeEntity_id"
	}),
	userTypeEntities: many(userTypeEntity, {
		relationName: "userTypeEntity_parentTypeId_userTypeEntity_id"
	}),
	users: many(users),
}));

export const retailerTransactionLogsRelations = relations(retailerTransactionLogs, ({one}) => ({
	earningType: one(earningTypes, {
		fields: [retailerTransactionLogs.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [retailerTransactionLogs.schemeId],
		references: [schemes.id]
	}),
	user: one(users, {
		fields: [retailerTransactionLogs.userId],
		references: [users.id]
	}),
}));

export const retailersRelations = relations(retailers, ({one}) => ({
	user: one(users, {
		fields: [retailers.userId],
		references: [users.id]
	}),
}));

export const retailerTransactionsRelations = relations(retailerTransactions, ({one}) => ({
	earningType: one(earningTypes, {
		fields: [retailerTransactions.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [retailerTransactions.schemeId],
		references: [schemes.id]
	}),
	user: one(users, {
		fields: [retailerTransactions.userId],
		references: [users.id]
	}),
}));

export const tdsRecordsRelations = relations(tdsRecords, ({one}) => ({
	user: one(users, {
		fields: [tdsRecords.userId],
		references: [users.id]
	}),
}));

export const thirdPartyVerificationLogsRelations = relations(thirdPartyVerificationLogs, ({one}) => ({
	user: one(users, {
		fields: [thirdPartyVerificationLogs.userId],
		references: [users.id]
	}),
}));

export const userAssociationsRelations = relations(userAssociations, ({one}) => ({
	user_childUserId: one(users, {
		fields: [userAssociations.childUserId],
		references: [users.id],
		relationName: "userAssociations_childUserId_users_id"
	}),
	user_parentUserId: one(users, {
		fields: [userAssociations.parentUserId],
		references: [users.id],
		relationName: "userAssociations_parentUserId_users_id"
	}),
}));

export const systemLogsRelations = relations(systemLogs, ({one}) => ({
	user: one(users, {
		fields: [systemLogs.userId],
		references: [users.id]
	}),
}));

export const userScopeMappingRelations = relations(userScopeMapping, ({one}) => ({
	user: one(users, {
		fields: [userScopeMapping.userId],
		references: [users.id]
	}),
	userTypeEntity: one(userTypeEntity, {
		fields: [userScopeMapping.userTypeId],
		references: [userTypeEntity.id]
	}),
}));

export const userTypeLevelMasterRelations = relations(userTypeLevelMaster, ({one, many}) => ({
	userTypeEntities: many(userTypeEntity),
	userTypeLevelMaster: one(userTypeLevelMaster, {
		fields: [userTypeLevelMaster.parentLevelId],
		references: [userTypeLevelMaster.id],
		relationName: "userTypeLevelMaster_parentLevelId_userTypeLevelMaster_id"
	}),
	userTypeLevelMasters: many(userTypeLevelMaster, {
		relationName: "userTypeLevelMaster_parentLevelId_userTypeLevelMaster_id"
	}),
}));

export const approvalStatusesRelations = relations(approvalStatuses, ({many}) => ({
	users: many(users),
}));

export const languagesRelations = relations(languages, ({many}) => ({
	users: many(users),
}));

export const onboardingTypesRelations = relations(onboardingTypes, ({many}) => ({
	users: many(users),
}));

export const creativesRelations = relations(creatives, ({one}) => ({
	creativesType: one(creativesTypes, {
		fields: [creatives.typeId],
		references: [creativesTypes.id]
	}),
}));

export const creativesTypesRelations = relations(creativesTypes, ({many}) => ({
	creatives: many(creatives),
}));

export const eventLogsRelations = relations(eventLogs, ({one}) => ({
	eventMaster: one(eventMaster, {
		fields: [eventLogs.eventId],
		references: [eventMaster.id]
	}),
	user: one(users, {
		fields: [eventLogs.userId],
		references: [users.id]
	}),
}));

export const ticketsRelations = relations(tickets, ({one}) => ({
	ticketStatus: one(ticketStatuses, {
		fields: [tickets.statusId],
		references: [ticketStatuses.id]
	}),
	ticketType: one(ticketTypes, {
		fields: [tickets.typeId],
		references: [ticketTypes.id]
	}),
}));

export const ticketStatusesRelations = relations(ticketStatuses, ({many}) => ({
	tickets: many(tickets),
}));

export const ticketTypesRelations = relations(ticketTypes, ({many}) => ({
	tickets: many(tickets),
}));

export const amazonMarketplaceProductsRelations = relations(amazonMarketplaceProducts, ({one, many}) => ({
	user: one(users, {
		fields: [amazonMarketplaceProducts.uploadedBy],
		references: [users.id]
	}),
	amazonOrderItems: many(amazonOrderItems),
}));

export const userAmazonOrdersRelations = relations(userAmazonOrders, ({one, many}) => ({
	user: one(users, {
		fields: [userAmazonOrders.userId],
		references: [users.id]
	}),
	amazonOrderItems: many(amazonOrderItems),
	amazonTickets: many(amazonTickets),
}));

export const amazonOrderItemsRelations = relations(amazonOrderItems, ({one}) => ({
	userAmazonOrder: one(userAmazonOrders, {
		fields: [amazonOrderItems.orderId],
		references: [userAmazonOrders.userAmzOrderId]
	}),
	amazonMarketplaceProduct: one(amazonMarketplaceProducts, {
		fields: [amazonOrderItems.productId],
		references: [amazonMarketplaceProducts.amazonMarketplaceProductId]
	}),
}));

export const amazonTicketsRelations = relations(amazonTickets, ({one}) => ({
	userAmazonOrder: one(userAmazonOrders, {
		fields: [amazonTickets.orderId],
		references: [userAmazonOrders.userAmzOrderId]
	}),
	user_userId: one(users, {
		fields: [amazonTickets.userId],
		references: [users.id],
		relationName: "amazonTickets_userId_users_id"
	}),
	user_resolvedBy: one(users, {
		fields: [amazonTickets.resolvedBy],
		references: [users.id],
		relationName: "amazonTickets_resolvedBy_users_id"
	}),
}));

export const approvalAuditLogsRelations = relations(approvalAuditLogs, ({one}) => ({
	redemption: one(redemptions, {
		fields: [approvalAuditLogs.redemptionId],
		references: [redemptions.id]
	}),
	redemptionApproval: one(redemptionApprovals, {
		fields: [approvalAuditLogs.approvalId],
		references: [redemptionApprovals.approvalId]
	}),
	user: one(users, {
		fields: [approvalAuditLogs.performedBy],
		references: [users.id]
	}),
}));

export const redemptionApprovalsRelations = relations(redemptionApprovals, ({one, many}) => ({
	approvalAuditLogs: many(approvalAuditLogs),
	redemption: one(redemptions, {
		fields: [redemptionApprovals.redemptionId],
		references: [redemptions.id]
	}),
	user_userId: one(users, {
		fields: [redemptionApprovals.userId],
		references: [users.id],
		relationName: "redemptionApprovals_userId_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [redemptionApprovals.approvedBy],
		references: [users.id],
		relationName: "redemptionApprovals_approvedBy_users_id"
	}),
}));

export const physicalRewardsRedemptionsRelations = relations(physicalRewardsRedemptions, ({one}) => ({
	user: one(users, {
		fields: [physicalRewardsRedemptions.userId],
		references: [users.id]
	}),
	physicalRewardsCatalogue: one(physicalRewardsCatalogue, {
		fields: [physicalRewardsRedemptions.rewardId],
		references: [physicalRewardsCatalogue.rewardId]
	}),
}));

export const physicalRewardsCatalogueRelations = relations(physicalRewardsCatalogue, ({many}) => ({
	physicalRewardsRedemptions: many(physicalRewardsRedemptions),
}));

export const redemptionThresholdsRelations = relations(redemptionThresholds, ({one}) => ({
	user: one(users, {
		fields: [redemptionThresholds.createdBy],
		references: [users.id]
	}),
}));

export const userAmazonCartRelations = relations(userAmazonCart, ({one}) => ({
	user: one(users, {
		fields: [userAmazonCart.userId],
		references: [users.id]
	}),
}));

export const userAmazonWishlistRelations = relations(userAmazonWishlist, ({one}) => ({
	user: one(users, {
		fields: [userAmazonWishlist.userId],
		references: [users.id]
	}),
}));

export const userApprovalRolesRelations = relations(userApprovalRoles, ({one}) => ({
	user_userId: one(users, {
		fields: [userApprovalRoles.userId],
		references: [users.id],
		relationName: "userApprovalRoles_userId_users_id"
	}),
	approvalRole: one(approvalRoles, {
		fields: [userApprovalRoles.roleId],
		references: [approvalRoles.roleId]
	}),
	user_assignedBy: one(users, {
		fields: [userApprovalRoles.assignedBy],
		references: [users.id],
		relationName: "userApprovalRoles_assignedBy_users_id"
	}),
}));

export const approvalRolesRelations = relations(approvalRoles, ({many}) => ({
	userApprovalRoles: many(userApprovalRoles),
}));

export const inappNotificationsRelations = relations(inappNotifications, ({one}) => ({
	user: one(users, {
		fields: [inappNotifications.userId],
		references: [users.id]
	}),
}));

export const notificationLogsRelations = relations(notificationLogs, ({one}) => ({
	user: one(users, {
		fields: [notificationLogs.userId],
		references: [users.id]
	}),
	notificationTemplate: one(notificationTemplates, {
		fields: [notificationLogs.templateId],
		references: [notificationTemplates.id]
	}),
}));

export const redemptionUpiRelations = relations(redemptionUpi, ({one}) => ({
	redemption: one(redemptions, {
		fields: [redemptionUpi.redemptionId],
		references: [redemptions.id]
	}),
}));

export const redemptionVouchersRelations = relations(redemptionVouchers, ({one}) => ({
	redemption: one(redemptions, {
		fields: [redemptionVouchers.redemptionId],
		references: [redemptions.id]
	}),
}));

export const thirdPartyApiLogsRelations = relations(thirdPartyApiLogs, ({one}) => ({
	redemption: one(redemptions, {
		fields: [thirdPartyApiLogs.redemptionId],
		references: [redemptions.id]
	}),
}));

export const redemptionBankTransfersRelations = relations(redemptionBankTransfers, ({one}) => ({
	redemption: one(redemptions, {
		fields: [redemptionBankTransfers.redemptionId],
		references: [redemptions.id]
	}),
}));