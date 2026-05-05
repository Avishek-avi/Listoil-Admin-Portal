"use client"

import { useState, useMemo, useEffect } from 'react';
import { 
    createSchemeAction, 
    updateSchemeAction, 
    getSchemeAuditLogsAction, 
    getSchemeParticipationReportAction 
} from "@/actions/schemes-actions";
import { toast } from "react-hot-toast";

interface SchemesClientProps {
    initialSchemes: any[];
    masterData: any;
    dashboardStats: {
        liveSchemesCount: number;
        totalBudget: number;
        totalSpent: number;
        eligibleUsersCount: number;
        efficiency: number;
    };
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Invalid Date';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const FIELD_LABELS: Record<string, string> = {
    name: 'Scheme Name',
    description: 'Description',
    startDate: 'Start Date',
    endDate: 'End Date',
    rewardType: 'Reward Type',
    rewardValue: 'Reward Amount',
    maxBudget: 'Total Points Budget',
    maxUsers: 'User Limit',
    targetType: 'Targeting Level',
    targetIds: 'Selected Items',
    geoScope: 'Geographic Scope',
    audienceIds: 'Target Audience'
};

export default function SchemesClient({ initialSchemes, masterData, dashboardStats }: SchemesClientProps) {
    const [activeTab, setActiveTab] = useState('Booster Scheme');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingSchemeId, setEditingSchemeId] = useState<number | null>(null);
    const [schemeLogs, setSchemeLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [participationReport, setParticipationReport] = useState<any[]>([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        targetType: 'Category' as 'Category' | 'SubCategory' | 'SKU',
        targetIds: [] as number[],
        selection: {
            categoryIds: [] as number[],
            subCategoryIds: [] as number[],
            skuIds: [] as number[]
        },
        rewardType: 'Fixed' as 'Fixed' | 'Percentage',
        rewardValue: 0,
        audienceIds: [] as number[],
        geoScope: {
            zones: [] as string[],
            states: [] as string[],
            cities: [] as string[]
        },
        maxUsers: 0,
        slabConfig: {
            basis: 'SCAN_COUNT' as 'SCAN_COUNT' | 'POINTS_EARNED',
            disbursalType: 'REALTIME' as 'REALTIME' | 'SCHEME_END',
            slabs: [{ min: 0, max: 0, rewardValue: 0 }]
        },
        crossSellConfig: {
            slabs: [
                {
                    rewardValue: 0,
                    items: [] as { id: number; minScans: number }[]
                }
            ]
        }
    });

    const [searchTerms, setSearchTerms] = useState({
        category: '',
        subCategory: '',
        sku: '',
        zone: '',
        state: '',
        city: ''
    });

    const fetchParticipationReport = async () => {
        setReportLoading(true);
        try {
            const res = await getSchemeParticipationReportAction();
            if (res.success) {
                setParticipationReport(res.data || []);
            } else {
                toast.error(res.error || "Failed to fetch report");
            }
        } catch (err: any) {
            console.error("Fetch report error:", err);
            toast.error("An unexpected error occurred while fetching report");
        } finally {
            setReportLoading(false);
        }
    };

    const tabs = ['Booster Scheme', 'Slab Based', 'Cross-Sell', 'Participation Report', 'Scheme Logs'];

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Determine the target level based on depth of selection
            const targetType = formData.selection.skuIds.length > 0 ? 'SKU' :
                formData.selection.subCategoryIds.length > 0 ? 'SubCategory' :
                    'Category';

            const targetIds = targetType === 'SKU' ? formData.selection.skuIds :
                targetType === 'SubCategory' ? formData.selection.subCategoryIds :
                    formData.selection.categoryIds;

            if (targetIds.length === 0) {
                toast.error("Please select at least one Category, Sub-Category, or SKU");
                setLoading(false);
                return;
            }

            const typeMap: Record<string, string> = {
                'Booster Scheme': 'Booster',
                'Slab Based': 'Slab',
                'Cross-Sell': 'CrossSell'
            };
            const currentType = typeMap[activeTab] || 'Booster';

            if (currentType === 'CrossSell' && targetIds.length < 2) {
                toast.error("Cross-Sell scheme requires at least two selections");
                setLoading(false);
                return;
            }

            if (editingSchemeId) {
                const res = await updateSchemeAction(editingSchemeId, currentType, {
                    ...formData,
                    targetType,
                    targetIds
                });
                if (res.success) {
                    toast.success(`${currentType} Scheme updated successfully!`);
                    setIsCreateModalOpen(false);
                    setEditingSchemeId(null);
                    fetchLogs();
                } else {
                    toast.error(res.error || "Failed to update scheme");
                }
            } else {
                const res = await createSchemeAction(currentType, {
                    ...formData,
                    targetType,
                    targetIds
                });
                if (res.success) {
                    toast.success(`${currentType} Scheme created successfully!`);
                    setIsCreateModalOpen(false);
                    fetchLogs();
                } else {
                    toast.error(res.error || "Failed to create scheme");
                }
            }
        } catch (err: any) {
            console.error("[SchemesClient] handleCreate error:", err);
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const filteredCategories = useMemo(() => {
        return (masterData.categories || []).filter((cat: any) =>
            cat.name.toLowerCase().includes(searchTerms.category.toLowerCase())
        );
    }, [masterData.categories, searchTerms.category]);

    const filteredSubCategories = useMemo(() => {
        return (masterData.subCategories || []).filter((sc: any) =>
            (formData.selection.categoryIds.length === 0 ||
                formData.selection.categoryIds.some(cid => Number(cid) === Number(sc.parentId))) &&
            sc.name.toLowerCase().includes(searchTerms.subCategory.toLowerCase())
        );
    }, [masterData.subCategories, formData.selection.categoryIds, searchTerms.subCategory]);

    const filteredSkus = useMemo(() => {
        return (masterData.skus || []).filter((sku: any) =>
            (formData.selection.subCategoryIds.length === 0 ||
                formData.selection.subCategoryIds.some(sid => Number(sid) === Number(sku.subCategoryId))) &&
            sku.name.toLowerCase().includes(searchTerms.sku.toLowerCase())
        );
    }, [masterData.skus, formData.selection.subCategoryIds, searchTerms.sku]);

    // Geo Filters
    const filteredZones = useMemo(() => {
        return (masterData.geography?.zones || []).filter((z: string) =>
            z.toLowerCase().includes(searchTerms.zone.toLowerCase())
        );
    }, [masterData.geography?.zones, searchTerms.zone]);

    const filteredStates = useMemo(() => {
        return (masterData.geography?.states || []).filter((s: any) =>
            (formData.geoScope.zones.length === 0 || formData.geoScope.zones.includes(s.zone)) &&
            s.name.toLowerCase().includes(searchTerms.state.toLowerCase())
        );
    }, [masterData.geography?.states, formData.geoScope.zones, searchTerms.state]);

    const filteredCities = useMemo(() => {
        return (masterData.geography?.cities || []).filter((c: any) =>
            (formData.geoScope.states.length === 0 || formData.geoScope.states.includes(c.state)) &&
            c.name.toLowerCase().includes(searchTerms.city.toLowerCase())
        );
    }, [masterData.geography?.cities, formData.geoScope.states, searchTerms.city]);

    const toggleSelection = (type: 'category' | 'subCategory' | 'sku', id: number) => {
        setFormData(prev => {
            const selectionKey = `${type}Ids` as keyof typeof prev.selection;
            const current = [...prev.selection[selectionKey]];
            const updated = current.includes(id) ? current.filter(i => i !== id) : [...current, id];

            const newSelection = { ...prev.selection, [selectionKey]: updated };

            // Auto-clear children if parent is de-selected
            if (type === 'category' && !updated.includes(id)) {
                const subToClear = (masterData.subCategories || [])
                    .filter((sc: any) => Number(sc.parentId) === Number(id))
                    .map((sc: any) => sc.id);
                newSelection.subCategoryIds = newSelection.subCategoryIds.filter(sid =>
                    !subToClear.some(scid => Number(scid) === Number(sid))
                );
                const skusToClear = (masterData.skus || [])
                    .filter((sku: any) => subToClear.some(scid => Number(scid) === Number(sku.subCategoryId)))
                    .map((sku: any) => sku.id);
                newSelection.skuIds = newSelection.skuIds.filter(skid =>
                    !skusToClear.some(sckid => Number(sckid) === Number(skid))
                );
            }
            if (type === 'subCategory' && !updated.includes(id)) {
                const skusToClear = (masterData.skus || [])
                    .filter((sku: any) => Number(sku.subCategoryId) === Number(id))
                    .map((sku: any) => sku.id);
                newSelection.skuIds = newSelection.skuIds.filter(skid =>
                    !skusToClear.some(sckid => Number(sckid) === Number(skid))
                );
            }

            return { ...prev, selection: newSelection };
        });
    };

    const toggleAudienceId = (id: number) => {
        setFormData(prev => ({
            ...prev,
            audienceIds: prev.audienceIds.includes(id)
                ? prev.audienceIds.filter(i => i !== id)
                : [...prev.audienceIds, id]
        }));
    };

    const toggleGeo = (type: 'zones' | 'states' | 'cities', val: string) => {
        setFormData(prev => ({
            ...prev,
            geoScope: {
                ...prev.geoScope,
                [type]: prev.geoScope[type].includes(val)
                    ? prev.geoScope[type].filter(v => v !== val)
                    : [...prev.geoScope[type], val]
            }
        }));
    };

    const handleEdit = (scheme: any) => {
        const isSlab = scheme.schemeType === 'Slab' || (scheme.config && 'slab' in scheme.config);
        const isCrossSell = scheme.schemeType === 'CrossSell' || (scheme.config && 'crossSell' in scheme.config);

        const config = isSlab ? scheme.config?.slab :
            isCrossSell ? scheme.config?.crossSell :
                scheme.config?.booster;

        if (!config) return;

        if (isSlab) {
            setActiveTab('Slab Based');
        } else if (isCrossSell) {
            setActiveTab('Cross-Sell');
        } else {
            setActiveTab('Booster Scheme');
        }

        // Ensure targetIds are numbers for correct comparison with masterData
        const targetType = config.targetType || scheme.targetType || 'Category';
        const targetIds = ((config.targetIds || scheme.targetIds || []) as any[]).map((id: any) => Number(id));

        if (isCrossSell) {
            const rawCrossSell = scheme.config?.crossSell;
            const crossSellConfig = rawCrossSell?.crossSellConfig;
            setFormData({
                name: scheme.name,
                description: scheme.description || '',
                startDate: scheme.startDate ? scheme.startDate.substring(0, 10) : '',
                endDate: scheme.endDate ? scheme.endDate.substring(0, 10) : '',
                targetType: targetType,
                targetIds: targetIds,
                selection: {
                    categoryIds: targetType === 'Category' ? targetIds : [],
                    subCategoryIds: targetType === 'SubCategory' ? targetIds : [],
                    skuIds: targetType === 'SKU' ? targetIds : []
                },
                rewardType: config.rewardType || 'Fixed',
                rewardValue: config.rewardValue || 0,
                audienceIds: (config.audienceIds || []).map((id: any) => Number(id)),
                geoScope: config.geoScope || { zones: [], states: [], cities: [] },
                maxBudget: scheme.budget || 0,
                maxUsers: config.maxUsers || 0,
                slabConfig: {
                    basis: 'SCAN_COUNT',
                    disbursalType: 'REALTIME',
                    slabs: [{ min: 0, max: 0, rewardValue: 0 }]
                },
                crossSellConfig: {
                    rewardValue: config.rewardValue || 0,
                    items: [],
                    slabs: crossSellConfig?.slabs || [
                        {
                            rewardValue: crossSellConfig?.rewardValue || 0,
                            items: crossSellConfig?.items || targetIds.map((id: number) => ({ id, minScans: 0 }))
                        }
                    ]
                }
            });
        } else {
            setFormData({
                name: scheme.name,
                description: scheme.description || '',
                startDate: scheme.startDate ? scheme.startDate.substring(0, 10) : '',
                endDate: scheme.endDate ? scheme.endDate.substring(0, 10) : '',
                targetType: targetType,
                targetIds: targetIds,
                selection: {
                    categoryIds: targetType === 'Category' ? targetIds : [],
                    subCategoryIds: targetType === 'SubCategory' ? targetIds : [],
                    skuIds: targetType === 'SKU' ? targetIds : []
                },
                rewardType: config.rewardType || 'Fixed',
                rewardValue: config.rewardValue || 0,
                audienceIds: (config.audienceIds || []).map((id: any) => Number(id)),
                geoScope: config.geoScope || { zones: [], states: [], cities: [] },
                maxBudget: scheme.budget || 0,
                maxUsers: config.maxUsers || 0,
                slabConfig: config.slabConfig || {
                    basis: 'SCAN_COUNT',
                    disbursalType: 'REALTIME',
                    slabs: [{ min: 0, max: 0, rewardValue: 0 }]
                },
                crossSellConfig: config.crossSellConfig || {
                    rewardValue: 0,
                    items: [],
                    slabs: [{ rewardValue: 0, items: [] }]
                }
            });
        }
        setEditingSchemeId(scheme.id);
        setIsCreateModalOpen(true);
    };

    const addSlab = () => {
        setFormData({
            ...formData,
            slabConfig: {
                ...formData.slabConfig,
                slabs: [...formData.slabConfig.slabs, { min: 0, max: 0, rewardValue: 0 }]
            }
        });
    };

    const removeSlab = (index: number) => {
        if (formData.slabConfig.slabs.length <= 1) return;
        const newSlabs = formData.slabConfig.slabs.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            slabConfig: {
                ...formData.slabConfig,
                slabs: newSlabs
            }
        });
    };

    const updateSlab = (index: number, field: string, value: any) => {
        const newSlabs = [...formData.slabConfig.slabs];
        newSlabs[index] = { ...newSlabs[index], [field]: value };
        setFormData({
            ...formData,
            slabConfig: {
                ...formData.slabConfig,
                slabs: newSlabs
            }
        });
    };

    const getReadableDiff = (oldS: any, newS: any) => {
        const changes: any[] = [];

        // Flatten oldState if it has the DB structure
        const oldFlat: any = {
            name: oldS.name,
            description: oldS.description,
            startDate: oldS.startDate?.substring(0, 10),
            endDate: oldS.endDate?.substring(0, 10),
            maxBudget: oldS.budget,
            ...(oldS.config?.booster || {})
        };

        // Flatten newState (which is already mostly flat from formData)
        const newFlat: any = { ...newS };

        Object.keys(FIELD_LABELS).forEach(key => {
            const ov = oldFlat[key];
            const nv = newFlat[key];

            // Deep compare for objects/arrays
            if (JSON.stringify(ov) !== JSON.stringify(nv)) {
                changes.push({
                    label: FIELD_LABELS[key],
                    old: ov,
                    new: nv
                });
            }
        });

        return changes;
    };

    const renderValue = (val: any) => {
        if (val === null || val === undefined) return <span className="text-gray-300 italic">None</span>;
        if (typeof val === 'object') {
            if (Array.isArray(val)) {
                if (val.length === 0) return <span className="text-gray-300 italic">Empty</span>;
                return val.join(', ');
            }
            // For geoScope etc
            return Object.entries(val)
                .filter(([_, v]) => Array.isArray(v) && v.length > 0)
                .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${(v as any[]).join(', ')}`)
                .join(' | ');
        }
        return String(val);
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await getSchemeAuditLogsAction();
            if (res.success) {
                setSchemeLogs(res.data || []);
            } else {
                toast.error(res.error || "Failed to fetch logs");
            }
        } catch (err: any) {
            console.error("Fetch logs error:", err);
            toast.error("An unexpected error occurred while fetching logs");
        } finally {
            setLogsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'Scheme Logs') {
            console.log("[SchemesClient] Tab switched to Logs, fetching...");
            fetchLogs();
        }
    }, [activeTab]);

    return (
        <>
            <div className="space-y-8">
                {/* Dashboard Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Live Schemes Card */}
                    <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform duration-500">
                                <i className="fas fa-rocket text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Schemes</p>
                                <h4 className="text-3xl font-black text-gray-800 tracking-tighter">{dashboardStats.liveSchemesCount}</h4>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-green-600 bg-green-50 w-fit px-3 py-1 rounded-full relative z-10">
                            <i className="fas fa-check-circle"></i>
                            <span>Currently Active</span>
                        </div>
                        <i className="fas fa-rocket absolute -right-4 -bottom-4 text-7xl text-gray-50/50 -rotate-12 group-hover:rotate-0 transition-all duration-700"></i>
                    </div>

                    {/* Budget Consumption Card */}
                    <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-500">
                                <i className="fas fa-chart-pie text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Points Distributed</p>
                                <h4 className="text-2xl font-black text-gray-800 tracking-tighter">
                                    {dashboardStats.totalSpent.toLocaleString()} <span className="text-sm text-gray-400">/ {dashboardStats.totalBudget === 0 ? '∞' : dashboardStats.totalBudget.toLocaleString()}</span>
                                </h4>
                            </div>
                        </div>
                        <div className="mt-4 relative z-10">
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                                    style={{ width: `${dashboardStats.totalBudget === 0 ? 100 : Math.min(dashboardStats.efficiency, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <span>Budget Usage</span>
                                <span className="text-blue-600">{dashboardStats.totalBudget === 0 ? 'Unlimited' : `${dashboardStats.efficiency.toFixed(1)}%`}</span>
                            </div>
                        </div>
                    </div>

                    {/* Eligible Users Card */}
                    <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-500">
                                <i className="fas fa-users text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Audience</p>
                                <h4 className="text-3xl font-black text-gray-800 tracking-tighter">{dashboardStats.eligibleUsersCount.toLocaleString()}</h4>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-indigo-600 bg-indigo-50 w-fit px-3 py-1 rounded-full relative z-10">
                            <i className="fas fa-bullseye"></i>
                            <span>Potential Reach</span>
                        </div>
                        <i className="fas fa-users absolute -right-4 -bottom-4 text-7xl text-gray-50/50 -rotate-12 group-hover:rotate-0 transition-all duration-700"></i>
                    </div>

                    {/* Quick Action Card */}
                    <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-[32px] p-6 shadow-lg shadow-red-200 group cursor-pointer active:scale-95 transition-all" onClick={() => setIsCreateModalOpen(true)}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                                <i className="fas fa-plus text-xl"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-red-100 uppercase tracking-widest">New Program</p>
                                <h4 className="text-xl font-black text-white leading-tight">Create New Scheme</h4>
                            </div>
                        </div>
                        <p className="text-xs text-red-100 leading-relaxed font-medium">Launch a new booster or slab-based program to drive sales.</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-[0.2em]">
                            <span>Configure Now</span>
                            <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-gray-100/50 rounded-2xl w-fit border border-gray-200/50 backdrop-blur-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                if (tab === 'Scheme Logs') fetchLogs();
                                if (tab === 'Participation Report') fetchParticipationReport();
                            }}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === tab
                                    ? 'bg-white text-red-600 shadow-sm border border-gray-100'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[600px]">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-white to-gray-50/30">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{activeTab}s</h2>
                            <p className="text-sm text-gray-500 mt-1">Manage your active and upcoming {activeTab.toLowerCase()} programs</p>
                        </div>
                        {!['Participation Report', 'Scheme Logs'].includes(activeTab) && (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-200 transition-all active:scale-95"
                            >
                                <i className="fas fa-plus-circle"></i>
                                Create {activeTab}
                            </button>
                        )}
                    </div>

                    <div className="p-8">
                        {activeTab === 'Booster Scheme' || activeTab === 'Slab Based' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {initialSchemes.filter(s => {
                                    if (activeTab === 'Booster Scheme') return s.schemeType === 'Booster' || !s.schemeType;
                                    if (activeTab === 'Slab Based') return s.schemeType === 'Slab';
                                    if (activeTab === 'Cross-Sell') return s.schemeType === 'CrossSell';
                                    return false;
                                }).map((scheme, i) => (
                                    <div key={scheme.id || i} className="group relative bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-gray-100 transition-all duration-500 border-b-4 border-b-red-500/20">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-red-50 rounded-2xl text-red-600 group-hover:scale-110 transition-transform">
                                                <i className={`fas ${activeTab === 'Slab Based' ? 'fa-layer-group' : activeTab === 'Cross-Sell' ? 'fa-random' : 'fa-rocket'} text-xl`}></i>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${scheme.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {scheme.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-lg leading-tight mb-2">{scheme.name}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-4 h-8">{scheme.description || 'No description provided'}</p>

                                        <div className="space-y-3 pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <i className="far fa-calendar text-gray-400 w-4"></i>
                                                <span className="text-gray-400">Validity:</span>
                                                <span className="text-gray-700">{formatDate(scheme.startDate)} - {formatDate(scheme.endDate)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <i className="fas fa-coins text-red-500 w-4"></i>
                                                <span className="text-gray-400">Reward:</span>
                                                <span className="text-red-600 font-bold">
                                                    {activeTab === 'Booster Scheme' ? (
                                                        <>
                                                            {scheme.config?.booster?.rewardValue}
                                                            {scheme.config?.booster?.rewardType === 'Percentage' ? '%' : ' Pts'} Top-up
                                                        </>
                                                    ) : activeTab === 'Slab Based' ? (
                                                        <>
                                                            {scheme.config?.slab?.slabConfig?.slabs?.length || 0} Tiers ({scheme.config?.slab?.slabConfig?.basis?.replace('_', ' ')})
                                                        </>
                                                    ) : (
                                                        <>
                                                            {(scheme.config?.crossSell?.crossSellConfig?.slabs?.length || 0) > 0
                                                                ? `${scheme.config?.crossSell?.crossSellConfig?.slabs?.length} Slabs`
                                                                : `${scheme.config?.crossSell?.crossSellConfig?.items?.length || 0} Items Combination`}
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleEdit(scheme)}
                                            className="w-full mt-6 py-3 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black hover:bg-red-50 hover:text-red-600 transition-all duration-300 uppercase tracking-widest border border-transparent hover:border-red-100 flex items-center justify-center gap-2"
                                        >
                                            View Details / Edit
                                            <i className="fas fa-chevron-right text-[8px]"></i>
                                        </button>
                                    </div>
                                ))}

                                {initialSchemes.filter(s => {
                                    if (activeTab === 'Booster Scheme') return s.schemeType === 'Booster' || !s.schemeType;
                                    if (activeTab === 'Slab Based') return s.schemeType === 'Slab';
                                    if (activeTab === 'Cross-Sell') return s.schemeType === 'CrossSell';
                                    return false;
                                }).length === 0 && (
                                        <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
                                            <i className="fas fa-gift text-6xl text-gray-300 mb-4"></i>
                                            <p className="text-gray-500 font-medium italic">No {activeTab.toLowerCase()} programs found.</p>
                                        </div>
                                    )}
                            </div>
                        ) : activeTab === 'Cross-Sell' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {initialSchemes.filter(s => s.schemeType === 'CrossSell').map((scheme, i) => (
                                    <div key={scheme.id || i} className="group relative bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-gray-100 transition-all duration-500 border-b-4 border-b-red-500/20">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-red-50 rounded-2xl text-red-600 group-hover:scale-110 transition-transform">
                                                <i className="fas fa-random text-xl"></i>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${scheme.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {scheme.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-lg leading-tight mb-2">{scheme.name}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-4 h-8">{scheme.description || 'No description provided'}</p>

                                        <div className="space-y-3 pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <i className="far fa-calendar text-gray-400 w-4"></i>
                                                <span className="text-gray-400">Validity:</span>
                                                <span className="text-gray-700">{formatDate(scheme.startDate)} - {formatDate(scheme.endDate)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <i className="fas fa-coins text-red-500 w-4"></i>
                                                <span className="text-gray-400">Reward:</span>
                                                <span className="text-red-600 font-bold">
                                                    {(scheme.config?.crossSell?.crossSellConfig?.slabs?.length || 0) > 0
                                                        ? `${scheme.config?.crossSell?.crossSellConfig?.slabs?.length} Achievement Levels`
                                                        : `${scheme.config?.crossSell?.crossSellConfig?.rewardValue || 0} Pts Top-up`}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <i className="fas fa-tags text-gray-400 w-4"></i>
                                                <span className="text-gray-400">Combination:</span>
                                                <span className="text-gray-700 font-bold">{scheme.config?.crossSell?.crossSellConfig?.items?.length || 0} Items</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleEdit(scheme)}
                                            className="w-full mt-6 py-3 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black hover:bg-red-50 hover:text-red-600 transition-all duration-300 uppercase tracking-widest border border-transparent hover:border-red-100 flex items-center justify-center gap-2"
                                        >
                                            View Details / Edit
                                            <i className="fas fa-chevron-right text-[8px]"></i>
                                        </button>
                                    </div>
                                ))}

                                {initialSchemes.filter(s => s.schemeType === 'CrossSell').length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
                                        <i className="fas fa-random text-6xl text-gray-300 mb-4"></i>
                                        <p className="text-gray-500 font-medium italic">No cross-sell programs found.</p>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'Participation Report' ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Scheme Participation Report</h3>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Tracking live progress for Slab & Cross-Sell schemes</p>
                                    </div>
                                    <button 
                                        onClick={fetchParticipationReport}
                                        disabled={reportLoading}
                                        className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-gray-100"
                                    >
                                        <i className={`fas fa-sync-alt ${reportLoading ? 'animate-spin' : ''}`}></i>
                                        Refresh Report
                                    </button>
                                </div>

                                <div className="overflow-x-auto rounded-[32px] border border-gray-100 bg-white shadow-sm overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Participant</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Scheme</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Achievement</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Slab</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Target</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {participationReport.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/30 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-black text-red-600">
                                                                {row.userName?.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-gray-800">{row.userName}</p>
                                                                <p className="text-[9px] font-bold text-gray-400">ID: {row.userId}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <p className="text-[11px] font-bold text-gray-700">{row.schemeName}</p>
                                                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter">ID: {row.schemeId}</p>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${row.schemeType === 'Slab' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                            {row.schemeType}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <p className="text-[12px] font-black text-gray-800">{row.currentValue}</p>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase">{row.basis}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                            {row.currentSlab}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="space-y-1">
                                                            <p className="text-[11px] font-bold text-gray-800">{row.nextSlab}</p>
                                                            <p className="text-[9px] font-bold text-red-500 uppercase tracking-tighter leading-tight max-w-[150px]">
                                                                {row.pendingToNext === 0 ? 'Max Milestone Reached' : `Pending: ${row.pendingToNext}`}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="w-32">
                                                            <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase mb-1">
                                                                <span>Progress</span>
                                                                <span>{row.progress}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-1000 ${Number(row.progress) >= 100 ? 'bg-green-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${row.progress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {participationReport.length === 0 && !reportLoading && (
                                        <div className="p-20 text-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <i className="fas fa-users-slash text-2xl text-gray-200"></i>
                                            </div>
                                            <p className="text-sm font-bold text-gray-400">No participation data found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'Scheme Logs' ? (
                            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Scheme Audit Logs</h3>
                                        <p className="text-xs text-gray-400 font-medium mt-1">History of all scheme creations and modifications</p>
                                    </div>
                                    <button
                                        onClick={fetchLogs}
                                        disabled={logsLoading}
                                        className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
                                    >
                                        <i className={`fas fa-sync-alt text-gray-400 ${logsLoading ? 'animate-spin' : ''}`}></i>
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin</th>
                                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Scheme ID</th>
                                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Changes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {schemeLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-black text-red-600">
                                                                {log.userName?.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-gray-800">{log.userName}</p>
                                                                <p className="text-[9px] font-bold text-gray-400">{log.userEmail}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${log.operation === 'INSERT' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                                                            }`}>
                                                            {log.action?.replace(/_/g, ' ') || log.operation}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-[11px] font-bold text-gray-600">#{log.recordId}</td>
                                                    <td className="px-8 py-5 text-[11px] font-medium text-gray-400">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <button
                                                            className="text-[10px] font-black text-red-600 hover:underline uppercase tracking-widest"
                                                            onClick={() => setSelectedLog(log)}
                                                        >
                                                            View Diff
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {schemeLogs.length === 0 && !logsLoading && (
                                        <div className="p-20 text-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <i className="fas fa-history text-2xl text-gray-200"></i>
                                            </div>
                                            <p className="text-sm font-bold text-gray-400">No logs found for schemes</p>
                                            <button
                                                onClick={fetchLogs}
                                                className="mt-4 text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline"
                                            >
                                                Click here to try again
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-40 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                                    <i className="fas fa-tools text-3xl text-gray-300"></i>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Coming Soon</h3>
                                <p className="text-sm text-gray-500 mt-2">{activeTab} management is currently under development.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 ${activeTab === 'Slab Based' ? 'bg-gray-800' : activeTab === 'Cross-Sell' ? 'bg-indigo-600' : 'bg-red-600'} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200`}>
                                    <i className={`fas ${activeTab === 'Slab Based' ? 'fa-layer-group' : activeTab === 'Cross-Sell' ? 'fa-random' : 'fa-rocket'} text-xl`}></i>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                                        {editingSchemeId ? `Edit ${activeTab}` : `Create ${activeTab}`}
                                    </h2>
                                    <p className="text-sm text-gray-500 font-medium">
                                        {activeTab === 'Slab Based'
                                            ? 'Configure tiered rewards based on volume or points'
                                            : activeTab === 'Cross-Sell'
                                                ? 'Configure rewards for multi-item purchase combinations'
                                                : 'Configure top-up rewards for specific targets'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsCreateModalOpen(false);
                                    setEditingSchemeId(null);
                                }}
                                className="p-2 hover:bg-white rounded-full transition-colors"
                            >
                                <i className="fas fa-times text-gray-400"></i>
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-10 space-y-10">
                            {/* Section 1: Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Scheme Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 font-bold transition-all"
                                        placeholder="e.g. Monsoon Special Booster"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 font-bold"
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">End Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 font-bold"
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Target Selection */}
                            <div className="space-y-6">
                                <label className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                    1. Target Selection (Category &gt; Sub-Category &gt; SKU)
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Categories */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Categories</p>
                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{formData.selection.categoryIds.length}</span>
                                        </div>
                                        <div className="relative mb-2 mt-1">
                                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]"></i>
                                            <input
                                                type="text"
                                                placeholder="Search Category..."
                                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                                                value={searchTerms.category}
                                                onChange={e => setSearchTerms({ ...searchTerms, category: e.target.value })}
                                            />
                                        </div>
                                        <div className="h-[450px] overflow-y-auto p-2 bg-gray-50 rounded-3xl border border-gray-100 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-200">
                                            {filteredCategories.map((item: any) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => toggleSelection('category', item.id)}
                                                    className={`w-full p-3 rounded-xl text-left transition-all duration-200 border-2 ${formData.selection.categoryIds.includes(item.id)
                                                            ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                                                            : 'bg-white border-transparent text-gray-600 hover:border-gray-200'
                                                        }`}
                                                >
                                                    <p className="text-[10px] font-black uppercase truncate">{item.name}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sub-Categories */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Sub-Categories</p>
                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{formData.selection.subCategoryIds.length}</span>
                                        </div>
                                        <div className="relative mb-2 mt-1">
                                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]"></i>
                                            <input
                                                type="text"
                                                placeholder="Search Sub-Category..."
                                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                                                value={searchTerms.subCategory}
                                                onChange={e => setSearchTerms({ ...searchTerms, subCategory: e.target.value })}
                                            />
                                        </div>
                                        <div className="h-[450px] overflow-y-auto p-2 rounded-3xl border space-y-1.5 transition-all bg-gray-50 border-gray-100 scrollbar-thin scrollbar-thumb-gray-200">
                                            {filteredSubCategories.map((item: any) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => toggleSelection('subCategory', item.id)}
                                                    className={`w-full p-3 rounded-xl text-left transition-all duration-200 border-2 ${formData.selection.subCategoryIds.includes(item.id)
                                                            ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                                                            : 'bg-white border-transparent text-gray-600 hover:border-gray-200'
                                                        }`}
                                                >
                                                    <p className="text-[10px] font-black uppercase truncate">{item.name}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SKUs */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">SKUs</p>
                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{formData.selection.skuIds.length}</span>
                                        </div>
                                        <div className="relative mb-2 mt-1">
                                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]"></i>
                                            <input
                                                type="text"
                                                placeholder="Search SKU..."
                                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                                                value={searchTerms.sku}
                                                onChange={e => setSearchTerms({ ...searchTerms, sku: e.target.value })}
                                            />
                                        </div>
                                        <div className="h-[450px] overflow-y-auto p-2 rounded-3xl border space-y-1.5 transition-all bg-gray-50 border-gray-100 scrollbar-thin scrollbar-thumb-gray-200">
                                            {filteredSkus.map((item: any) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => toggleSelection('sku', item.id)}
                                                    className={`w-full p-3 rounded-xl text-left transition-all duration-200 border-2 ${formData.selection.skuIds.includes(item.id)
                                                            ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                                                            : 'bg-white border-transparent text-gray-600 hover:border-gray-200'
                                                        }`}
                                                >
                                                    <p className="text-[10px] font-black uppercase truncate">{item.name}</p>
                                                    {item.skuCode && <p className="text-[8px] opacity-60 mt-0.5">{item.skuCode}</p>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3 & 4: Reward & Limits */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
                                {activeTab === 'Booster Scheme' ? (
                                    <div className="md:col-span-2 p-8 bg-gradient-to-br from-red-600 to-red-700 rounded-[32px] text-white shadow-xl shadow-red-200">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-white/90">2. Reward Config</h3>
                                            <div className="flex bg-white/20 p-1 rounded-xl">
                                                {['Fixed', 'Percentage'].map(r => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, rewardType: r as any })}
                                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.rewardType === r ? 'bg-white text-red-600 shadow-md' : 'text-white/80'}`}
                                                    >
                                                        {r === 'Fixed' ? 'Direct Amount' : '% of Base'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="flex-1">
                                                <input
                                                    type="number"
                                                    className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-4 text-3xl font-black text-white focus:ring-0 focus:border-white transition-all placeholder:text-white/30"
                                                    placeholder="0.00"
                                                    value={formData.rewardValue || ''}
                                                    onChange={e => setFormData({ ...formData, rewardValue: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div className="text-4xl font-black opacity-40 text-white">
                                                {formData.rewardType === 'Percentage' ? '%' : 'PTS'}
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold mt-4 text-white/70 italic">* This reward will be added as a top-up on top of the base points.</p>
                                    </div>
                                ) : activeTab === 'Cross-Sell' ? (
                                    <div className="md:col-span-2 space-y-8">
                                        {(formData.crossSellConfig?.slabs || []).map((slab, slabIndex) => (
                                            <div key={slabIndex} className="bg-indigo-900 rounded-[32px] p-8 shadow-xl shadow-indigo-200 text-white relative">
                                                {(formData.crossSellConfig?.slabs || []).length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newSlabs = [...formData.crossSellConfig.slabs];
                                                            newSlabs.splice(slabIndex, 1);
                                                            setFormData({
                                                                ...formData,
                                                                crossSellConfig: { ...formData.crossSellConfig, slabs: newSlabs }
                                                            });
                                                        }}
                                                        className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                )}

                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl font-black">
                                                        {slabIndex + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-bold">Achievement Slab {slabIndex + 1}</h4>
                                                        <p className="text-indigo-200 text-sm">Define thresholds for this reward level</p>
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-8">
                                                    <div className="space-y-6">
                                                        <label className="block text-sm font-bold text-indigo-200 uppercase tracking-wider">Item Thresholds (Min Scans)</label>
                                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {(formData.selection.skuIds.length > 0 ? formData.selection.skuIds :
                                                                formData.selection.subCategoryIds.length > 0 ? formData.selection.subCategoryIds :
                                                                    formData.selection.categoryIds).map(id => {
                                                                        const isSku = formData.selection.skuIds.length > 0;
                                                                        const isSubCat = formData.selection.subCategoryIds.length > 0;

                                                                        const itemData = isSku
                                                                            ? (masterData.skus || []).find((v: any) => v.id === id)
                                                                            : isSubCat
                                                                                ? (masterData.subCategories || []).find((e: any) => e.id === id)
                                                                                : (masterData.categories || []).find((e: any) => e.id === id);

                                                                        const existingItem = (slab.items || []).find(i => i.id === id);

                                                                        return (
                                                                            <div key={id} className="grid grid-cols-[1fr_100px] items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                                                                                <div className="min-w-0">
                                                                                    <p className="font-bold truncate text-sm text-white">
                                                                                        {itemData?.name || `Item #${id}`}
                                                                                    </p>
                                                                                    <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">
                                                                                        Target {isSku ? 'SKU' : isSubCat ? 'Sub-Category' : 'Category'}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="flex flex-col items-end gap-1">
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        value={existingItem?.minScans ?? 0}
                                                                                        onChange={(e) => {
                                                                                            const val = parseInt(e.target.value) || 0;
                                                                                            const newSlabs = [...(formData.crossSellConfig?.slabs || [])];
                                                                                            const items = [...(newSlabs[slabIndex]?.items || [])];
                                                                                            const itemIdx = items.findIndex(i => i.id === id);
                                                                                            if (itemIdx > -1) {
                                                                                                items[itemIdx] = { ...items[itemIdx], minScans: val };
                                                                                            } else {
                                                                                                items.push({ id, minScans: val });
                                                                                            }
                                                                                            newSlabs[slabIndex] = { ...newSlabs[slabIndex], items };
                                                                                            setFormData({ ...formData, crossSellConfig: { ...formData.crossSellConfig, slabs: newSlabs } });
                                                                                        }}
                                                                                        className="w-full bg-white border-2 border-indigo-400/30 rounded-xl px-3 py-1.5 text-right font-black text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner text-xs"
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <span className="text-[8px] font-black text-indigo-300 uppercase tracking-tighter">Min Scans</span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col justify-center space-y-6">
                                                        <div className="p-8 bg-white/10 rounded-[32px] border border-white/20 backdrop-blur-md">
                                                            <label className="block text-sm font-bold text-indigo-200 uppercase tracking-wider mb-4">Top-up Reward Points</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={slab.rewardValue ?? 0}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        const newSlabs = [...(formData.crossSellConfig?.slabs || [])];
                                                                        newSlabs[slabIndex] = { ...newSlabs[slabIndex], rewardValue: val };
                                                                        setFormData({ ...formData, crossSellConfig: { ...formData.crossSellConfig, slabs: newSlabs } });
                                                                    }}
                                                                    className="w-full bg-white border-2 border-indigo-400/30 rounded-2xl px-6 py-4 text-3xl font-black text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-indigo-200 shadow-inner"
                                                                    placeholder="0"
                                                                />
                                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-300 font-bold">PTS</div>
                                                            </div>
                                                            <p className="mt-4 text-xs text-indigo-300 italic">This reward is given once all item thresholds above are met.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const targetIds = formData.selection.skuIds.length > 0 ? formData.selection.skuIds :
                                                    formData.selection.subCategoryIds.length > 0 ? formData.selection.subCategoryIds :
                                                        formData.selection.categoryIds;

                                                setFormData({
                                                    ...formData,
                                                    crossSellConfig: {
                                                        ...formData.crossSellConfig,
                                                        slabs: [
                                                            ...formData.crossSellConfig.slabs,
                                                            {
                                                                rewardValue: 0,
                                                                items: targetIds.map(id => ({ id, minScans: 0 }))
                                                            }
                                                        ]
                                                    }
                                                });
                                            }}
                                            className="w-full py-6 border-2 border-dashed border-indigo-200 rounded-[32px] text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-3"
                                        >
                                            <i className="fas fa-plus-circle text-xl"></i>
                                            Add Achievement Slab
                                        </button>
                                    </div>
                                ) : (
                                    <div className="md:col-span-2 space-y-8 bg-gray-900 rounded-[32px] p-8 shadow-xl shadow-gray-200 text-white">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-white/90">2. Slab Config</h3>
                                            <button
                                                type="button"
                                                onClick={addSlab}
                                                className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-300"
                                            >
                                                + Add Tier
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Slab Basis</label>
                                                <div className="flex gap-4 p-1 bg-white/5 rounded-2xl border border-white/10">
                                                    {[
                                                        { id: 'SCAN_COUNT', label: 'No of Scans' },
                                                        { id: 'POINTS_EARNED', label: 'Points Earned' }
                                                    ].map(basis => (
                                                        <button
                                                            key={basis.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, slabConfig: { ...formData.slabConfig, basis: basis.id as any } })}
                                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.slabConfig.basis === basis.id ? 'bg-white text-gray-900 shadow-lg' : 'text-white/40 hover:text-white'
                                                                }`}
                                                        >
                                                            {basis.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Disbursal</label>
                                                <div className="flex gap-4 p-1 bg-white/5 rounded-2xl border border-white/10">
                                                    {[
                                                        { id: 'REALTIME', label: 'Realtime' },
                                                        { id: 'SCHEME_END', label: 'At End' }
                                                    ].map(type => (
                                                        <button
                                                            key={type.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, slabConfig: { ...formData.slabConfig, disbursalType: type.id as any } })}
                                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.slabConfig.disbursalType === type.id ? 'bg-red-600 text-white shadow-lg' : 'text-white/40 hover:text-white'
                                                                }`}
                                                        >
                                                            {type.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {formData.slabConfig.slabs.map((slab, index) => (
                                                <div key={index} className="grid grid-cols-4 gap-4 p-5 bg-white/5 rounded-2xl border border-white/10 group animate-in slide-in-from-right-2">
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-black text-white/30 uppercase ml-1">Min {formData.slabConfig.basis === 'SCAN_COUNT' ? 'Scans' : 'Points'}</p>
                                                        <input
                                                            type="number"
                                                            value={slab.min}
                                                            onChange={e => updateSlab(index, 'min', Number(e.target.value))}
                                                            className="w-full px-4 py-2 bg-white/10 border-none rounded-xl text-xs font-bold text-white focus:ring-1 focus:ring-red-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-black text-white/30 uppercase ml-1">Max {formData.slabConfig.basis === 'SCAN_COUNT' ? 'Scans' : 'Points'}</p>
                                                        <input
                                                            type="number"
                                                            value={slab.max}
                                                            onChange={e => updateSlab(index, 'max', Number(e.target.value))}
                                                            className="w-full px-4 py-2 bg-white/10 border-none rounded-xl text-xs font-bold text-white focus:ring-1 focus:ring-red-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-black text-white/30 uppercase ml-1">Bonus</p>
                                                        <input
                                                            type="number"
                                                            value={slab.rewardValue}
                                                            onChange={e => updateSlab(index, 'rewardValue', Number(e.target.value))}
                                                            className="w-full px-4 py-2 bg-white/10 border-none rounded-xl text-xs font-bold text-white focus:ring-1 focus:ring-red-500"
                                                        />
                                                    </div>
                                                    <div className="flex items-end justify-center pb-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSlab(index)}
                                                            className="w-8 h-8 rounded-lg bg-white/5 text-white/20 hover:bg-red-500/20 hover:text-red-500 transition-colors"
                                                        >
                                                            <i className="fas fa-trash-alt text-[10px]"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                            3. Audience & Limits
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {(masterData.userTypes || [])
                                                .filter((ut: any) => ['retailer', 'mechanic'].includes(ut.name.toLowerCase()))
                                                .map((ut: any) => (
                                                    <button
                                                        key={ut.id}
                                                        type="button"
                                                        onClick={() => toggleAudienceId(ut.id)}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border-2 ${formData.audienceIds.includes(ut.id)
                                                                ? 'bg-gray-800 border-gray-800 text-white shadow-lg'
                                                                : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        {ut.name}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Points Budget</label>
                                            <input
                                                type="number"
                                                placeholder="Unlimited"
                                                className="w-full px-6 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-500"
                                                value={formData.maxBudget || ''}
                                                onChange={e => setFormData({ ...formData, maxBudget: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">User Limit</label>
                                            <input
                                                type="number"
                                                placeholder="Unlimited"
                                                className="w-full px-6 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-500"
                                                value={formData.maxUsers || ''}
                                                onChange={e => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Geography */}
                            <div className="space-y-6">
                                <label className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                    5. Geographical Scope
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-gray-50 rounded-[32px] border border-gray-100">
                                    {/* Zones */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase ml-1">Zones</p>
                                        </div>
                                        <div className="relative mb-2">
                                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]"></i>
                                            <input
                                                type="text"
                                                placeholder="Search Zone..."
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                                                value={searchTerms.zone}
                                                onChange={e => setSearchTerms({ ...searchTerms, zone: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 bg-white rounded-2xl border border-gray-100">
                                            {filteredZones.map((z: string, idx: number) => (
                                                <button key={`${z}-${idx}`} type="button" onClick={() => toggleGeo('zones', z)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.geoScope.zones.includes(z) ? 'bg-red-500 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                                    {z}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* States */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase ml-1">States</p>
                                        </div>
                                        <div className="relative mb-2">
                                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]"></i>
                                            <input
                                                type="text"
                                                placeholder="Search State..."
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                                                value={searchTerms.state}
                                                onChange={e => setSearchTerms({ ...searchTerms, state: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 bg-white rounded-2xl border border-gray-100">
                                            {filteredStates.map((s: any, idx: number) => (
                                                <button key={`${s.name}-${idx}`} type="button" onClick={() => toggleGeo('states', s.name)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.geoScope.states.includes(s.name) ? 'bg-red-500 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                                    {s.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Cities */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase ml-1">Cities</p>
                                        </div>
                                        <div className="relative mb-2">
                                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]"></i>
                                            <input
                                                type="text"
                                                placeholder="Search City..."
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                                                value={searchTerms.city}
                                                onChange={e => setSearchTerms({ ...searchTerms, city: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 bg-white rounded-2xl border border-gray-100">
                                            {filteredCities.map((c: any, idx: number) => (
                                                <button key={`${c.name}-${idx}`} type="button" onClick={() => toggleGeo('cities', c.name)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.geoScope.cities.includes(c.name) ? 'bg-red-500 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-8 border-t border-gray-100 flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-8 py-4 text-gray-500 font-bold hover:text-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-red-600 text-white rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
                                >
                                    {loading ? (editingSchemeId ? 'Updating...' : 'Creating...') : (editingSchemeId ? 'Save Changes' : 'Launch Scheme')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Diff Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                    <i className="fas fa-history text-xl"></i>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Change Details</h2>
                                    <p className="text-sm text-gray-500 font-medium">Comparing version #{selectedLog.id} for Scheme #{selectedLog.recordId}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                                <i className="fas fa-times text-gray-400"></i>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 px-6 py-3 bg-gray-50 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <div>Field</div>
                                    <div>Original Value</div>
                                    <div>Updated To</div>
                                </div>
                                <div className="space-y-2">
                                    {getReadableDiff(selectedLog.oldState, selectedLog.newState).map((change, idx) => (
                                        <div key={idx} className="grid grid-cols-3 gap-4 px-6 py-5 bg-white border border-gray-100 rounded-3xl items-center hover:border-red-100 transition-colors group">
                                            <div className="text-[11px] font-black text-gray-800">{change.label}</div>
                                            <div className="text-[11px] font-medium text-gray-500 line-clamp-2">{renderValue(change.old)}</div>
                                            <div className="flex items-center gap-3">
                                                <i className="fas fa-arrow-right text-[10px] text-red-300"></i>
                                                <div className="text-[11px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl">{renderValue(change.new)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {getReadableDiff(selectedLog.oldState, selectedLog.newState).length === 0 && (
                                        <div className="p-20 text-center opacity-40">
                                            <p className="text-sm font-bold text-gray-400 italic">No field-level changes detected</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-8 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-black text-gray-600 uppercase tracking-widest hover:bg-gray-50 transition-all"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
