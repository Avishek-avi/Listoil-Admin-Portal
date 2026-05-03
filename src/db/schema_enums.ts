import { pgEnum } from "drizzle-orm/pg-core"

export const blockStatus = pgEnum("block_status", ['basic_registration', 'phone_number_verified', 'digilocker', 'pan_verification', 'gst_number_verification', 'bank_account_verified', 'pending_kyc_verification', 'profile_updated', 'none'])
export const inventoryType = pgEnum("inventory_type", ['inner', 'outer'])
export const notificationChannel = pgEnum("notification_channel", ['sms', 'push'])
export const notificationStatus = pgEnum("notification_status", ['pending', 'sent', 'failed', 'delivered'])
export const notificationTriggerType = pgEnum("notification_trigger_type", ['automated', 'campaign', 'manual'])
export const otpType = pgEnum("otp_type", ['login', 'password_reset', 'registration', 'kyc'])
export const approvalLevel = pgEnum("approval_level", ['FINANCE', 'ADMIN', 'SYSTEM'])
