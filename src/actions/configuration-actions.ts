'use server'

import { db } from "@/db"
import { appConfigs, creatives, creativesTypes, userTypeEntity } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { fileMiddleware } from "@/server/middlewares/file-middleware"
import { getFileUrl } from "@/lib/utils/random"

export async function getConfigurationAction() {
    try {
        // Fetch creative types and creatives
        const creativeTypesList = await db.select().from(creativesTypes).where(eq(creativesTypes.isActive, true));
        const rawCreativesList = await db.select().from(creatives).where(eq(creatives.isActive, true));

        // Generate signed URLs for creatives if they are S3 links
        const creativesWithSignedUrls = await Promise.all(rawCreativesList.map(async (creative) => {
            if (creative.url && creative.url.includes('amazonaws.com')) {
                try {
                    // Extract filename from URL
                    // URL format: https://bucket.s3.region.amazonaws.com/img/creatives/filename
                    const urlParts = creative.url.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    // We assume 'creatives' type for these
                    const signedUrl = await fileMiddleware.getFileSignedUrl(fileName, 'creatives');
                    return { ...creative, previewUrl: signedUrl };
                } catch (e) {
                    console.error("Failed to sign URL for creative:", creative.id, e);
                    return { ...creative, previewUrl: creative.url };
                }
            }
            return { ...creative, previewUrl: creative.url };
        }));

        // Fetch real global config from database
        const globalConfigRecord = await db.query.appConfigs.findFirst({
            where: eq(appConfigs.key, 'referral_global_config')
        });

        const globalReferralConfig = globalConfigRecord?.value as any || {
            enabled: true,
            prefix: "STURLITE",
            validityDays: 30,
            successMessage: "Congratulations! Your friend has joined using your referral code."
        };

        const userTypes = await db.select({
            id: userTypeEntity.id,
            name: userTypeEntity.typeName,
            isReferralEnabled: userTypeEntity.isReferralEnabled,
            referralRewardPoints: userTypeEntity.referralRewardPoints,
            refereeRewardPoints: userTypeEntity.refereeRewardPoints,
            maxReferrals: userTypeEntity.maxReferrals,
            referralCodePrefix: userTypeEntity.referralCodePrefix,
            referralValidityDays: userTypeEntity.referralValidityDays,
            referralSuccessMessage: userTypeEntity.referralSuccessMessage
        }).from(userTypeEntity).where(eq(userTypeEntity.isActive, true));

        // Returning data that matches the UI
        return {
            redemptionMatrix: {
                retailer: { minPoints: 500, maxDay: 5000, maxWeek: 25000, maxMonth: 100000 },
                csb: { minPoints: 200, maxDay: 2000, maxWeek: 10000, maxMonth: 40000 },
                electrician: { minPoints: 100, maxDay: 1000, maxWeek: 5000, maxMonth: 20000 },
            },
            referralConfig: {
                global: globalReferralConfig,
                userTypes: userTypes
            },
            creativeTypes: creativeTypesList,
            creatives: creativesWithSignedUrls
        };
    } catch (error) {
        console.error("Error in getConfigurationAction:", error);
        throw error;
    }
}

export async function saveCreativeAction(data: any) {
    try {
        const { id, ...rest } = data;

        if (id) {
            // Update existing
            await db.update(creatives)
                .set({
                    ...rest,
                    updatedAt: sql`CURRENT_TIMESTAMP`
                })
                .where(eq(creatives.id, id));
        } else {
            // Insert new
            await db.insert(creatives)
                .values({
                    ...rest,
                    isActive: true
                });
        }

        revalidatePath('/configuration');
        return { success: true };
    } catch (error) {
        console.error("Error in saveCreativeAction:", error);
        return { success: false, error: "Failed to save creative" };
    }
}

export async function deleteCreativeAction(id: number) {
    try {
        // Soft delete
        await db.update(creatives)
            .set({
                isActive: false,
                updatedAt: sql`CURRENT_TIMESTAMP`
            })
            .where(eq(creatives.id, id));

        revalidatePath('/configuration');
        return { success: true };
    } catch (error) {
        console.error("Error in deleteCreativeAction:", error);
        return { success: false, error: "Failed to delete creative" };
    }
}

export async function updateReferralGlobalConfigAction(value: any) {
    try {
        await db.insert(appConfigs)
            .values({
                key: 'referral_global_config',
                value: value,
                description: 'Global referral program settings'
            })
            .onConflictDoUpdate({
                target: appConfigs.key,
                set: {
                    value,
                    updatedAt: sql`CURRENT_TIMESTAMP`
                }
            });

        revalidatePath('/configuration');
        return { success: true };
    } catch (error) {
        console.error("Error updating global referral config:", error);
        throw error;
    }
}

export async function updateUserTypeReferralConfigAction(userTypeId: number, data: any) {
    try {
        await db.update(userTypeEntity)
            .set({
                isReferralEnabled: data.isReferralEnabled,
                referralRewardPoints: data.referralRewardPoints,
                refereeRewardPoints: data.refereeRewardPoints,
                maxReferrals: data.maxReferrals,
                referralCodePrefix: data.referralCodePrefix,
                referralValidityDays: data.referralValidityDays,
                referralSuccessMessage: data.referralSuccessMessage
            })
            .where(eq(userTypeEntity.id, userTypeId));

        revalidatePath('/configuration');
        return { success: true };
    } catch (error) {
        console.error("Error updating user type referral config:", error);
        throw error;
    }
}
