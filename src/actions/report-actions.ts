'use server';

import { db } from '@/db';
import {
    users,
    retailerTransactionLogs,
    mechanicTransactionLogs,
    counterSalesTransactionLogs,
    redemptions,
    referrals,
    kycDocuments,
    counterSalesTransactions,
    userTypeEntity,
    userTypeLevelMaster,
    redemptionChannels,
    redemptionStatuses,
    retailers,
    mechanics,
    counterSales,
    otpMaster,
    notificationLogs,
    pincodeMaster
} from '@/db/schema';
import { desc, eq, sql, and, or, aliasedTable, inArray } from 'drizzle-orm';

export interface ReportColumn {
    key: string;
    label: string;
    type?: 'date' | 'number' | 'currency' | 'status' | 'text';
}

export interface ReportData {
    columns: ReportColumn[];
    rows: any[];
}

export async function getReportDataAction(category: string, filters: any = {}): Promise<ReportData> {
    try {
        switch (category) {
            case 'registration':
                return await getRegistrationReport(filters);
            case 'qr-scans':
                return await getQrScanReport(filters);
            case 'redemptions':
                return await getRedemptionReport(filters);
            case 'referrals':
                return await getReferralReport(filters);
            case 'gamification':
                return await getGamificationReport(filters); // Placeholder for now
            case 'compliance':
                return await getComplianceReport(filters);
            case 'stakeholder':
                return await getStakeholderReport(filters);
            case 'sales':
                return await getSalesReport(filters);
            case 'bank':
                return await getBankReport(filters);
            case 'otp':
                return await getOtpReport(filters);
            case 'notifications':
                return await getNotificationReport(filters);
            default:
                return { columns: [], rows: [] };
        }
    } catch (error) {
        console.error(`Error fetching report for ${category}:`, error);
        return { columns: [], rows: [] };
    }
}

async function getRegistrationReport(filters: any): Promise<ReportData> {
    const data = await db.select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        isSuspended: users.isSuspended,
        roleName: userTypeEntity.typeName,
        levelName: userTypeLevelMaster.levelName,
        // Location data from stakeholder tables
        retCity: retailers.city,
        retDistrict: retailers.district,
        retState: retailers.state,
        retPincode: retailers.pincode,
        mechCity: mechanics.city,
        mechDistrict: mechanics.district,
        mechState: mechanics.state,
        mechPincode: mechanics.pincode,
        csCity: counterSales.city,
        csDistrict: counterSales.district,
        csState: counterSales.state,
        csPincode: counterSales.pincode,
        // Personal details
        retAadhaar: retailers.aadhaar,
        retPan: retailers.pan,
        retDob: retailers.dob,
        retGender: retailers.gender,
        retIsKycVerified: retailers.isKycVerified,
        mechAadhaar: mechanics.aadhaar,
        mechPan: mechanics.pan,
        mechDob: mechanics.dob,
        mechGender: mechanics.gender,
        mechIsKycVerified: mechanics.isKycVerified,
        csAadhaar: counterSales.aadhaar,
        csPan: counterSales.pan,
        csDob: counterSales.dob,
        csGender: counterSales.gender,
        csIsKycVerified: counterSales.isKycVerified,
        // Zone from pincode master (joined on coalesced pincode)
        zone: pincodeMaster.zone
    })
        .from(users)
        .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
        .leftJoin(userTypeLevelMaster, eq(userTypeEntity.levelId, userTypeLevelMaster.id))
        .leftJoin(retailers, eq(users.id, retailers.userId))
        .leftJoin(mechanics, eq(users.id, mechanics.userId))
        .leftJoin(counterSales, eq(users.id, counterSales.userId))
        .leftJoin(pincodeMaster, or(
            eq(retailers.pincode, pincodeMaster.pincode),
            eq(mechanics.pincode, pincodeMaster.pincode),
            eq(counterSales.pincode, pincodeMaster.pincode)
        ))
        .where(inArray(users.roleId, [2, 3]))
        .limit(50)
        .orderBy(desc(users.createdAt));

    return {
        columns: [
            { key: 'id', label: 'User ID', type: 'text' },
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'phone', label: 'Phone', type: 'text' },
            { key: 'email', label: 'Email', type: 'text' },
            { key: 'role', label: 'Role', type: 'text' },
            { key: 'level', label: 'Level', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text' },
            { key: 'panNumber', label: 'PAN Number', type: 'text' },
            { key: 'gender', label: 'Gender', type: 'text' },
            { key: 'dateOfBirth', label: 'Date of Birth', type: 'text' },
            { key: 'age', label: 'Age', type: 'number' },
            { key: 'kycStatus', label: 'KYC Status', type: 'status' },
            { key: 'createdAt', label: 'Registered On', type: 'date' },
            { key: 'lastLoginAt', label: 'Last Login', type: 'date' },
            { key: 'status', label: 'Status', type: 'status' }
        ],
        rows: data.map(r => {
            const dob = r.retDob || r.mechDob || r.csDob;
            let age = null;
            if (dob) {
                const birthDate = new Date(dob);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
            }

            return {
                ...r,
                role: r.roleName,
                level: r.levelName,
                city: r.retCity || r.mechCity || r.csCity || '-',
                district: r.retDistrict || r.mechDistrict || r.csDistrict || '-',
                state: r.retState || r.mechState || r.csState || '-',
                pincode: r.retPincode || r.mechPincode || r.csPincode || '-',
                aadhaarNumber: r.retAadhaar || r.mechAadhaar || r.csAadhaar || '-',
                panNumber: r.retPan || r.mechPan || r.csPan || '-',
                gender: r.retGender || r.mechGender || r.csGender || '-',
                dateOfBirth: dob ? new Date(dob).toLocaleDateString() : '-',
                age: age,
                kycStatus: (r.retIsKycVerified || r.mechIsKycVerified || r.csIsKycVerified) ? 'Verified' : 'Pending',
                zone: r.zone || '-',
                status: !r.isSuspended ? 'Active' : 'Suspended'
            };
        })
    };
}

async function getQrScanReport(filters: any): Promise<ReportData> {
    // fetch latest rows from each transaction log table
    const retailerRows = await db.select({
        id: retailerTransactionLogs.id,
        sku: retailerTransactionLogs.sku,
        category: retailerTransactionLogs.category,
        qrCode: retailerTransactionLogs.qrCode,
        status: retailerTransactionLogs.status,
        createdAt: retailerTransactionLogs.createdAt,
        points: retailerTransactionLogs.points,
        userName: users.name,
        userPhone: users.phone,
        userEmail: users.email,
        city: retailers.city,
        district: retailers.district,
        state: retailers.state,
        pincode: retailers.pincode,
        zone: pincodeMaster.zone
    })
        .from(retailerTransactionLogs)
        .leftJoin(users, eq(retailerTransactionLogs.userId, users.id))
        .leftJoin(retailers, eq(users.id, retailers.userId))
        .leftJoin(pincodeMaster, eq(retailers.pincode, pincodeMaster.pincode))
        .orderBy(desc(retailerTransactionLogs.createdAt))
        .limit(50);

    const mechanicRows = await db.select({
        id: mechanicTransactionLogs.id,
        sku: mechanicTransactionLogs.sku,
        category: mechanicTransactionLogs.category,
        qrCode: mechanicTransactionLogs.qrCode,
        status: mechanicTransactionLogs.status,
        createdAt: mechanicTransactionLogs.createdAt,
        points: mechanicTransactionLogs.points,
        userName: users.name,
        userPhone: users.phone,
        userEmail: users.email,
        city: mechanics.city,
        district: mechanics.district,
        state: mechanics.state,
        pincode: mechanics.pincode,
        zone: pincodeMaster.zone
    })
        .from(mechanicTransactionLogs)
        .leftJoin(users, eq(mechanicTransactionLogs.userId, users.id))
        .leftJoin(mechanics, eq(users.id, mechanics.userId))
        .leftJoin(pincodeMaster, eq(mechanics.pincode, pincodeMaster.pincode))
        .orderBy(desc(mechanicTransactionLogs.createdAt))
        .limit(50);

    const counterRows = await db.select({
        id: counterSalesTransactionLogs.id,
        sku: counterSalesTransactionLogs.sku,
        category: counterSalesTransactionLogs.category,
        qrCode: counterSalesTransactionLogs.qrCode,
        status: counterSalesTransactionLogs.status,
        createdAt: counterSalesTransactionLogs.createdAt,
        points: counterSalesTransactionLogs.points,
        userName: users.name,
        userPhone: users.phone,
        userEmail: users.email,
        city: counterSales.city,
        district: counterSales.district,
        state: counterSales.state,
        pincode: counterSales.pincode,
        zone: pincodeMaster.zone
    })
        .from(counterSalesTransactionLogs)
        .leftJoin(users, eq(counterSalesTransactionLogs.userId, users.id))
        .leftJoin(counterSales, eq(users.id, counterSales.userId))
        .leftJoin(pincodeMaster, eq(counterSales.pincode, pincodeMaster.pincode))
        .orderBy(desc(counterSalesTransactionLogs.createdAt))
        .limit(50);

    const mapRow = (r: any, userType: string) => ({
        id: r.id,
        userType,
        userName: r.userName,
        userPhone: r.userPhone,
        userEmail: r.userEmail || '-',
        city: r.city || '-',
        district: r.district || '-',
        state: r.state || '-',
        pincode: r.pincode || '-',
        zone: r.zone || '-',
        qrCode: r.qrCode,
        sku: r.sku,
        category: r.category,
        points: r.points,
        status: r.status,
        createdAt: r.createdAt
    });

    const combined = [
        ...retailerRows.map(r => mapRow(r, 'Retailer')),
        ...mechanicRows.map(r => mapRow(r, 'Mechanic'))
    ];

    // sort by date desc and limit
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const rows = combined.slice(0, 50);

    return {
        columns: [
            { key: 'id', label: 'Txn ID', type: 'text' },
            { key: 'userType', label: 'User Type', type: 'text' },
            { key: 'qrCode', label: 'QR Code', type: 'text' },
            { key: 'sku', label: 'SKU', type: 'text' },
            { key: 'category', label: 'Category', type: 'text' },
            { key: 'points', label: 'Points', type: 'number' },
            { key: 'createdAt', label: 'Scan Time', type: 'date' },
            { key: 'status', label: 'Status', type: 'status' }
        ],
        rows
    };
}

async function getRedemptionReport(filters: any): Promise<ReportData> {
    const data = await db.select({
        id: redemptions.redemptionId,
        points: redemptions.pointsRedeemed,
        amount: redemptions.amount,
        status: redemptionStatuses.name,
        createdAt: redemptions.createdAt,
        channel: redemptionChannels.name,
        userName: users.name,
        userPhone: users.phone,
        userEmail: users.email,
        userType: userTypeEntity.typeName,
        // Location
        retCity: retailers.city,
        retState: retailers.state,
        mechCity: mechanics.city,
        mechState: mechanics.state,
        csCity: counterSales.city,
        csState: counterSales.state,
        zone: pincodeMaster.zone
    })
        .from(redemptions)
        .leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id))
        .leftJoin(redemptionChannels, eq(redemptions.channelId, redemptionChannels.id))
        .leftJoin(users, eq(redemptions.userId, users.id))
        .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
        .leftJoin(retailers, eq(users.id, retailers.userId))
        .leftJoin(mechanics, eq(users.id, mechanics.userId))
        .leftJoin(counterSales, eq(users.id, counterSales.userId))
        .leftJoin(pincodeMaster, or(
            eq(retailers.pincode, pincodeMaster.pincode),
            eq(mechanics.pincode, pincodeMaster.pincode),
            eq(counterSales.pincode, pincodeMaster.pincode)
        ))
        .where(inArray(users.roleId, [2, 3]))
        .limit(50)
        .orderBy(desc(redemptions.createdAt));

    return {
        columns: [
            { key: 'id', label: 'Redemption ID', type: 'text' },
            { key: 'userName', label: 'Member Name', type: 'text' },
            { key: 'userType', label: 'User Type', type: 'text' },
            { key: 'userEmail', label: 'Email ID', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'channel', label: 'Channel', type: 'text' },
            { key: 'points', label: 'Points Redeemed', type: 'number' },
            { key: 'amount', label: 'Amount (₹)', type: 'currency' },
            { key: 'createdAt', label: 'Date', type: 'date' },
            { key: 'status', label: 'Status', type: 'status' }
        ],
        rows: data.map(r => ({
            ...r,
            city: r.retCity || r.mechCity || r.csCity || '-',
            state: r.retState || r.mechState || r.csState || '-',
            zone: r.zone || '-',
            userEmail: r.userEmail || '-'
        }))
    };
}

async function getReferralReport(filters: any): Promise<ReportData> {
    const referrer = aliasedTable(users, 'referrer');
    const referred = aliasedTable(users, 'referred');

    const data = await db.select({
        id: referrals.id,
        status: referrals.status,
        bonus: referrals.bonusAwarded,
        createdAt: referrals.createdAt,
        referrerName: referrer.name,
        referrerPhone: referrer.phone,
        referrerEmail: referrer.email,
        referredName: referred.name,
        referredPhone: referred.phone,
        referredEmail: referred.email
    })
        .from(referrals)
        .leftJoin(referrer, eq(referrals.referrerId, referrer.id))
        .leftJoin(referred, eq(referrals.referredId, referred.id))
        .where(and(
            inArray(referrer.roleId, [2, 3]),
            inArray(referred.roleId, [2, 3])
        ))
        .limit(50)
        .orderBy(desc(referrals.createdAt));

    return {
        columns: [
            { key: 'id', label: 'Ref ID', type: 'text' },
            { key: 'referrerName', label: 'Sender Name', type: 'text' },
            { key: 'referrerPhone', label: 'Sender Phone', type: 'text' },
            { key: 'referrerEmail', label: 'Sender Email', type: 'text' },
            { key: 'referredName', label: 'Receiver Name', type: 'text' },
            { key: 'referredPhone', label: 'Receiver Phone', type: 'text' },
            { key: 'referredEmail', label: 'Receiver Email', type: 'text' },
            { key: 'status', label: 'Status', type: 'status' },
            { key: 'bonus', label: 'Bonus Awarded', type: 'number' },
            { key: 'createdAt', label: 'Date', type: 'date' }
        ],
        rows: data.map(r => ({
            ...r,
            referrerEmail: r.referrerEmail || '-',
            referredEmail: r.referredEmail || '-'
        }))
    };
}

async function getOtpReport(filters: any): Promise<ReportData> {
    const data = await db.select({
        id: otpMaster.id,
        phone: otpMaster.phone,
        otp: otpMaster.otp,
        type: otpMaster.type,
        isUsed: otpMaster.isUsed,
        expiresAt: otpMaster.expiresAt,
        createdAt: otpMaster.createdAt,
        userName: users.name
    })
        .from(otpMaster)
        .leftJoin(users, eq(otpMaster.userId, users.id))
        .where(inArray(users.roleId, [2, 3]))
        .limit(50)
        .orderBy(desc(otpMaster.createdAt));

    return {
        columns: [
            { key: 'id', label: 'ID', type: 'text' },
            { key: 'userName', label: 'User Name', type: 'text' },
            { key: 'phone', label: 'Phone', type: 'text' },
            { key: 'otp', label: 'OTP Code', type: 'text' },
            { key: 'type', label: 'Type', type: 'text' },
            { key: 'isUsed', label: 'Used', type: 'status' },
            { key: 'createdAt', label: 'Generated At', type: 'date' },
            { key: 'expiresAt', label: 'Expires At', type: 'date' }
        ],
        rows: data.map(r => ({
            ...r,
            isUsed: r.isUsed ? 'Used' : 'Unused'
        }))
    };
}

async function getNotificationReport(filters: any): Promise<ReportData> {
    const data = await db.select({
        id: notificationLogs.logId,
        title: notificationLogs.pushTitle,
        message: notificationLogs.pushBody,
        status: notificationLogs.status,
        sentAt: notificationLogs.sentAt,
        userName: users.name,
        userPhone: users.phone
    })
        .from(notificationLogs)
        .leftJoin(users, eq(notificationLogs.userId, users.id))
        .where(inArray(users.roleId, [2, 3]))
        .limit(50)
        .orderBy(desc(notificationLogs.createdAt));

    return {
        columns: [
            { key: 'id', label: 'Log ID', type: 'text' },
            { key: 'userName', label: 'User Name', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'message', label: 'Message', type: 'text' },
            { key: 'status', label: 'Status', type: 'status' },
            { key: 'sentAt', label: 'Sent Date', type: 'date' }
        ],
        rows: data
    };
}

async function getGamificationReport(filters: any): Promise<ReportData> {
    return {
        columns: [
            { key: 'campaign', label: 'Campaign', type: 'text' },
            { key: 'user', label: 'User', type: 'text' },
            { key: 'achievement', label: 'Achievement', type: 'text' },
            { key: 'date', label: 'Date', type: 'date' }
        ],
        rows: []
    };
}
async function getComplianceReport(filters: any): Promise<ReportData> {
    const rawData = await db.select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        userType: userTypeEntity.typeName,
        docType: kycDocuments.documentType,
        docStatus: kycDocuments.verificationStatus,
        uploadedAt: kycDocuments.createdAt,
        retCity: retailers.city,
        retState: retailers.state,
        mechCity: mechanics.city,
        mechState: mechanics.state,
        zone: pincodeMaster.zone
    })
        .from(users)
        .innerJoin(kycDocuments, eq(users.id, kycDocuments.userId))
        .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
        .leftJoin(retailers, eq(users.id, retailers.userId))
        .leftJoin(mechanics, eq(users.id, mechanics.userId))
        .leftJoin(pincodeMaster, or(
            eq(retailers.pincode, pincodeMaster.pincode),
            eq(mechanics.pincode, pincodeMaster.pincode)
        ))
        .where(inArray(users.roleId, [2, 3]))
        .orderBy(desc(kycDocuments.createdAt));

    const userGroups = new Map<number, any>();
    
    for (const row of rawData) {
        if (!userGroups.has(row.id)) {
            userGroups.set(row.id, {
                id: row.id,
                name: row.name,
                phone: row.phone,
                email: row.email || '-',
                userType: row.userType,
                city: row.retCity || row.mechCity || '-',
                state: row.retState || row.mechState || '-',
                zone: row.zone || '-',
                aadhaarFront: 'Not Uploaded',
                aadhaarBack: 'Not Uploaded',
                pan: 'Not Uploaded',
                lastUpdate: row.uploadedAt
            });
        }
        
        const group = userGroups.get(row.id);
        if (row.docType === 'aadhaar_front') group.aadhaarFront = row.docStatus;
        if (row.docType === 'aadhaar_back') group.aadhaarBack = row.docStatus;
        if (row.docType === 'pan') group.pan = row.docStatus;
        
        if (new Date(row.uploadedAt) > new Date(group.lastUpdate)) {
            group.lastUpdate = row.uploadedAt;
        }
    }

    return {
        columns: [
            { key: 'id', label: 'User ID', type: 'text' },
            { key: 'name', label: 'User Name', type: 'text' },
            { key: 'userType', label: 'User Type', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'aadhaarFront', label: 'Aadhaar (F)', type: 'status' },
            { key: 'aadhaarBack', label: 'Aadhaar (B)', type: 'status' },
            { key: 'pan', label: 'PAN', type: 'status' },
            { key: 'lastUpdate', label: 'Last Activity', type: 'date' }
        ],
        rows: Array.from(userGroups.values())
    };
}


async function getStakeholderReport(filters: any): Promise<ReportData> {
    const data = await db.select({
        id: userTypeEntity.id,
        type: userTypeEntity.typeName,
        active: userTypeEntity.isActive,
        kycLevel: userTypeEntity.requiredKycLevel
    })
        .from(userTypeEntity);

    return {
        columns: [
            { key: 'type', label: 'Stakeholder Type', type: 'text' },
            { key: 'kycLevel', label: 'Req. KYC', type: 'text' },
            { key: 'active', label: 'Status', type: 'status' }
        ],
        rows: data.map(r => ({ ...r, active: r.active ? 'Active' : 'Inactive' }))
    };
}

async function getSalesReport(filters: any): Promise<ReportData> {
    const data = await db.select({
        id: counterSalesTransactions.id,
        sku: counterSalesTransactions.sku,
        points: counterSalesTransactions.points,
        status: sql<string>`'Completed'`,
        date: counterSalesTransactions.createdAt,
    })
        .from(counterSalesTransactions)
        .where(sql`1=0`) // Exclude since we only want Mechanics and Retailers
        .limit(0);

    return {
        columns: [
            { key: 'id', label: 'Sale ID', type: 'text' },
            { key: 'sku', label: 'Product SKU', type: 'text' },
            { key: 'points', label: 'Points Earned', type: 'number' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'status', label: 'Status', type: 'status' }
        ],
        rows: data
    };
}

async function getBankReport(filters: any): Promise<ReportData> {
    const retData = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        bank: retailers.bankAccountName,
        account: retailers.bankAccountNo,
        ifsc: retailers.bankAccountIfsc,
        type: sql<string>`'Retailer'`,
        status: retailers.isBankValidated,
        city: retailers.city,
        district: retailers.district,
        state: retailers.state,
        pincode: retailers.pincode,
        zone: pincodeMaster.zone
    }).from(users)
    .innerJoin(retailers, eq(users.id, retailers.userId))
    .leftJoin(pincodeMaster, eq(retailers.pincode, pincodeMaster.pincode))
    .limit(20);

    const mechData = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        bank: mechanics.bankAccountName,
        account: mechanics.bankAccountNo,
        ifsc: mechanics.bankAccountIfsc,
        type: sql<string>`'Mechanic'`,
        status: mechanics.isBankValidated,
        city: mechanics.city,
        district: mechanics.district,
        state: mechanics.state,
        pincode: mechanics.pincode,
        zone: pincodeMaster.zone
    }).from(users)
    .innerJoin(mechanics, eq(users.id, mechanics.userId))
    .leftJoin(pincodeMaster, eq(mechanics.pincode, pincodeMaster.pincode))
    .limit(20);

    const rows = [...retData, ...mechData].map(r => ({
        ...r,
        status: r.status ? 'Verified' : 'Pending',
        email: r.email || '-'
    }));

    return {
        columns: [
            { key: 'id', label: 'User ID', type: 'text' },
            { key: 'name', label: 'Account Holder', type: 'text' },
            { key: 'email', label: 'Email ID', type: 'text' },
            { key: 'type', label: 'User Type', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'bank', label: 'Bank Name', type: 'text' },
            { key: 'account', label: 'Account No', type: 'text' },
            { key: 'ifsc', label: 'IFSC', type: 'text' },
            { key: 'status', label: 'Verification', type: 'status' }
        ],
        rows
    };
}
