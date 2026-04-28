'use server'

import { db } from "@/db"
import { fileMiddleware } from "@/server/middlewares/file-middleware"
import {
    mechanics,
    retailers,
    counterSales,
    users,
    userTypeEntity,
    approvalStatuses,
    userTypeLevelMaster,
    kycDocuments
} from "@/db/schema"
import { desc, eq, and, sql, ilike, count, or, inArray, aliasedTable } from "drizzle-orm"
import { BUS_EVENTS, emitEvent } from "@/server/rabbitMq/broker"
import { auth } from "@/lib/auth"
import { getUserScope } from "@/lib/scope-utils"
import { userScopeMapping, locationEntity, pincodeMaster } from "@/db/schema"
import { getFileUrl } from "@/lib/utils/random";
import bcrypt from "bcryptjs"

export interface MemberBase {
    id: string;
    dbId: number;
    name: string;
    initials: string;
    avatarColor: string;
    phone: string;
    email: string;
    kycStatus: 'Pending' | 'Approved' | 'Rejected';
    status: 'Active' | 'Inactive' | 'Blocked';
    approvalStatus: string;
    regions?: string;
    joinedDate?: string;
    mappedRetailer?: string;
}

export interface MemberStats {
    total: number;
    totalTrend: string;
    kycPending: number;
    kycPendingTrend: string;
    kycApproved: number;
    kycApprovedRate: string;
    activeToday: number;
    activeTodayTrend: string;
}

export interface MemberFilters {
    searchQuery?: string;
    kycStatus?: string;
    region?: string;
    page?: number;
    limit?: number;
    roleId?: number;
}

export interface MemberHierarchy {
    levels: {
        id: number;
        name: string;
        entities: {
            id: number;
            name: string;
            members: {
                list: MemberBase[];
                stats: MemberStats;
            };
        }[];
    }[];
}

function getInitials(name: string) {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
}

const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];
function getRandomColor(id: number) {
    return colors[id % colors.length];
}

export async function getMembersDataAction(filters?: MemberFilters): Promise<MemberHierarchy> {
    try {
        const { searchQuery, kycStatus, region } = filters || {};

        // 1. Fetch Levels and Entities
        const levels = await db.select().from(userTypeLevelMaster).orderBy(userTypeLevelMaster.levelNo);
        const entities = await db.select().from(userTypeEntity).where(eq(userTypeEntity.isActive, true));

        // 2. Prepare hierarchical structure
        const hierarchy: MemberHierarchy = {
            levels: levels.map(l => ({
                id: l.id,
                name: l.levelName,
                entities: entities
                    .filter(e => e.levelId === l.id)
                    .map(e => ({
                        id: e.id,
                        name: e.typeName,
                        members: { list: [], stats: { total: 0, totalTrend: '', kycPending: 0, kycPendingTrend: '', kycApproved: 0, kycApprovedRate: '', activeToday: 0, activeTodayTrend: '' } }
                    }))
            }))
        };

        // 3. Fetch users and group them
        let usersQuery = db.select({
            id: users.id,
            name: users.name,
            phone: users.phone,
            email: users.email,
            roleId: users.roleId,
            isSuspended: users.isSuspended,
            createdAt: users.createdAt,
            retailerKyc: retailers.isKycVerified,
            mechanicKyc: mechanics.isKycVerified,
            counterSalesKyc: counterSales.isKycVerified,
            approvalStatus: approvalStatuses.name,
            retailerName: sql<string>`(SELECT name FROM users WHERE id = ${counterSales.attachedRetailerId} LIMIT 1)`
        })
            .from(users)
            .leftJoin(retailers, eq(users.id, retailers.userId))
            .leftJoin(mechanics, eq(users.id, mechanics.userId))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .leftJoin(approvalStatuses, eq(users.approvalStatusId, approvalStatuses.id))
            .$dynamic();

        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const scope = await getUserScope(Number(session.user.id));

        const conditions = [];
        if (searchQuery) {
            conditions.push(or(
                ilike(users.name, `%${searchQuery}%`),
                ilike(users.phone, `%${searchQuery}%`),
                ilike(users.email, `%${searchQuery}%`)
            ));
        }

        if (scope.type !== 'Global') {
            conditions.push(or(
                scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames),
                scope.type === 'State' ? inArray(mechanics.state, scope.entityNames) : inArray(mechanics.city, scope.entityNames),
                scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames)
            ));
        }

        if (conditions.length > 0) {
            usersQuery = usersQuery.where(and(...conditions));
        }

        const allUsers = await usersQuery.limit(500);

        // 4. Populate hierarchy
        hierarchy.levels.forEach(level => {
            level.entities.forEach(entity => {
                const entityUsers = allUsers.filter(u => u.roleId === entity.id);

                entity.members.list = entityUsers.map(u => {
                    const isKycVerified = u.retailerKyc ?? u.mechanicKyc ?? u.counterSalesKyc ?? false;

                    return {
                        id: `USR${u.id.toString().padStart(3, '0')}`,
                        dbId: u.id,
                        name: u.name || 'Unknown',
                        initials: getInitials(u.name || 'Unknown'),
                        avatarColor: getRandomColor(u.id),
                        phone: u.phone || '',
                        email: u.email || '',
                        kycStatus: isKycVerified ? 'Approved' : 'Pending',
                        status: u.isSuspended ? 'Inactive' : 'Active',
                        approvalStatus: u.approvalStatus || 'PENDING',
                        regions: '---',
                        joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '---',
                        mappedRetailer: u.retailerName || '---'
                    };
                });

                entity.members.stats = {
                    total: entityUsers.length,
                    totalTrend: '+0',
                    kycPending: 0,
                    kycPendingTrend: '0',
                    kycApproved: entityUsers.length,
                    kycApprovedRate: '100%',
                    activeToday: Math.floor(entityUsers.length * 0.3),
                    activeTodayTrend: '+0'
                };
            });
        });

        return hierarchy;
    } catch (error) {
        console.error("Error in getMembersDataAction:", error);
        throw error;
    }
}

export async function getMemberDetailsAction(type: string, id: number) {
    try {
        const normalizedType = type.toLowerCase();
        let specificRecord = null;

        // 1. Fetch base user record
        const userRecords = await db.select().from(users).where(eq(users.id, id));
        const userRecord = userRecords[0];

        if (!userRecord) return null;

        // 2. Fetch specific details based on type
        if (normalizedType.includes('retailer')) {
            const records = await db.select().from(retailers).where(eq(retailers.userId, id));
            if (records.length > 0) specificRecord = records[0];
        } else if (normalizedType.includes('mechanic')) {
            const records = await db.select().from(mechanics).where(eq(mechanics.userId, id));
            if (records.length > 0) specificRecord = records[0];
        } else if (normalizedType.includes('counter staff')) {
            const records = await db.select({
                counterSales: counterSales,
                retailerName: sql<string>`(SELECT name FROM users WHERE id = ${counterSales.attachedRetailerId} LIMIT 1)`
            })
            .from(counterSales)
            .where(eq(counterSales.userId, id));
            
            if (records.length > 0) {
                specificRecord = {
                    ...records[0].counterSales,
                    mappedRetailer: records[0].retailerName
                };
            }
        }
        // 3. Return specific record if found, otherwise fallback to user record
        if (specificRecord) {
            return specificRecord;
        }

        return userRecord;
    } catch (error) {
        console.error("Error in getMemberDetailsAction:", error);
        throw error;
    }
}

export async function getMemberKycDocumentsAction(userId: number) {
    try {
        const result = await db.select().from(kycDocuments).where(eq(kycDocuments.userId, userId));

        const signedDocs = await Promise.all(result.map(async (doc) => {
            // Extract key from s3:// URI if present
            const fileKey = doc.documentValue.replace(/^s3:\/\/[^\/]+\//, '');
            let typeToUse = doc.documentType.toLowerCase();

            // If the file key already contains the storage prefix (e.g., starts with 'img/'), 
            // use 'direct' to avoid prepending the prefix twice.
            if (fileKey.startsWith('img/')) {
                typeToUse = 'direct';
            }

            const signedUrl = await fileMiddleware.getFileSignedUrl(fileKey, typeToUse) || '';
            return {
                ...doc,
                signedUrl
            };
        }));

        return signedDocs;
    } catch (error) {
        console.error("Error in getMemberKycDocumentsAction:", error);
        throw error;
    }
}

export async function updateKycDocumentStatusAction(documentId: number, status: 'verified' | 'rejected', rejectionReason?: string) {
    try {
        const result = await db.update(kycDocuments)
            .set({
                verificationStatus: status,
                rejectionReason: rejectionReason || null,
                verifiedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
            .where(eq(kycDocuments.id, documentId))
            .returning({ userId: kycDocuments.userId });

        if (status === 'verified' && result.length > 0) {
            const userId = result[0].userId;

            // Fetch user role
            const userWithRole = await db.select({
                roleName: userTypeEntity.typeName
            })
                .from(users)
                .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
                .where(eq(users.id, userId))
                .limit(1);

            if (userWithRole.length > 0 && userWithRole[0].roleName) {
                const roleName = userWithRole[0].roleName.toLowerCase();

                // Fetch all user documents
                const userDocs = await db.select().from(kycDocuments).where(eq(kycDocuments.userId, userId));
                const verifiedDocs = userDocs
                    .filter(d => d.verificationStatus === 'verified')
                    .map(d => d.documentType);

                // Define required docs based on role
                let requiredDocs: string[] = [];
                if (roleName.includes('retailer')) {
                    requiredDocs = ['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN', 'GST_CERTIFICATE', 'SHOP_IMAGE'];
                } else if (roleName.includes('mechanic') || roleName.includes('counter staff')) {
                    requiredDocs = ['AADHAAR_FRONT', 'AADHAAR_BACK'];
                }

                // Check fulfillment
                const isKycComplete = requiredDocs.length > 0 && requiredDocs.every(doc => verifiedDocs.includes(doc));

                if (isKycComplete) {
                    // Update Role Table
                    if (roleName.includes('retailer')) {
                        await db.update(retailers).set({ isKycVerified: true }).where(eq(retailers.userId, userId));
                    } else if (roleName.includes('mechanic')) {
                        await db.update(mechanics).set({ isKycVerified: true }).where(eq(mechanics.userId, userId));
                    } else if (roleName.includes('counter staff')) {
                        await db.update(counterSales).set({ isKycVerified: true }).where(eq(counterSales.userId, userId));
                    }

                    // Update User Status to TDS_CONSENT_PENDING
                    const tdsPendingStatus = await db.select().from(approvalStatuses).where(ilike(approvalStatuses.name, 'TDS_CONSENT_PENDING')).limit(1);
                    if (tdsPendingStatus.length > 0) {
                        await db.update(users)
                            .set({ approvalStatusId: tdsPendingStatus[0].id })
                            .where(eq(users.id, userId));
                    }
                }
            }
        }

        await emitEvent(status === 'verified' ? BUS_EVENTS.USER_KYC_APPROVED : BUS_EVENTS.USER_KYC_REJECT, {
            status: status,
            rejectionReason: rejectionReason || null,
            verifiedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })

        return { success: true };
    } catch (error) {
        console.error("Error in updateKycDocumentStatusAction:", error);
        throw error;
    }
}

export async function getApprovalStatusesAction() {
    try {
        const statuses = await db.select().from(approvalStatuses).where(eq(approvalStatuses.isActive, true));
        return statuses;
    } catch (error) {
        console.error("Error in getApprovalStatusesAction:", error);
        throw error;
    }
}

export async function getMemberHierarchyAction(): Promise<MemberHierarchy> {
    try {
        const levels = await db.select().from(userTypeLevelMaster).orderBy(userTypeLevelMaster.levelNo);
        const entities = await db.select().from(userTypeEntity).where(eq(userTypeEntity.isActive, true));

        const hierarchy: MemberHierarchy = {
            levels: levels.map(l => ({
                id: l.id,
                name: l.levelName,
                entities: entities
                    .filter(e => e.levelId === l.id)
                    .map(e => ({
                        id: e.id,
                        name: e.typeName,
                        members: { list: [], stats: { total: 0, totalTrend: '', kycPending: 0, kycPendingTrend: '', kycApproved: 0, kycApprovedRate: '', activeToday: 0, activeTodayTrend: '' } }
                    }))
            }))
        };
        return hierarchy;
    } catch (error) {
        console.error("Error in getMemberHierarchyAction:", error);
        throw error;
    }
}

export async function getMembersListAction(filters: MemberFilters): Promise<{ list: MemberBase[], stats: MemberStats }> {
    try {
        const { searchQuery, kycStatus, region, page = 1, limit = 10, roleId } = filters;

        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const scope = await getUserScope(Number(session.user.id));

        let baseConditions = [eq(users.roleId, roleId)];

        if (searchQuery) {
            baseConditions.push(or(
                ilike(users.name, `%${searchQuery}%`),
                ilike(users.phone, `%${searchQuery}%`),
                ilike(users.email, `%${searchQuery}%`)
            ));
        }

        if (scope.type !== 'Global') {
            baseConditions.push(or(
                scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames),
                scope.type === 'State' ? inArray(mechanics.state, scope.entityNames) : inArray(mechanics.city, scope.entityNames),
                scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames)
            ));
        }

        // Functional Hierarchy Approval filtering
        if (kycStatus === 'Approved') {
            baseConditions.push(eq(users.approvalStatusId, 18)); // KYC_APPROVED
        } else if (kycStatus === 'Pending') {
            if (scope.role.toUpperCase() === 'SR') {
                baseConditions.push(eq(users.approvalStatusId, 15)); // KYC_PENDING
            } else if (scope.role.toUpperCase() === 'TSM') {
                baseConditions.push(eq(users.approvalStatusId, 32)); // SR_APPROVED (Pending for TSM)
            } else {
                baseConditions.push(or(eq(users.approvalStatusId, 15), eq(users.approvalStatusId, 32)));
            }
        } else if (!kycStatus && !searchQuery) {
            // Default actionable view for SR and TSM
            if (scope.role.toUpperCase() === 'SR') {
                baseConditions.push(eq(users.approvalStatusId, 15));
            } else if (scope.role.toUpperCase() === 'TSM') {
                baseConditions.push(eq(users.approvalStatusId, 32));
            }
        }

        const listQuery = db.select({
            id: users.id,
            name: users.name,
            phone: users.phone,
            email: users.email,
            roleId: users.roleId,
            isSuspended: users.isSuspended,
            createdAt: users.createdAt,
            retailerKyc: retailers.isKycVerified,
            mechanicKyc: mechanics.isKycVerified,
            counterSalesKyc: counterSales.isKycVerified,
            approvalStatus: approvalStatuses.name,
            approvalStatusId: users.approvalStatusId,
            retailerName: sql<string>`(SELECT name FROM users WHERE id = ${counterSales.attachedRetailerId} LIMIT 1)`
        })
            .from(users)
            .leftJoin(retailers, eq(users.id, retailers.userId))
            .leftJoin(mechanics, eq(users.id, mechanics.userId))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .leftJoin(approvalStatuses, eq(users.approvalStatusId, approvalStatuses.id))
            .where(and(...baseConditions))
            .limit(limit)
            .offset((page - 1) * limit)
            .orderBy(desc(users.createdAt));

        const fetchedUsers = await listQuery;

        const list = fetchedUsers.map(u => {
            const isKycVerified = u.retailerKyc ?? u.mechanicKyc ?? u.counterSalesKyc ?? false;

            return {
                id: `USR${u.id.toString().padStart(3, '0')}`,
                dbId: u.id,
                name: u.name || 'Unknown',
                initials: getInitials(u.name || 'Unknown'),
                avatarColor: getRandomColor(u.id),
                phone: u.phone || '',
                email: u.email || '',
                kycStatus: isKycVerified ? 'Approved' as const : 'Pending' as const,
                status: u.isSuspended ? 'Inactive' as const : 'Active' as const,
                approvalStatus: u.approvalStatus || 'PENDING',
                approvalStatusId: u.approvalStatusId,
                regions: '---',
                joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '---',
                mappedRetailer: u.retailerName || '---'
            };
        });

        const totalResult = await db.select({ count: count() })
            .from(users)
            .leftJoin(retailers, eq(users.id, retailers.userId))
            .leftJoin(mechanics, eq(users.id, mechanics.userId))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .where(and(...baseConditions));

        const total = totalResult[0]?.count || 0;

        const kycApprovedResult = await db.select({ count: count() })
            .from(users)
            .leftJoin(retailers, eq(users.id, retailers.userId))
            .leftJoin(mechanics, eq(users.id, mechanics.userId))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .where(and(
                ...baseConditions,
                or(
                    eq(retailers.isKycVerified, true),
                    eq(mechanics.isKycVerified, true),
                    eq(counterSales.isKycVerified, true)
                )
            ));

        const kycApproved = kycApprovedResult[0]?.count || 0;
        
        // Count Pending based on role context
        const pendingConditions = [...baseConditions];
        if (scope.role.toUpperCase() === 'SR') {
            pendingConditions.push(eq(users.approvalStatusId, 15));
        } else if (scope.role.toUpperCase() === 'TSM') {
            pendingConditions.push(eq(users.approvalStatusId, 32));
        } else {
            pendingConditions.push(or(eq(users.approvalStatusId, 15), eq(users.approvalStatusId, 32)));
        }

        const kycPendingResult = await db.select({ count: count() })
            .from(users)
            .leftJoin(retailers, eq(users.id, retailers.userId))
            .leftJoin(mechanics, eq(users.id, mechanics.userId))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .where(and(...pendingConditions));

        const kycPending = kycPendingResult[0]?.count || 0;

        const stats: MemberStats = {
            total: total,
            totalTrend: '+0',
            kycPending: kycPending,
            kycPendingTrend: '0',
            kycApproved: kycApproved,
            kycApprovedRate: total > 0 ? `${Math.round((kycApproved / total) * 100)}%` : '0%',
            activeToday: Math.floor(total * 0.3),
            activeTodayTrend: '+0'
        };

        return { list, stats };

    } catch (error) {
        console.error("Error in getMembersListAction:", error);
        throw error;
    }
}

export async function updateMemberApprovalStatusAction(userId: number, statusId: number) {
    try {
        await db.update(users)
            .set({
                approvalStatusId: statusId,
                updatedAt: new Date().toISOString()
            })
            .where(eq(users.id, userId));

        const [status] = await db.select().from(approvalStatuses).where(eq(approvalStatuses.id, statusId));

        switch (status.name) {
            case "SCAN_BLOCKED":
                await emitEvent(BUS_EVENTS.USER_SCAN_BLOCK, {
                    entityId: userId.toString(),
                    statusId: statusId,
                    updatedAt: new Date().toISOString()
                })
                break;
            case "REDEMPTION_BLOCKED":
                await emitEvent(BUS_EVENTS.USER_REDEMPTION_BLOCK, {
                    entityId: userId.toString(),
                    statusId: statusId,
                    updatedAt: new Date().toISOString()
                })
                break;
            case "BLOCKED":
                await emitEvent(BUS_EVENTS.USER_BLOCK, {
                    entityId: userId.toString(),
                    statusId: statusId,
                    updatedAt: new Date().toISOString()
                })
                break;
            case "DELETE":
                await emitEvent(BUS_EVENTS.USER_BLOCK, {
                    entityId: userId.toString(),
                    statusId: statusId,
                    updatedAt: new Date().toISOString()
                })
                break;
            case "INACTIVE":
                await emitEvent(BUS_EVENTS.USER_BLOCK, {
                    entityId: userId.toString(),
                    statusId: statusId,
                    updatedAt: new Date().toISOString()
                })
                break;
            default:
                break;
        }

        return { success: true };
    } catch (error) {
        console.error("Error in updateMemberApprovalStatusAction:", error);
        throw error;
    }
}

export async function updateMemberDetailsAction(userId: number, type: string, data: any) {
    try {
        const normalizedType = type.toLowerCase();

        // Define location fields to update
        const locationUpdates = {
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2, // Add if captured in form
            city: data.city,
            state: data.state,
            pincode: data.pincode,
        };

        // Update specific table based on type
        if (normalizedType.includes('retailer')) {
            await db.update(retailers)
                .set({
                    ...locationUpdates,
                    shopName: data.shopName,
                })
                .where(eq(retailers.userId, userId));
        } else if (normalizedType.includes('mechanic')) {
            await db.update(mechanics)
                .set({
                    ...locationUpdates,
                })
                .where(eq(mechanics.userId, userId));
        } else if (normalizedType.includes('counter staff')) {
            await db.update(counterSales)
                .set({
                    ...locationUpdates,
                })
                .where(eq(counterSales.userId, userId));
        }

        await emitEvent(BUS_EVENTS.PROFILE_UPDATE, {
            entityId: userId.toString(),
            updatedAt: new Date().toISOString(),
            metadata: data
        })

        return { success: true };

    } catch (error) {
        console.error("Error in updateMemberDetailsAction:", error);
        throw error;
    }
}
export async function createMemberAction(formData: any) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const creatorId = Number(session.user.id);
        const creatorScope = await getUserScope(creatorId);
        const creatorRole = creatorScope.role.toUpperCase();

        const {
            roleId,
            name,
            phone,
            email,
            password,
            // Generic fields
            state,
            city,
            district,
            pincode,
            addressLine1,
            addressLine2,
            dob,
            gender,
            // Retailer specific
            shopName,
            // Identity
            aadhaar,
            pan,
            gst,
            // Bank
            bankAccountNo,
            bankAccountIfsc,
            bankAccountName,
            upiId,
            attachedRetailerId,
            // KYC
            kycDocuments: docs
        } = formData;

        // 1. Hierarchy Validation
        const targetRoleId = Number(roleId);
        const roleNames: Record<number, string> = {
            11: 'ADMIN',
            15: 'TSM',
            16: 'SR',
            3: 'MECHANIC',
            2: 'RETAILER'
        };
        const targetRoleName = roleNames[targetRoleId];

        if (creatorRole === 'TSM' && targetRoleName !== 'SR') {
            throw new Error("TSMs can only create Sales Representatives.");
        }
        if (creatorRole === 'SR') {
            if (!['MECHANIC', 'RETAILER'].includes(targetRoleName)) {
                throw new Error("SRs can only create Mechanics or Retailers.");
            }
            // Validate city is within SR territory
            if (city) {
                const isAssigned = creatorScope.entityNames.some(c => c.toUpperCase() === city.toUpperCase());
                if (!isAssigned) {
                    throw new Error(`The city "${city}" is outside your assigned territory.`);
                }
            }
        }

        // Extract PAN from GST if Retailer
        let finalPan = pan;
        if (targetRoleName === 'RETAILER' && gst) {
            if (gst.length >= 12) {
                finalPan = gst.substring(2, 12).toUpperCase();
            }
        }

        // Check if attached retailer exists if provided
        if (attachedRetailerId) {
            const retailerExists = await db.select().from(users).where(and(eq(users.id, Number(attachedRetailerId)), eq(users.roleId, 2))).limit(1);
            if (retailerExists.length === 0) {
                throw new Error("The selected retailer for mapping is invalid or does not exist.");
            }
        }

        // 2. Database Transaction
        return await db.transaction(async (tx) => {
            // Check if phone already exists
            // Check if phone or email already exists
            const userConditions = [eq(users.phone, phone)];
            if (email) userConditions.push(eq(users.email, email));
            
            const existingUser = await tx.select().from(users).where(or(...userConditions)).limit(1);
            if (existingUser.length > 0) {
                const isPhoneMatch = existingUser[0].phone === phone;
                throw new Error(isPhoneMatch ? "A user with this phone number already exists." : "A user with this email address already exists.");
            }

            // Create User record
            const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
            
            // Set initial status
            let approvalStatusId = 20; // ACTIVE for internal roles
            if (['MECHANIC', 'RETAILER'].includes(targetRoleName)) {
                approvalStatusId = 15; // KYC_PENDING for members
            }

            const [newUser] = await tx.insert(users).values({
                name,
                phone,
                email,
                password: hashedPassword,
                roleId: targetRoleId,
                approvalStatusId,
                onboardingTypeId: 1, // Admin panel onboarding
                createdAt: sql`CURRENT_TIMESTAMP`,
                updatedAt: sql`CURRENT_TIMESTAMP`
            }).returning();

            // Handle role-specific tables
            if (targetRoleName === 'MECHANIC') {
                await tx.insert(mechanics).values({
                    userId: newUser.id,
                    uniqueId: `MECH${newUser.id}${Date.now().toString().slice(-4)}`,
                    name,
                    phone,
                    email,
                    aadhaar: aadhaar || 'NA',
                    pan: finalPan,
                    gst,
                    city,
                    district,
                    state,
                    pincode,
                    dob: dob ? new Date(dob).toISOString() : null,
                    gender,
                    addressLine1,
                    addressLine2,
                    bankAccountNo,
                    bankAccountIfsc,
                    bankAccountName,
                    upiId,
                    attachedRetailerId: attachedRetailerId ? Number(attachedRetailerId) : null,
                    kycDocuments: docs || {},
                    onboardingTypeId: 1
                });
            } else if (targetRoleName === 'RETAILER') {
                await tx.insert(retailers).values({
                    userId: newUser.id,
                    uniqueId: `RET${newUser.id}${Date.now().toString().slice(-4)}`,
                    name,
                    phone,
                    email,
                    shopName,
                    aadhaar: aadhaar || 'NA',
                    pan: finalPan,
                    gst,
                    city,
                    district,
                    state,
                    pincode,
                    dob: dob ? new Date(dob).toISOString() : null,
                    gender,
                    addressLine1,
                    addressLine2,
                    bankAccountNo,
                    bankAccountIfsc,
                    bankAccountName,
                    upiId,
                    kycDocuments: docs || {},
                    onboardingTypeId: 1
                });
            }

            // Handle Scope Mapping
            let scopeType = 'National';
            let scopeEntityId = null;

            if (targetRoleName === 'TSM') {
                scopeType = 'State';
                // TSM is mapped to a state. Admin should have provided the state entity ID.
                scopeEntityId = formData.scopeEntityId; 
            } else if (targetRoleName === 'SR') {
                scopeType = 'City';
                // SR is mapped to a city. TSM should have provided the city entity ID.
                scopeEntityId = formData.scopeEntityId;
            }

            if (scopeEntityId) {
                await tx.insert(userScopeMapping).values({
                    userId: newUser.id,
                    scopeType,
                    scopeEntityId: Number(scopeEntityId),
                    isActive: true
                });
            }

            // Also save docs to kyc_documents table
            if (docs && typeof docs === 'object') {
                for (const [docType, docValue] of Object.entries(docs)) {
                    if (docValue) {
                        await tx.insert(kycDocuments).values({
                            userId: newUser.id,
                            documentType: docType,
                            documentValue: docValue as string,
                            verificationStatus: 'pending',
                            createdAt: sql`CURRENT_TIMESTAMP`,
                            updatedAt: sql`CURRENT_TIMESTAMP`
                        }).onConflictDoUpdate({
                            target: [kycDocuments.userId, kycDocuments.documentType],
                            set: {
                                documentValue: docValue as string,
                                updatedAt: sql`CURRENT_TIMESTAMP`
                            }
                        });
                    }
                }
            }

            await emitEvent(BUS_EVENTS.MEMBER_REGISTERED, {
                userId: newUser.id,
                role: targetRoleName,
                name: newUser.name
            });

            return { success: true, userId: newUser.id };
        });
    } catch (error: any) {
        console.error("Error creating member:", error);
        
        let userMessage = error.message;
        
        // Handle common database errors with friendly messages
        if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
            if (error.message.includes('users_phone_key') || error.message.includes('phone')) {
                userMessage = "This phone number is already registered.";
            } else if (error.message.includes('users_email_key') || error.message.includes('email')) {
                userMessage = "This email address is already registered.";
            } else if (error.message.includes('unique_id_key')) {
                userMessage = "A member with this generated ID already exists. Please try again.";
            } else {
                userMessage = "A record with these details already exists in the system.";
            }
        } else if (error.message.includes('foreign key constraint')) {
            if (error.message.includes('attached_retailer_id')) {
                userMessage = "The selected retailer for mapping was not found or is invalid.";
            } else {
                userMessage = "One of the selected references is invalid.";
            }
        } else if (error.message.includes('not-null constraint')) {
            userMessage = "One or more required fields are missing.";
        } else if (error.message.includes('invalid input syntax for type numeric')) {
            userMessage = "One of the numeric fields contains invalid characters.";
        }

        return { 
            success: false, 
            error: userMessage,
            technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined 
        };
    }
}

export async function getCurrentUserScopeAction() {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        return await getUserScope(Number(session.user.id));
    } catch (error) {
        console.error("Error getting user scope:", error);
        return null;
    }
}

export async function getLocationEntitiesAction(levelId: number, parentId?: number) {
    try {
        const query = db.select().from(locationEntity).where(eq(locationEntity.levelId, levelId));
        if (parentId) {
            // @ts-ignore
            return await query.where(eq(locationEntity.parentEntityId, parentId));
        }
        return await query;
    } catch (error) {
        console.error("Error getting location entities:", error);
        return [];
    }
}

export async function getPincodesAction(city?: string) {
    try {
        const session = await auth();
        const userId = Number(session?.user?.id);
        const userScope = await getUserScope(userId);
        
        const query = db.select().from(pincodeMaster);
        
        if (userScope.role.toUpperCase() === 'SR') {
            const cities = userScope.entityNames;
            if (city) {
                const isAssigned = cities.some(c => c.toUpperCase() === city.toUpperCase());
                if (!isAssigned) return [];
                return await query.where(eq(sql`UPPER(${pincodeMaster.city})`, city.toUpperCase()));
            }
            return await query.where(inArray(sql`UPPER(${pincodeMaster.city})`, cities.map(c => c.toUpperCase())));
        }

        if (city) {
            return await query.where(eq(sql`UPPER(${pincodeMaster.city})`, city.toUpperCase()));
        }
        return await query.limit(100);
    } catch (error) {
        console.error("Error getting pincodes:", error);
        return [];
    }
}

export async function getRetailersByCityAction(city: string) {
    try {
        const session = await auth();
        const userId = Number(session?.user?.id);
        const userScope = await getUserScope(userId);
        
        if (userScope.role.toUpperCase() === 'SR') {
            const isAssigned = userScope.entityNames.some(c => c.toUpperCase() === city.toUpperCase());
            if (!isAssigned) return [];
        }

        const result = await db.select({
            id: users.id,
            name: users.name,
            shopName: retailers.shopName
        })
        .from(users)
        .innerJoin(retailers, eq(users.id, retailers.userId))
        .where(and(
            eq(sql`UPPER(${retailers.city})`, city.toUpperCase()),
            eq(users.roleId, 2) // Retailer Role ID
        ));
        return result;
    } catch (error) {
        console.error("Error getting retailers by city:", error);
        return [];
    }
}

export async function getLocationByPincodeAction(pincode: string) {
    try {
        const session = await auth();
        const userId = Number(session?.user?.id);
        const userScope = await getUserScope(userId);

        const result = await db.select()
            .from(pincodeMaster)
            .where(and(
                eq(pincodeMaster.pincode, pincode),
                eq(pincodeMaster.isActive, true)
            ))
            .limit(1);

        const location = result[0];
        if (!location) return null;

        if (userScope.role.toUpperCase() === 'SR') {
            const isAssigned = userScope.entityNames.some(c => c.toUpperCase() === location.city?.toUpperCase());
            if (!isAssigned) return null;
        }

        return location;
    } catch (error) {
        console.error("Error getting location by pincode:", error);
        return null;
    }
}

export async function uploadMemberFileAction(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const type = formData.get('type') as string || 'kyc';
        
        if (!file) throw new Error("No file provided");
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const multerFile: Express.Multer.File = {
            buffer,
            originalname: file.name,
            mimetype: file.type,
            size: file.size,
            fieldname: 'file',
            encoding: '7bit',
            destination: '',
            filename: '',
            path: '',
            stream: null as any
        };
        
        const fileName = await fileMiddleware.uploadFile(multerFile, type);
        const fullKey = getFileUrl(type) + fileName;
        return { success: true, fileName: fullKey };
    } catch (error: any) {
        console.error("Error uploading file:", error);
        return { success: false, error: error.message };
    }
}

export async function approveMemberAction(userId: number) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const scope = await getUserScope(Number(session.user.id));
        const userRole = (scope?.role || '').toUpperCase();

        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user) throw new Error("User not found");

        let nextStatusId = user.approvalStatusId;
        
        if (userRole === 'SR' && user.approvalStatusId === 15) {
            nextStatusId = 32; // SR_APPROVED
        } else if (userRole === 'TSM' && user.approvalStatusId === 32) {
            nextStatusId = 18; // KYC_APPROVED
            // Sync with specific tables
            if (user.roleId === 2) await db.update(retailers).set({ isKycVerified: true }).where(eq(retailers.userId, userId));
            if (user.roleId === 3) await db.update(mechanics).set({ isKycVerified: true }).where(eq(mechanics.userId, userId));
        } else if (userRole === 'ADMIN' || userRole === 'SUPER ADMIN') {
            nextStatusId = 18; // Admin can skip
            if (user.roleId === 2) await db.update(retailers).set({ isKycVerified: true }).where(eq(retailers.userId, userId));
            if (user.roleId === 3) await db.update(mechanics).set({ isKycVerified: true }).where(eq(mechanics.userId, userId));
        }

        if (nextStatusId !== user.approvalStatusId) {
            await db.update(users).set({ approvalStatusId: nextStatusId, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
        }
        
        return { success: true };
    } catch (error) {
        console.error("Error approving member:", error);
        return { success: false, error: "Failed to approve member" };
    }
}

export async function rejectMemberAction(userId: number, reason: string) {
    try {
        await db.update(users).set({ 
            approvalStatusId: 24, // BLOCKED
            updatedAt: new Date().toISOString()
        }).where(eq(users.id, userId));
        
        return { success: true };
    } catch (error) {
        console.error("Error rejecting member:", error);
        return { success: false, error: "Failed to reject member" };
    }
}