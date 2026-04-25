'use server'

import { db } from "@/db"
import { appConfigs, userTypeEntity } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getReferralGlobalConfigAction() {
    try {
        const config = await db.query.appConfigs.findFirst({
            where: eq(appConfigs.key, 'referral_global_config')
        });

        return config?.value as {
            enabled: boolean;
            prefix: string;
            validityDays: number;
            successMessage: string;
        } || {
            enabled: true,
            prefix: "STURLITE",
            validityDays: 30,
            successMessage: "Congratulations! Your friend has joined using your referral code."
        };
    } catch (error) {
        console.error("Error fetching global referral config:", error);
        return {
            enabled: true,
            prefix: "STURLITE",
            validityDays: 30,
            successMessage: "Congratulations! Your friend has joined using your referral code."
        };
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
                set: { value, updatedAt: new Date().toISOString() }
            });

        revalidatePath('/configuration');
        return { success: true };
    } catch (error) {
        console.error("Error updating global referral config:", error);
        throw error;
    }
}

export async function getUserTypeReferralConfigAction(userTypeId: number) {
    try {
        const result = await db.query.userTypeEntity.findFirst({
            where: eq(userTypeEntity.id, userTypeId),
            columns: {
                isReferralEnabled: true,
                referralRewardPoints: true,
                refereeRewardPoints: true,
                maxReferrals: true
            }
        });
        return result;
    } catch (error) {
        console.error("Error fetching user type referral config:", error);
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
                maxReferrals: data.maxReferrals
            })
            .where(eq(userTypeEntity.id, userTypeId));

        revalidatePath('/configuration');
        return { success: true };
    } catch (error) {
        console.error("Error updating user type referral config:", error);
        throw error;
    }
}

export async function getAllUserTypesAction() {
    try {
        return await db.query.userTypeEntity.findMany({
            where: eq(userTypeEntity.isActive, true),
            columns: {
                id: true,
                typeName: true
            }
        });
    } catch (error) {
        console.error("Error fetching user types:", error);
        throw error;
    }
}
