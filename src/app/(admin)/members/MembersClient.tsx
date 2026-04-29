'use client'; 


import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMembersDataAction, getMemberDetailsAction, getMemberKycDocumentsAction, updateKycDocumentStatusAction, getApprovalStatusesAction, updateMemberApprovalStatusAction, getMemberHierarchyAction, getMembersListAction, updateMemberDetailsAction, createMemberAction, getCurrentUserScopeAction, getLocationEntitiesAction, getPincodesAction, getRetailersByCityAction, getLocationByPincodeAction, uploadMemberFileAction, approveMemberAction, rejectMemberAction, getPincodeStatesAction, getPincodeCitiesAction } from '@/actions/member-actions';


/* ── Reusable dropdown (click-outside auto-close) ── */
function ActionDropdown({ label, icon, children, direction = 'down' }: { label: string; icon: string; children: React.ReactNode; direction?: 'up' | 'down' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition shadow-sm"
            >
                <i className={`fas ${icon} text-xs`}></i> {label} <i className="fas fa-chevron-down text-[10px] ml-1"></i>
            </button>
            {open && (
                <div className={`absolute right-0 ${direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[200px]`}>
                    {children}
                </div>
            )}
        </div>
    );
}

export default function MembersClient() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    
    const [levelTab, setLevelTab] = useState(0);
    const [entityTab, setEntityTab] = useState(0);




    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [kycStatusFilter, setKycStatusFilter] = useState('All Status');
    const [regionFilter, setRegionFilter] = useState('All Regions');
    const [page, setPage] = useState(1);
    const limit = 10;

    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<{ type: string, id: number, member: any } | null>(null);

    const [kycModalOpen, setKycModalOpen] = useState(false);
    const [selectedKycMember, setSelectedKycMember] = useState<any>(null);
    const [viewDocOpen, setViewDocOpen] = useState(false);
    const [viewDocUrl, setViewDocUrl] = useState('');
    const [viewDocType, setViewDocType] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        phone: '',
        dob: '',
        gender: '',
        shopName: '',
        companyName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        bankAccountName: '',
        bankAccountNo: '',
        bankAccountIfsc: '',
        upiId: ''
    });
    
    const [addModalOpen, setAddModalOpen] = useState(false);


    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500";
    const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 bg-white";

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const { data: hierarchyData } = useQuery({
        queryKey: ['member-hierarchy'],
        queryFn: getMemberHierarchyAction,
        staleTime: 60 * 1000,
    });

    const filteredLevels = useMemo(() => {
        const levelOrder = ['member', 'support/call centre'];
        const labelMap: Record<string, string> = {
            member: 'Member',
            admin: 'Admin',
            'support/call centre': 'Support/Call Centre',
        };

        const normalizeLevelName = (name: string) => name
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/\s*\/\s*/g, '/')
            .replace('center', 'centre')
            .trim();

        return (hierarchyData?.levels || [])
            .filter((level: any) => levelOrder.includes(normalizeLevelName(level.name)))
            .map((level: any) => {
                const normalizedName = normalizeLevelName(level.name);
                return {
                    ...level,
                    displayName: labelMap[normalizedName] || level.name,
                    entities: (level.entities || []).filter((e: any) => 
                        !e.name.toLowerCase().includes('counter staff') && 
                        !e.name.toLowerCase().includes('counter sales')
                    )
                };
            })
            .sort((a: any, b: any) => {
                const aIndex = levelOrder.indexOf(normalizeLevelName(a.name));
                const bIndex = levelOrder.indexOf(normalizeLevelName(b.name));
                return aIndex - bIndex;
            });
    }, [hierarchyData]);
    
    // Sync tabs with URL params if they exist
    useEffect(() => {
        if (!filteredLevels || filteredLevels.length === 0) return;

        const level = searchParams.get('level');
        const entity = searchParams.get('entity');
        const type = searchParams.get('type');
        const kycStatus = searchParams.get('kycStatus');
        
        if (kycStatus) {
            setKycStatusFilter(kycStatus);
        }

        if (type) {
            const normalizedType = type.toLowerCase();
            let found = false;
            for (let l = 0; l < filteredLevels.length; l++) {
                for (let e = 0; e < filteredLevels[l].entities.length; e++) {
                    if (filteredLevels[l].entities[e].name.toLowerCase().includes(normalizedType)) {
                        setLevelTab(l);
                        setEntityTab(e);
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
        } else {
            if (level !== null) {
                const levelIdx = parseInt(level);
                if (!isNaN(levelIdx) && levelIdx < filteredLevels.length) setLevelTab(levelIdx);
            }
            
            if (entity !== null) {
                const entityIdx = parseInt(entity);
                if (level !== null) {
                    const lIdx = parseInt(level);
                    if (!isNaN(lIdx) && lIdx < filteredLevels.length && entityIdx < filteredLevels[lIdx].entities.length) {
                        setEntityTab(entityIdx);
                    }
                } else if (entityIdx < filteredLevels[levelTab].entities.length) {
                    setEntityTab(entityIdx);
                }
            }
        }
    }, [searchParams, filteredLevels]);


    useEffect(() => {
        if (filteredLevels.length > 0 && levelTab >= filteredLevels.length) {
            setLevelTab(0);
            setEntityTab(0);
            setPage(1);
        }
    }, [levelTab, filteredLevels.length]);


    const currentLevel = filteredLevels[levelTab];
    const activeEntityTab = currentLevel && entityTab >= currentLevel.entities.length ? 0 : entityTab;
    const currentEntity = currentLevel?.entities[activeEntityTab];

    const { data: membersListData, isLoading: isMembersLoading } = useQuery({
        queryKey: ['members-list', currentEntity?.id, page, searchQuery, kycStatusFilter, regionFilter],
        queryFn: () => currentEntity ? getMembersListAction({
            searchQuery: debouncedQuery,
            kycStatus: kycStatusFilter,
            region: regionFilter,
            page,
            limit,
            roleId: currentEntity.id
        }) : { list: [], stats: { total: 0, totalTrend: '', kycPending: 0, kycPendingTrend: '', kycApproved: 0, kycApprovedRate: '', activeToday: 0, activeTodayTrend: '' } },
        enabled: !!currentEntity,
    });

    const stats = membersListData?.stats || { total: 0, totalTrend: '', kycPending: 0, kycPendingTrend: '', kycApproved: 0, kycApprovedRate: '', activeToday: 0, activeTodayTrend: '' };
    const members = membersListData?.list || [];

    const { data: memberDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['member-details', selectedMember?.type, selectedMember?.id],
        queryFn: () => selectedMember ? getMemberDetailsAction(selectedMember.type, selectedMember.id) : null,
        enabled: !!selectedMember,
    });

    const { data: kycDocuments, isLoading: isLoadingKycDocs } = useQuery({
        queryKey: ['member-kyc-docs', selectedKycMember?.dbId],
        queryFn: () => selectedKycMember ? getMemberKycDocumentsAction(selectedKycMember.dbId) : null,
        enabled: !!selectedKycMember,
    });

    const { data: blockStatuses } = useQuery({
        queryKey: ['approval-statuses'],
        queryFn: getApprovalStatusesAction
    });

    const { data: userScope } = useQuery({
        queryKey: ['user-scope'],
        queryFn: getCurrentUserScopeAction
    });


    useEffect(() => {
        if (editModalOpen && memberDetails) {
            setEditFormData({
                name: (memberDetails as any).name || selectedMember?.member?.name || '',
                phone: (memberDetails as any).phone || selectedMember?.member?.phone || '',
                dob: (memberDetails as any).dob ? new Date((memberDetails as any).dob).toISOString().split('T')[0] : '',
                gender: (memberDetails as any).gender || '',
                shopName: (memberDetails as any).shopName || '',
                companyName: (memberDetails as any).companyName || '',
                addressLine1: (memberDetails as any).addressLine1 || '',
                addressLine2: (memberDetails as any).addressLine2 || '',
                city: (memberDetails as any).city || '',
                state: (memberDetails as any).state || '',
                pincode: (memberDetails as any).pincode || '',
                bankAccountName: (memberDetails as any).bankAccountName || '',
                bankAccountNo: (memberDetails as any).bankAccountNo || '',
                bankAccountIfsc: (memberDetails as any).bankAccountIfsc || '',
                upiId: (memberDetails as any).upiId || '',
            });
        }
    }, [editModalOpen, memberDetails, selectedMember]);

    // Auto-hide snackbar
    useEffect(() => {
        if (snackbarOpen) {
            const t = setTimeout(() => setSnackbarOpen(false), 6000);
            return () => clearTimeout(t);
        }
    }, [snackbarOpen]);

    if (!hierarchyData || filteredLevels.length === 0) return null;

    const handleLevelChange = (index: number) => {
        setLevelTab(index);
        setEntityTab(0);
        setPage(1);
    };

    const handleViewKyc = (member: any) => {
        setSelectedKycMember(member);
        setKycModalOpen(true);
    };

    const handleViewDetails = (member: any) => {
        setSelectedMember({ type: currentEntity.name, id: member.dbId, member });
        setDetailsModalOpen(true);
    };

    const handleEditMember = (member: any) => {
        setSelectedMember({ type: currentEntity.name, id: member.dbId, member });
        setEditModalOpen(true);
    };

    const handleSaveMember = async () => {
        if (!selectedMember) return;
        try {
            await updateMemberDetailsAction(selectedMember.id, selectedMember.type, editFormData);
            setEditModalOpen(false);
            setSnackbarMessage('Member details updated successfully');
            setSnackbarOpen(true);
            queryClient.invalidateQueries({ queryKey: ['member-details', selectedMember.type, selectedMember.id] });
            queryClient.invalidateQueries({ queryKey: ['members-list'] });
        } catch (error) {
            console.error("Failed to update member:", error);
            setSnackbarMessage('Failed to update member details');
            setSnackbarOpen(true);
        }
    };

    const handleViewDocument = (url: string, type: string) => {
        setViewDocUrl(url);
        setViewDocType(type);
        setViewDocOpen(true);
    };

    const handleUpdateDocStatus = async (docId: number, status: 'verified' | 'rejected') => {
        try {
            await updateKycDocumentStatusAction(docId, status);
            queryClient.invalidateQueries({ queryKey: ['member-kyc-docs'] });
            queryClient.invalidateQueries({ queryKey: ['members-list'] });
        } catch (error) {
            console.error("Failed to update document status:", error);
        }
    };

    const handleUpdateBlockStatus = async (userId: number, statusId: number) => {
        try {
            await updateMemberApprovalStatusAction(userId, statusId);
            queryClient.invalidateQueries({ queryKey: ['members-list'] });
            setSnackbarMessage('Member status updated successfully');
            setSnackbarOpen(true);
        } catch (error) {
            console.error("Failed to update block status:", error);
            setSnackbarMessage('Failed to update status');
            setSnackbarOpen(true);
        }
    };

    const handleApproveMember = async (userId: number) => {
        try {
            const res = await approveMemberAction(userId);
            if (res.success) {
                setKycModalOpen(false);
                setSnackbarMessage('Member approval processed');
                setSnackbarOpen(true);
                queryClient.invalidateQueries({ queryKey: ['members-list'] });
            } else {
                setSnackbarMessage(res.error || 'Failed to approve member');
                setSnackbarOpen(true);
            }
        } catch (error) {
            console.error("Failed to approve member:", error);
            setSnackbarMessage('Error approving member');
            setSnackbarOpen(true);
        }
    };

    const handleRejectMember = async (userId: number) => {
        try {
            const res = await rejectMemberAction(userId, 'Rejected during review');
            if (res.success) {
                setKycModalOpen(false);
                setSnackbarMessage('Member rejected');
                setSnackbarOpen(true);
                queryClient.invalidateQueries({ queryKey: ['members-list'] });
            } else {
                setSnackbarMessage(res.error || 'Failed to reject member');
                setSnackbarOpen(true);
            }
        } catch (error) {
            console.error("Failed to reject member:", error);
            setSnackbarMessage('Error rejecting member');
            setSnackbarOpen(true);
        }
    };

    const getKycBadge = (status: string, approvalStatus?: string) => {
        if (approvalStatus === 'SR_APPROVED') return <span className="badge badge-info">SR Approved</span>;
        switch (status) {
            case 'Approved':
                return <span className="badge badge-success">Approved</span>;
            case 'Rejected':
                return <span className="badge badge-danger">Rejected</span>;
            case 'Pending':
            default:
                return <span className="badge badge-warning">Pending Review</span>;
        }
    };

    const getKycRowClass = (status: string) => {
        switch (status) {
            case 'Approved': return 'kyc-approved';
            case 'Rejected': return 'kyc-rejected';
            default: return 'kyc-pending';
        }
    };

    const getApprovalBadge = (status: string) => {
        const s = status?.toUpperCase() || '';
        const cls = s.includes('APPROVED') || s === 'ACTIVE' ? 'badge badge-success' :
            s.includes('BLOCKED') ? 'badge badge-danger' :
                s.includes('REJECTED') || s === 'SR_APPROVED' ? 'badge badge-warning' : 'badge badge-primary';
        
        let label = status;
        if (s === 'SR_APPROVED') label = 'Pending TSM Review';
        if (s === 'KYC_PENDING') label = 'Pending SR Review';

        return <span className={cls}>{label}</span>;
    };

    const getDocIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('aadhaar')) return 'fa-id-card';
        if (t.includes('pan')) return 'fa-credit-card';
        if (t.includes('address')) return 'fa-map-marker-alt';
        return 'fa-building';
    };

    const getDocPreviewType = (url: string, type: string): 'image' | 'pdf' | 'video' | 'other' => {
        const lowerUrl = (url || '').split('?')[0].toLowerCase();
        const lowerType = (type || '').toLowerCase();

        if (/\.(png|jpg|jpeg|gif|webp|svg|avif)$/.test(lowerUrl)) return 'image';
        if (/\.(mp4|webm|mov|m4v)$/.test(lowerUrl)) return 'video';
        if (/\.pdf$/.test(lowerUrl)) return 'pdf';

        if (lowerType.includes('certificate')) return 'pdf';
        return 'image';
    };

    return (
        <div>
            {/* Main Tabs (Levels) */}
            <div className="tabs mb-4 px-1">
                {filteredLevels.map((level: any, index: number) => (
                    <button
                        key={level.id}
                        className={`tab ${levelTab === index ? 'active' : ''}`}
                        onClick={() => handleLevelChange(index)}
                        style={{ fontSize: '0.9rem', padding: '8px 24px' }}
                    >
                        {level.displayName || level.name}
                    </button>
                ))}
            </div>

            {/* Sub Tabs (Entities within Level) */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide px-1">
                {currentLevel.entities.map((entity: any, index: number) => (
                    <button
                        key={entity.id}
                        onClick={() => { setEntityTab(index); setPage(1); }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeEntityTab === index
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-red-300'
                            }`}
                    >
                        {entity.name}
                    </button>
                ))}
            </div>

            {/* Statistics */}
            {!currentEntity ? (
                <div className="flex justify-center items-center h-[50vh]">
                    <p className="text-gray-500">No entities found for this level.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="widget-card rounded-xl shadow p-6">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm text-gray-500">Total {currentEntity.name}</p>
                                  <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0"><i className="fas fa-users text-white text-xs"></i></div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.total.toLocaleString()}</h3>
                            <div className="flex items-center text-xs">
                                <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <i className="fas fa-arrow-up"></i> {stats.totalTrend}
                                </span>
                                <span className="text-gray-400 ml-1.5">vs last month</span>
                            </div>
                        </div>
                        <div className="widget-card rounded-xl shadow p-6">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm text-gray-500">KYC Pending</p>
                                  <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0"><i className="fas fa-clock text-white text-xs"></i></div>
                            </div>
                            <h3 className="text-2xl font-bold mb-1">{stats.kycPending}</h3>
                            <div className="flex items-center text-sm">
                                <span className="text-orange-600 font-medium">{stats.kycPendingTrend}</span>
                                <span className="text-gray-500 ml-2">today</span>
                            </div>
                        </div>
                        <div className="widget-card rounded-xl shadow p-6">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm text-gray-500">KYC Approved</p>
                                  <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0"><i className="fas fa-check-circle text-white text-xs"></i></div>
                            </div>
                            <h3 className="text-2xl font-bold mb-1">{stats.kycApproved.toLocaleString()}</h3>
                            <div className="flex items-center text-sm">
                                <span className="text-green-600 font-medium">{stats.kycApprovedRate}</span>
                                <span className="text-gray-500 ml-2">approval rate</span>
                            </div>
                        </div>
                        <div className="widget-card rounded-xl shadow p-6">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm text-gray-500">Active Today</p>
                                  <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0"><i className="fas fa-user-check text-white text-xs"></i></div>
                            </div>
                            <h3 className="text-2xl font-bold mb-1">{stats.activeToday}</h3>
                            <div className="flex items-center text-sm">
                                <span className="text-red-600 font-medium">{stats.activeTodayTrend}</span>
                                <span className="text-gray-500 ml-2">from yesterday</span>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="widget-card rounded-xl shadow p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div className="md:col-span-4">
                                <input
                                    type="text"
                                    placeholder={`Search ${currentEntity.name.toLowerCase()}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 shadow-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <select value={kycStatusFilter} onChange={(e) => setKycStatusFilter(e.target.value)} className={selectClass}>
                                    <option>All Status</option>
                                    <option>KYC Pending</option>
                                    <option>KYC Approved</option>
                                    <option>KYC Rejected</option>
                                    <option>Blocked</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={selectClass}>
                                    <option>All Regions</option>
                                    <option>North</option>
                                    <option>South</option>
                                    <option>East</option>
                                    <option>West</option>
                                </select>
                            </div>
                            <div className="md:col-span-4 flex justify-end">
                                <button className="btn btn-primary">
                                    <i className="fas fa-filter"></i> Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Member List */}
                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{currentEntity.name} List</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium shadow-sm">
                                    <i className="fas fa-plus"></i> Add Member
                                </button>
                                <button className="btn btn-secondary">
                                    <i className="fas fa-download"></i> Export
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto" style={{ minHeight: '300px' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>{currentEntity.name}</th>
                                        <th>Contact</th>
                                        <th>
                                            {currentEntity.name.toLowerCase().includes('retailer') ? 'Store' :
                                                currentEntity.name.toLowerCase().includes('counter staff') ? 'Mapped Retailer' :
                                                    currentLevel.name.toLowerCase().includes('internal') ? 'Role' : 'Region'}
                                        </th>
                                        <th>KYC Status</th>
                                        <th>Approval Status</th>
                                        {currentEntity.name.toLowerCase().includes('mechanic') && <th>Joined</th>}
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((member: any) => (
                                        <tr key={member.id}>
                                            <td>
                                                <div className="flex items-center">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0"
                                                        style={{ backgroundColor: member.avatarColor + '20', color: member.avatarColor }}
                                                    >
                                                        {member.initials}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{member.name}</p>
                                                        <p className="text-xs text-gray-500">ID: {member.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="text-sm">{member.phone}</p>
                                                <p className="text-xs text-gray-500">{member.email}</p>
                                            </td>
                                            <td className="py-3 px-4">
                                                {currentEntity.name.toLowerCase().includes('retailer') ? (
                                                    <>
                                                        <p className="text-sm font-medium">{member.storeName || 'N/A'}</p>
                                                        <p className="text-xs text-gray-500">{member.location || 'N/A'}</p>
                                                    </>
                                                ) : currentEntity.name.toLowerCase().includes('counter staff') ? (
                                                    <>
                                                        <p className="text-sm font-medium">{member.mappedRetailer || '---'}</p>
                                                        <p className="text-xs text-gray-500">{member.location || 'N/A'}</p>
                                                    </>
                                                ) : currentLevel.name.toLowerCase().includes('internal') ? (
                                                    <p className="text-sm">{member.role || 'N/A'}</p>
                                                ) : (
                                                    <p className="text-sm">{member.regions || 'N/A'}</p>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    {getKycBadge(member.kycStatus, member.approvalStatus)}
                                                    <button 
                                                        onClick={() => handleViewKyc(member)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="View Documents"
                                                    >
                                                        <i className="fas fa-file-invoice text-sm"></i>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">{getApprovalBadge(member.approvalStatus)}</td>
                                            {currentEntity.name.toLowerCase().includes('mechanic') && (
                                                <td className="py-3 px-4 text-sm">{member.joinedDate}</td>
                                            )}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleViewDetails(member)} 
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="View Profile"
                                                    >
                                                        <i className="fas fa-user-circle text-lg"></i>
                                                    </button>
                                                    
                                                    <ActionDropdown label="Account" icon="fa-cog" direction="down">
                                                        <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Change Status</div>
                                                        {['ACTIVE', 'BLOCKED', 'SCAN_BLOCKED', 'REDEMPTION_BLOCKED'].map(statusName => {
                                                            const status = blockStatuses?.find((s: any) => s.name.toUpperCase() === statusName);
                                                            if (!status) return null;
                                                            const isCurrent = member.approvalStatusId === status.id;
                                                            
                                                            // Role-specific labeling
                                                            let label = statusName.replace('_', ' ');
                                                            const isRetailer = currentEntity?.name.toLowerCase().includes('retailer');
                                                            
                                                            if (statusName === 'BLOCKED') {
                                                                label = isRetailer ? 'Full Block (Invoices + Redemption)' : 'Full Block (Scans + Redemption)';
                                                            } else if (statusName === 'SCAN_BLOCKED') {
                                                                label = isRetailer ? 'Invoice Sync Block' : 'Scan Block';
                                                            } else if (statusName === 'REDEMPTION_BLOCKED') {
                                                                label = 'Redemption Block';
                                                            } else if (statusName === 'ACTIVE') {
                                                                label = 'Active (Unblocked)';
                                                            }

                                                            return (
                                                                <button
                                                                    key={status.id}
                                                                    onClick={() => !isCurrent && handleUpdateBlockStatus(member.dbId, status.id)}
                                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${isCurrent ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                                                >
                                                                    <i className={`fas ${isCurrent ? 'fa-check-circle' : 'fa-circle text-[8px] opacity-30'} w-4 text-center`}></i>
                                                                    {label}
                                                                </button>
                                                            );
                                                        })}
                                                        <div className="border-t border-gray-100 my-1"></div>
                                                        <button onClick={() => handleEditMember(member)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left">
                                                            <i className="fas fa-edit text-gray-400 text-xs w-4"></i> Edit Details
                                                        </button>
                                                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                                                            <i className="fas fa-trash-alt text-xs w-4"></i> Delete Member
                                                        </button>
                                                    </ActionDropdown>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-between items-center mt-4">
                            <p className="text-sm text-gray-500">Page {page} (Total: {stats.total.toLocaleString()})</p>
                            <div className="flex gap-2">
                                    <button className="btn btn-secondary disabled:opacity-50" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <i className="fas fa-chevron-left text-xs"></i> Prev
                                    </button>
                                    <button className="btn btn-secondary disabled:opacity-50" onClick={() => setPage(p => p + 1)} disabled={members.length < limit}>
                                        Next <i className="fas fa-chevron-right text-xs"></i>
                                    </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ══════ Member Details Modal ══════ */}
            {detailsModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Gradient Header */}
                        <div className="p-6 text-white relative" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                            <button onClick={() => setDetailsModalOpen(false)} className="absolute right-4 top-4 text-white/80 hover:text-white">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-white/20 flex-shrink-0"
                                    style={{ backgroundColor: selectedMember?.member?.avatarColor }}
                                >
                                    {selectedMember?.member?.initials}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedMember?.member?.name}</h3>
                                    <p className="opacity-90 text-sm">ID: {selectedMember?.member?.id}</p>
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                        <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${selectedMember?.member?.kycStatus === 'Approved' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                            {selectedMember?.member?.kycStatus}
                                        </span>
                                        <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${selectedMember?.member?.approvalStatus?.includes('APPROVED') ? 'bg-green-500' :
                                            selectedMember?.member?.approvalStatus?.includes('BLOCKED') ? 'bg-red-500' :
                                                selectedMember?.member?.approvalStatus?.includes('REJECTED') ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                            {selectedMember?.member?.approvalStatus}
                                        </span>
                                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{currentEntity?.name}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                            {isLoadingDetails ? (
                                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div></div>
                            ) : memberDetails ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Personal Info */}
                                    <div>
                                        <h4 className="text-base font-bold text-red-700 mb-3">Personal Information</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <i className="fas fa-phone text-gray-400 w-5 text-center"></i>
                                                <div>
                                                    <p className="text-xs text-gray-500">Phone Number</p>
                                                    <p className="text-sm font-medium">{(memberDetails as any).phone || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <i className="fas fa-calendar text-gray-400 w-5 text-center"></i>
                                                <div>
                                                    <p className="text-xs text-gray-500">Date of Birth</p>
                                                    <p className="text-sm font-medium">{(memberDetails as any).dob ? new Date((memberDetails as any).dob).toLocaleDateString() : 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <i className="fas fa-id-card text-gray-400 w-5 text-center"></i>
                                                <div>
                                                    <p className="text-xs text-gray-500">Gender</p>
                                                    <p className="text-sm font-medium">{(memberDetails as any).gender || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional Details */}
                                    <div>
                                        <h4 className="text-base font-bold text-red-700 mb-3">Professional Details</h4>
                                        <div className="space-y-3">
                                            {currentEntity.name.toLowerCase().includes('retailer') && (
                                                <div className="flex items-center gap-3">
                                                    <i className="fas fa-store text-gray-400 w-5 text-center"></i>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Store Name</p>
                                                        <p className="text-sm font-medium">{(memberDetails as any).shopName || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {currentEntity.name.toLowerCase().includes('counter staff') && (
                                                <div className="flex items-center gap-3">
                                                    <i className="fas fa-building text-gray-400 w-5 text-center"></i>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Mapped Retailer</p>
                                                        <p className="text-sm font-medium">{(memberDetails as any).mappedRetailer || '---'}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <i className="fas fa-map-marker-alt text-gray-400 w-5 text-center"></i>
                                                <div>
                                                    <p className="text-xs text-gray-500">Location</p>
                                                    <p className="text-sm font-medium">
                                                        {(memberDetails as any).addressLine1 ? `${(memberDetails as any).addressLine1}, ` : ''}
                                                        {(memberDetails as any).city}, {(memberDetails as any).state} {(memberDetails as any).pincode}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial & KYC */}
                                    <div className="md:col-span-2">
                                        <hr className="border-gray-200 my-2" />
                                        <h4 className="text-base font-bold text-red-700 mb-3">Financial & KYC</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                                                <p className="text-xs text-gray-500">Points Balance</p>
                                                <p className="text-xl font-bold text-red-600">{(memberDetails as any).pointsBalance || 0}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                                                <p className="text-xs text-gray-500">Total Earnings</p>
                                                <p className="text-xl font-bold text-green-600">₹{(memberDetails as any).totalEarnings || 0}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                                                <p className="text-xs text-gray-500">Bank Status</p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${(memberDetails as any).isBankValidated ? 'border-green-300 text-green-700' : 'border-yellow-300 text-yellow-700'}`}>
                                                    {(memberDetails as any).isBankValidated ? 'Validated' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bank Details */}
                                    {(memberDetails as any).bankAccountNo && (
                                        <div className="md:col-span-2">
                                            <div className="p-4 rounded-xl border border-dashed border-red-400 bg-red-50/50">
                                                <p className="text-sm font-bold mb-3 flex items-center gap-2">
                                                    <i className="fas fa-university text-red-600"></i> Bank Account Details
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Account Holder</p>
                                                        <p className="text-sm font-medium">{(memberDetails as any).bankAccountName || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Account Number</p>
                                                        <p className="text-sm font-medium">{(memberDetails as any).bankAccountNo || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">IFSC Code</p>
                                                        <p className="text-sm font-medium">{(memberDetails as any).bankAccountIfsc || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-8 text-center">
                                    <p className="text-gray-500">No additional details found for this member.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t">
                            <button onClick={() => setDetailsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition">Close</button>
                            <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-2">
                                <i className="fas fa-edit text-xs"></i> Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ KYC Documents Modal ══════ */}
            {kycModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="text-lg font-bold">KYC Documents - {selectedKycMember?.name}</h3>
                            <button onClick={() => setKycModalOpen(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {isLoadingKycDocs ? (
                                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
                            ) : !kycDocuments || kycDocuments.length === 0 ? (
                                <div className="py-8 text-center"><p className="text-gray-500">No KYC documents found for this member.</p></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {kycDocuments.map((doc: any, idx: number) => (
                                        <div key={idx}>
                                            <p className="text-sm font-medium mb-1">{doc.documentType}</p>
                                            <div
                                                onClick={() => handleViewDocument(doc.signedUrl, doc.documentType)}
                                                className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer transition hover:bg-red-50/50 hover:border-red-400"
                                            >
                                                <div className="h-28 w-full rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center mb-2">
                                                    {!doc.signedUrl ? (
                                                        <i className={`fas ${getDocIcon(doc.documentType)} text-4xl text-gray-400`}></i>
                                                    ) : getDocPreviewType(doc.signedUrl, doc.documentType) === 'pdf' ? (
                                                        <iframe
                                                            src={`${doc.signedUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                                            className="w-full h-full"
                                                            style={{ border: 'none' }}
                                                            title={`${doc.documentType} preview`}
                                                        />
                                                    ) : getDocPreviewType(doc.signedUrl, doc.documentType) === 'video' ? (
                                                        <video src={doc.signedUrl} className="w-full h-full object-cover" muted playsInline />
                                                    ) : (
                                                        <img src={doc.signedUrl} alt={doc.documentType} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">Click to view full document</p>
                                                <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${doc.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                                                    doc.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {doc.verificationStatus}
                                                </span>
                                            </div>
                                            {doc.verificationStatus === 'pending' && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={() => handleUpdateDocStatus(doc.id, 'verified')}
                                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50 transition"
                                                    >
                                                        <i className="fas fa-check-circle text-xs"></i> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateDocStatus(doc.id, 'rejected')}
                                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50 transition"
                                                    >
                                                        <i className="fas fa-times-circle text-xs"></i> Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between p-4 border-t bg-gray-50">
                            <div className="flex gap-2">
                                {((selectedKycMember?.approvalStatus === 'KYC_PENDING' && userScope?.role.toUpperCase() === 'SR') ||
                                  (selectedKycMember?.approvalStatus === 'SR_APPROVED' && userScope?.role.toUpperCase() === 'TSM') ||
                                  (['ADMIN', 'SUPER ADMIN'].includes(userScope?.role.toUpperCase() || ''))) && (
                                    <>
                                        <button 
                                            onClick={() => handleApproveMember(selectedKycMember.dbId)} 
                                            className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-md flex items-center gap-2"
                                        >
                                            <i className="fas fa-check-double"></i> Approve Profile
                                        </button>
                                        <button 
                                            onClick={() => handleRejectMember(selectedKycMember.dbId)} 
                                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-100 transition"
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}
                            </div>
                            <button onClick={() => setKycModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition font-medium">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ Edit Member Modal ══════ */}
            {editModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="text-lg font-bold">Edit Member Details</h3>
                            <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Name</label>
                                    <input disabled className={`${inputClass} bg-gray-100`} value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                                    <input disabled className={`${inputClass} bg-gray-100`} value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                                    <input type="date" disabled className={`${inputClass} bg-gray-100`} value={editFormData.dob} onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Gender</label>
                                    <select disabled className={`${selectClass} bg-gray-100`} value={editFormData.gender} onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {(selectedMember?.type?.toLowerCase().includes('retailer') || editFormData.shopName) && (
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-sm font-medium text-gray-700">Store Name</label>
                                        <input className={inputClass} value={editFormData.shopName} onChange={(e) => setEditFormData({ ...editFormData, shopName: e.target.value })} />
                                    </div>
                                )}

                                <div className="md:col-span-2 mt-2">
                                    <p className="text-sm font-bold mb-2">Location Details</p>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-medium text-gray-700">Address Line 1</label>
                                    <input className={inputClass} value={editFormData.addressLine1} onChange={(e) => setEditFormData({ ...editFormData, addressLine1: e.target.value })} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-medium text-gray-700">Address Line 2</label>
                                    <input className={inputClass} value={editFormData.addressLine2} onChange={(e) => setEditFormData({ ...editFormData, addressLine2: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">City</label>
                                    <input className={inputClass} value={editFormData.city} onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">State</label>
                                    <input className={inputClass} value={editFormData.state} onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Pincode</label>
                                    <input className={inputClass} value={editFormData.pincode} onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })} />
                                </div>

                                <div className="md:col-span-2 mt-2">
                                    <p className="text-sm font-bold mb-2">Bank Account Details</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Account Holder Name</label>
                                    <input disabled className={`${inputClass} bg-gray-100`} value={editFormData.bankAccountName} onChange={(e) => setEditFormData({ ...editFormData, bankAccountName: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Account Number</label>
                                    <input disabled className={`${inputClass} bg-gray-100`} value={editFormData.bankAccountNo} onChange={(e) => setEditFormData({ ...editFormData, bankAccountNo: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">IFSC Code</label>
                                    <input disabled className={`${inputClass} bg-gray-100`} value={editFormData.bankAccountIfsc} onChange={(e) => setEditFormData({ ...editFormData, bankAccountIfsc: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">UPI ID</label>
                                    <input disabled className={`${inputClass} bg-gray-100`} value={editFormData.upiId} onChange={(e) => setEditFormData({ ...editFormData, upiId: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t">
                            <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition">Cancel</button>
                            <button onClick={handleSaveMember} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ Document Viewer Modal ══════ */}
            {viewDocOpen && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col" style={{ height: '100vh' }}>
                    <div className="flex justify-between items-center p-3 bg-gray-800 text-white">
                        <h3 className="text-lg font-semibold">{viewDocType}</h3>
                        <div className="flex gap-2">
                            <button onClick={() => window.open(viewDocUrl, '_blank')} className="p-2 hover:bg-gray-700 rounded" title="Open in new tab">
                                <i className="fas fa-download"></i>
                            </button>
                            <button onClick={() => setViewDocOpen(false)} className="p-2 hover:bg-gray-700 rounded">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-center items-center bg-black overflow-auto p-2">
                        {viewDocUrl && (viewDocUrl.toLowerCase().includes('.pdf') || viewDocType.toLowerCase().includes('pdf')) ? (
                            <iframe src={viewDocUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Viewer" />
                        ) : (
                            <img src={viewDocUrl} alt="Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        )}
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {addModalOpen && (
                <AddMemberModal 
                    open={addModalOpen} 
                    onClose={() => setAddModalOpen(false)} 
                    onSuccess={() => {
                        setAddModalOpen(false);
                        setSnackbarMessage('Member created successfully');
                        setSnackbarOpen(true);
                        queryClient.invalidateQueries({ queryKey: ['members-list'] });
                    }}
                    userScope={userScope}
                />
            )}

            {/* Snackbar Toast */}
            {snackbarOpen && (
                <div className="fixed bottom-6 right-6 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                    <i className="fas fa-check-circle text-green-600"></i>
                    <span className="text-sm">{snackbarMessage}</span>
                    <button onClick={() => setSnackbarOpen(false)} className="text-green-600 hover:text-green-800 ml-2">
                        <i className="fas fa-times text-xs"></i>
                    </button>
                </div>
            )}
        </div>
    );
}

function AddMemberModal({ open, onClose, onSuccess, userScope }: { open: boolean; onClose: () => void; onSuccess: () => void; userScope: any }) {
    const [formData, setFormData] = useState<any>({
        roleId: '',
        name: '',
        phone: '',
        email: '',
        password: '',
        state: '',
        city: '',
        district: '',
        pincode: '',
        addressLine1: '',
        addressLine2: '',
        dob: '',
        gender: '',
        shopName: '',
        aadhaar: '',
        pan: '',
        gst: '',
        bankAccountNo: '',
        bankAccountIfsc: '',
        bankAccountName: '',
        upiId: '',
        scopeEntityId: '',
        attachedRetailerId: '',
        zone: '',
        kycDocuments: {}
    });

    const [allowedRoles, setAllowedRoles] = useState<{ id: number, name: string }[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [allStates, setAllStates] = useState<any[]>([]);
    const [selectedState, setSelectedState] = useState<string>('');
    const [pincodes, setPincodes] = useState<any[]>([]);

    const [cityRetailers, setCityRetailers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(type);
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('type', type);

        try {
            const res = await uploadMemberFileAction(uploadData);
            if (res.success) {
                setFormData((prev: any) => ({
                    ...prev,
                    kycDocuments: {
                        ...prev.kycDocuments,
                        [type.toUpperCase()]: res.fileName
                    }
                }));
            } else {
                alert(res.error || 'Failed to upload file');
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert('An error occurred during upload');
        } finally {
            setUploading(null);
        }
    };

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500";
    const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 bg-white";

    useEffect(() => {
        setSelectedState('');
        setAllStates([]);
        setLocations([]);
        setFormData((prev: any) => ({ ...prev, scopeEntityId: '' }));
    }, [formData.roleId]);

    useEffect(() => {
        if (userScope) {


            const role = userScope.role.toUpperCase();
            let roles = [];
            if (role === 'ADMIN' || userScope.permissions.includes('all')) {
                roles = [
                    { id: 17, name: 'Sales Head' },
                    { id: 15, name: 'TSM' },
                    { id: 16, name: 'SR' },
                    { id: 3, name: 'Mechanic' },
                    { id: 2, name: 'Retailer' }
                ];
            } else if (role === 'SALES HEAD') {
                roles = [{ id: 15, name: 'TSM' }];
            } else if (role === 'TSM') {
                roles = [{ id: 16, name: 'SR' }];
            } else if (role === 'SR') {
                roles = [
                    { id: 3, name: 'Mechanic' },
                    { id: 2, name: 'Retailer' }
                ];
            }
            setAllowedRoles(roles);
            if (roles.length === 1) setFormData((prev: any) => ({ ...prev, roleId: roles[0].id.toString() }));
        }
    }, [userScope]);

    useEffect(() => {
        const fetchLocations = async () => {
            if (!userScope) return;
            const targetRole = allowedRoles.find(r => r.id.toString() === formData.roleId)?.name.toUpperCase();
            const creatorRole = userScope.role.toUpperCase();
            const isAdmin = creatorRole.includes('ADMIN') || userScope.permissions.includes('all');

            if (creatorRole === 'TSM' && targetRole === 'SR') {
                // Fetch cities in TSM's state
                const cities = await getLocationEntitiesAction(5, userScope.entityIds[0]);
                setLocations(cities);
            } else if (targetRole === 'TSM' && isAdmin) {
                // Admin creating TSM, fetch states from pincode master
                const states = await getPincodeStatesAction();
                setLocations(states.map(s => ({ id: s, name: s })));
            } else if (targetRole === 'SR' && isAdmin) {
                // Admin creating SR, fetch states first from pincode master
                const states = await getPincodeStatesAction();
                setAllStates(states.map(s => ({ id: s, name: s })));
                setLocations([]); // Clear cities until state is selected
            }


        };
        if (formData.roleId) fetchLocations();
    }, [formData.roleId, userScope, allowedRoles]);

    useEffect(() => {
        const fetchCitiesForState = async () => {
            if (selectedState) {
                const targetRole = allowedRoles.find(r => r.id.toString() === formData.roleId)?.name.toUpperCase();
                const isAdmin = userScope?.role.toUpperCase().includes('ADMIN') || userScope?.permissions.includes('all');
                
                if (targetRole === 'SR' && isAdmin) {
                    const cities = await getPincodeCitiesAction(selectedState);
                    setLocations(cities.map(c => ({ id: c, name: c })));
                } else {
                    const cities = await getLocationEntitiesAction(5, parseInt(selectedState));
                    setLocations(cities);
                }
            }
        };
        fetchCitiesForState();
    }, [selectedState, formData.roleId, userScope, allowedRoles]);



    useEffect(() => {
        const fetchPincodes = async () => {
            const targetRole = allowedRoles.find(r => r.id.toString() === formData.roleId)?.name.toUpperCase();
            if (['MECHANIC', 'RETAILER'].includes(targetRole as string)) {
                let city = formData.city;
                if (!city && userScope?.role.toUpperCase() === 'SR' && userScope.entityNames.length === 1) {
                    city = userScope.entityNames[0];
                    setFormData((prev: any) => ({ ...prev, city }));
                }
                
                // Fetch pincodes (getPincodesAction is already scoped in member-actions.ts)
                const pins = await getPincodesAction(city || undefined);
                setPincodes(pins);
            }
        };
        fetchPincodes();
    }, [formData.roleId, formData.city, userScope, allowedRoles]);

    useEffect(() => {
        const fetchCityRetailers = async () => {
            const targetRole = allowedRoles.find(r => r.id.toString() === formData.roleId)?.name.toUpperCase();
            if (targetRole === 'MECHANIC' && (formData.city || (userScope?.role.toUpperCase() === 'SR' && userScope.entityNames[0]))) {
                const city = formData.city || userScope.entityNames[0];
                const results = await getRetailersByCityAction(city);
                setCityRetailers(results);
            }
        };
        fetchCityRetailers();
    }, [formData.roleId, formData.city, userScope, allowedRoles]);

    useEffect(() => {
        const lookupPincode = async () => {
            if (formData.pincode.length === 6) {
                const location = await getLocationByPincodeAction(formData.pincode);
                if (location) {
                    setFormData((prev: any) => ({
                        ...prev,
                        city: location.city,
                        state: location.state,
                        district: location.district,
                        zone: location.zone
                    }));
                }
            }
        };
        lookupPincode();
    }, [formData.pincode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Basic format checks
        if (formData.phone.length !== 10) {
            setError('Phone number must be 10 digits.');
            setLoading(false);
            return;
        }

        const res = await createMemberAction({ 
            ...formData, 
            state: (formData.roleId === '16' && selectedState) ? selectedState : formData.state 
        });

        if (res.success) {
            onSuccess();
        } else {
            setError(res.error || 'Failed to create member');
            setLoading(false);
        }
    };

    const isMember = ['3', '2'].includes(formData.roleId);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">Add New Member</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><i className="fas fa-times text-lg"></i></button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Role Selection */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</label>
                            <select 
                                value={formData.roleId} 
                                onChange={e => setFormData({ ...formData, roleId: e.target.value })} 
                                className={selectClass}
                                required
                            >
                                <option value="">Select Role</option>
                                {allowedRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} required />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</label>
                            <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputClass} required maxLength={10} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputClass} />
                        </div>

                        {!isMember && (
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className={inputClass} required />
                            </div>
                        )}

                        {/* Hierarchy Mapping */}
                        {(formData.roleId === '15' || formData.roleId === '16') && (
                            <>
                                {/* Show State dropdown if creating TSM or if Admin is creating SR */}
                                {(formData.roleId === '15' || (formData.roleId === '16' && (userScope?.role.toUpperCase().includes('ADMIN') || userScope?.permissions.includes('all')))) && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {formData.roleId === '15' ? 'Map to State' : 'Select State'}
                                        </label>
                                        <select 
                                            value={formData.roleId === '15' ? formData.scopeEntityId : selectedState} 
                                            onChange={e => {
                                                if (formData.roleId === '15') {
                                                    setFormData({ ...formData, scopeEntityId: e.target.value });
                                                } else {
                                                    setSelectedState(e.target.value);
                                                    setFormData({ ...formData, scopeEntityId: '' }); // Reset city
                                                }
                                            }} 
                                            className={selectClass}
                                            required
                                        >
                                            <option value="">Select State</option>
                                            {(formData.roleId === '15' ? locations : allStates).map(l => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Show City dropdown if creating SR */}
                                {formData.roleId === '16' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Map to City
                                        </label>
                                        <select 
                                            value={formData.scopeEntityId} 
                                            onChange={e => setFormData({ ...formData, scopeEntityId: e.target.value })} 
                                            className={selectClass}
                                            required
                                            disabled={(userScope?.role.toUpperCase().includes('ADMIN') || userScope?.permissions.includes('all')) && !selectedState}
                                        >
                                            <option value="">{(userScope?.role.toUpperCase().includes('ADMIN') || userScope?.permissions.includes('all')) && !selectedState ? 'Select State First' : 'Select City'}</option>
                                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                )}

                            </>
                        )}


                        {/* Member Specific Fields */}
                        {isMember && (
                            <>
                                {formData.roleId === '2' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Shop Name</label>
                                        <input type="text" value={formData.shopName} onChange={e => setFormData({ ...formData, shopName: e.target.value })} className={inputClass} required />
                                    </div>
                                )}

                                
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aadhaar Number</label>
                                    <input type="text" value={formData.aadhaar} onChange={e => setFormData({ ...formData, aadhaar: e.target.value })} className={inputClass} maxLength={12} />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GSTIN</label>
                                    <input 
                                        type="text" 
                                        value={formData.gst} 
                                        onChange={e => {
                                            const val = e.target.value.toUpperCase();
                                            setFormData(prev => ({ ...prev, gst: val }));
                                        }} 
                                        className={inputClass} 
                                        maxLength={15} 
                                    />
                                </div>

                                {formData.roleId !== '2' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PAN Number</label>
                                        <input type="text" value={formData.pan} onChange={e => setFormData({ ...formData, pan: e.target.value.toUpperCase() })} className={inputClass} maxLength={10} />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</label>
                                    <input type="text" value={formData.addressLine1} onChange={e => setFormData({ ...formData, addressLine1: e.target.value })} className={inputClass} required />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-end">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pincode</label>
                                        {userScope?.role.toUpperCase() === 'SR' && (
                                            <span className="text-[10px] font-bold text-red-600 uppercase">Your Territory Only</span>
                                        )}
                                    </div>
                                    <input 
                                        type="text" 
                                        list="pincodes-list"
                                        value={formData.pincode} 
                                        onChange={e => setFormData({ ...formData, pincode: e.target.value })} 
                                        className={inputClass} 
                                        maxLength={6}
                                        required 
                                    />
                                    <datalist id="pincodes-list">
                                        {pincodes.map(p => (
                                            <option key={p.id} value={p.pincode}>{p.city}</option>
                                        ))}
                                    </datalist>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">City</label>
                                    <input type="text" value={formData.city} readOnly className={`${inputClass} bg-gray-50`} />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">State</label>
                                    <input type="text" value={formData.state} readOnly className={`${inputClass} bg-gray-50`} />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">District</label>
                                    <input type="text" value={formData.district} readOnly className={`${inputClass} bg-gray-50`} />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Zone</label>
                                    <input type="text" value={formData.zone} readOnly className={`${inputClass} bg-gray-50`} />
                                </div>

                                {formData.roleId === '3' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Map to Retailer</label>
                                        <select 
                                            value={formData.attachedRetailerId} 
                                            onChange={e => setFormData({ ...formData, attachedRetailerId: e.target.value })} 
                                            className={selectClass}
                                            required
                                        >
                                            <option value="">Select Retailer</option>
                                            {cityRetailers.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name} {r.shopName ? `(${r.shopName})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* KYC Document Uploads */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <h3 className="md:col-span-3 text-sm font-bold text-gray-800 flex items-center gap-2 mb-2 uppercase tracking-widest">
                                        <i className="fas fa-id-card text-red-600"></i> KYC Documents
                                    </h3>
                                    
                                    {[
                                        { label: 'Aadhaar Front', type: 'aadhaar_front' },
                                        { label: 'Aadhaar Back', type: 'aadhaar_back' },
                                        { label: 'PAN Image', type: 'pan' }
                                    ].map(doc => (
                                        <div key={doc.type} className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">{doc.label}</label>
                                            <div className="relative group">
                                                <input 
                                                    type="file" 
                                                    onChange={e => handleFileUpload(e, doc.type)} 
                                                    className="hidden" 
                                                    id={`upload-${doc.type}`}
                                                    accept="image/*"
                                                />
                                                <label 
                                                    htmlFor={`upload-${doc.type}`}
                                                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-red-500 hover:bg-red-50 transition cursor-pointer"
                                                >
                                                    {uploading === doc.type ? (
                                                        <i className="fas fa-spinner fa-spin text-red-500 text-xl"></i>
                                                    ) : formData.kycDocuments[doc.type.toUpperCase()] ? (
                                                        <div className="flex flex-col items-center text-green-600">
                                                            <i className="fas fa-check-circle text-xl"></i>
                                                            <span className="text-[10px] mt-1">Uploaded</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center text-gray-400">
                                                            <i className="fas fa-cloud-upload-alt text-xl"></i>
                                                            <span className="text-[10px] mt-1">Click to Upload</span>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {formData.roleId !== '3' && (
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-red-50/50 rounded-xl border border-red-100 mt-4">
                                        <h3 className="md:col-span-3 text-sm font-bold text-red-800 flex items-center gap-2 mb-2">
                                            <i className="fas fa-university"></i> Bank Details
                                        </h3>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-red-600 uppercase">Account Name</label>
                                            <input type="text" value={formData.bankAccountName} onChange={e => setFormData({ ...formData, bankAccountName: e.target.value })} className={inputClass} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-red-600 uppercase">Account Number</label>
                                            <input type="text" value={formData.bankAccountNo} onChange={e => setFormData({ ...formData, bankAccountNo: e.target.value })} className={inputClass} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-red-600 uppercase">IFSC Code</label>
                                            <input type="text" value={formData.bankAccountIfsc} onChange={e => setFormData({ ...formData, bankAccountIfsc: e.target.value })} className={inputClass} />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition text-sm font-medium">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-bold shadow-lg shadow-red-200 flex items-center gap-2 disabled:opacity-50">
                            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-plus"></i>}
                            Create Member
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

