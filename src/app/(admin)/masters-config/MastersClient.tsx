'use client';

import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { ChevronDown, ChevronRight, Edit, Delete } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMastersDataAction, updateStakeholderConfigAction, upsertPointsMatrixRuleAction, upsertSkuPointConfigAction, updateSkuPointConfigForEntityAction, type SkuNode, deletePointsMatrixRuleAction } from '@/actions/masters-actions';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
    const { children, value, index } = props;
    return value === index ? <>{children}</> : null;
}

function TreeView({ data, onSelect, selectedId }: { data: SkuNode[]; onSelect?: (id: string) => void; selectedId?: string | null }) {
    const [open, setOpen] = useState<{ [key: string]: boolean }>({});

    const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

    const RenderNode = ({ node, path }: { node: SkuNode; path: string }) => {
        const hasChildren = node.children && node.children.length > 0;
        const icon = hasChildren ? (
            <i className="fas fa-folder text-blue-500 mr-2" />
        ) : (
            <i className="fas fa-file text-gray-500 mr-2" />
        );

        const isSelected = selectedId === node.id;

        return (
            <li>
                <div
                    className={`flex items-center py-1 px-2 cursor-pointer rounded ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                    onClick={() => {
                        if (hasChildren) toggle(path);
                        onSelect && onSelect(node.id);
                    }}
                >
                    {hasChildren ? (
                        <span className="mr-1">
                            {open[path] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </span>
                    ) : (
                        <span className="w-5" />
                    )}
                    {icon}
                    <span className="ml-2 text-sm">{node.label}</span>
                    <span className="ml-auto mr-2">
                        <span className="text-xs px-2 py-0.5 rounded-full border border-blue-400 text-blue-600">{node.levelName}</span>
                    </span>
                </div>
                {hasChildren && open[path] && (
                    <ul className="ml-6">
                        {node.children!.map((child) => (
                            <RenderNode key={child.id} node={child} path={`${path}-${child.id}`} />
                        ))}
                    </ul>
                )}
            </li>
        );
    };

    return (
        <ul className="space-y-1">
            {data.map((node) => (
                <RenderNode key={node.id} node={node} path={node.id} />
            ))}
        </ul>
    );
}

const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function MastersClient() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['masters-data'],
        queryFn: getMastersDataAction
    });

    const [tab, setTab] = useState(0);
    const queryClient = useQueryClient();
    const tabLabels = ['Stakeholder Master', 'SKU Master', 'Points Matrix', 'Target Master'];

    // Stakeholder config form state
    const [selectedStakeholderId, setSelectedStakeholderId] = useState<string | null>(null);
    const [stakeholderMaxDailyScans, setStakeholderMaxDailyScans] = useState<number>(50);
    const [stakeholderKycLevel, setStakeholderKycLevel] = useState<string>('Basic');
    const [stakeholderChannelIds, setStakeholderChannelIds] = useState<number[]>([]);
    const [stakeholderSaveStatus, setStakeholderSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const stakeholderMutation = useMutation({
        mutationFn: (payload: Parameters<typeof updateStakeholderConfigAction>[0]) => updateStakeholderConfigAction(payload),
        onMutate: () => setStakeholderSaveStatus('saving'),
        onSuccess: () => {
            setStakeholderSaveStatus('success');
            queryClient.invalidateQueries({ queryKey: ['masters-data'] });
            setTimeout(() => setStakeholderSaveStatus('idle'), 2000);
        },
        onError: () => {
            setStakeholderSaveStatus('error');
            setTimeout(() => setStakeholderSaveStatus('idle'), 2000);
        }
    });

    // SKU Points form state
    const [skuStakeholder, setSkuStakeholder] = useState<string>('All');
    const [skuCategory, setSkuCategory] = useState<string>('Electrical Products');
    const [skuSubCategory, setSkuSubCategory] = useState<string>('Wires & Cables');
    const [skuGroup, setSkuGroup] = useState<string>('Household Wires');
    const [pointsPerScan, setPointsPerScan] = useState<number>(10);
    const [maxScansPerDay, setMaxScansPerDay] = useState<number>(5);
    const [validFrom, setValidFrom] = useState<string>('');
    const [validTo, setValidTo] = useState<string>('');
    const [isActive, setIsActive] = useState<boolean>(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    // Points Matrix (Rule) form state
    const [pmRuleId, setPmRuleId] = useState<number | null>(null);
    const [pmName, setPmName] = useState<string>('');
    const [pmClientId, setPmClientId] = useState<number>(1);
    const [pmUserTypeId, setPmUserTypeId] = useState<number | 'All'>('All');
    const [pmSkuEntityId, setPmSkuEntityId] = useState<number | null>(null);
    const [pmSkuDropdownOpen, setPmSkuDropdownOpen] = useState(false);
    const [pmSkuEntitySearch, setPmSkuEntitySearch] = useState('');
    const [pmSkuVariantId, setPmSkuVariantId] = useState<number | null>(null);
    const [pmActionType, setPmActionType] = useState<string>('FLAT_OVERRIDE');
    const [pmActionValue, setPmActionValue] = useState<number>(10);
    const [pmValidFrom, setPmValidFrom] = useState<string>('');
    const [pmValidTo, setPmValidTo] = useState<string>('');
    const [pmIsActive, setPmIsActive] = useState<boolean>(true);
    const [pmDescription, setPmDescription] = useState<string>('');
    const [pmSaveStatus, setPmSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    const pointsRuleMutation = useMutation({
        mutationFn: (payload: Parameters<typeof upsertPointsMatrixRuleAction>[0]) => upsertPointsMatrixRuleAction(payload),
        onMutate: () => setPmSaveStatus('saving'),
        onSuccess: () => {
            setPmSaveStatus('success');
            queryClient.invalidateQueries({ queryKey: ['masters-data'] });
            setTimeout(() => setPmSaveStatus('idle'), 2000);
        },
        onError: () => {
            setPmSaveStatus('error');
            setTimeout(() => setPmSaveStatus('idle'), 2000);
        }
    });

    const skuConfigMutation = useMutation({
        mutationFn: (payload: Parameters<typeof updateSkuPointConfigForEntityAction>[0]) => updateSkuPointConfigForEntityAction(payload),
        onMutate: () => setSaveStatus('saving'),
        onSuccess: () => {
            setSaveStatus('success');
            queryClient.invalidateQueries({ queryKey: ['masters-data'] });
            setTimeout(() => setSaveStatus('idle'), 2000);
        },
        onError: () => {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    });

    const deleteRuleMutation = useMutation({
        mutationFn: (id: number) => deletePointsMatrixRuleAction(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['masters-data'] });
        }
    });

    const updateBasePointsMutation = useMutation({
        mutationFn: (payload: Parameters<typeof upsertSkuPointConfigAction>[0]) => upsertSkuPointConfigAction(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['masters-data'] });
            setEditModalOpen(false);
        }
    });

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedRule, setSelectedRule] = useState<any>(null);
    const [editBasePoints, setEditBasePoints] = useState<number>(0);
    const [editBaseMaxScans, setEditBaseMaxScans] = useState<number>(5);

    // Level color styles for L1–L6 SKU hierarchy (depth 0 = L1)
    const SKU_LEVEL_STYLES = [
        { badge: 'bg-indigo-100 text-indigo-700 border border-indigo-300', bar: 'bg-indigo-500', rowHover: 'hover:bg-indigo-50', rowSelected: 'bg-indigo-50' },  // L1
        { badge: 'bg-blue-100 text-blue-700 border border-blue-300',   bar: 'bg-blue-500',   rowHover: 'hover:bg-blue-50',   rowSelected: 'bg-blue-50'   },  // L2
        { badge: 'bg-cyan-100 text-cyan-700 border border-cyan-300',   bar: 'bg-cyan-400',   rowHover: 'hover:bg-cyan-50',   rowSelected: 'bg-cyan-50'   },  // L3
        { badge: 'bg-teal-100 text-teal-700 border border-teal-300',   bar: 'bg-teal-400',   rowHover: 'hover:bg-teal-50',   rowSelected: 'bg-teal-50'   },  // L4
        { badge: 'bg-green-100 text-green-700 border border-green-300', bar: 'bg-green-500', rowHover: 'hover:bg-green-50',  rowSelected: 'bg-green-50'  },  // L5
        { badge: 'bg-amber-100 text-amber-700 border border-amber-300', bar: 'bg-amber-500', rowHover: 'hover:bg-amber-50',  rowSelected: 'bg-amber-50'  },  // L6
    ];

    // flatten skuHierarchy for selection (id, label, depth)
    const flatten = (nodes: any[], depth = 0, out: { id: string; label: string; depth: number; levelName: string; code?: string }[] = []) => {
        for (const n of nodes) {
            out.push({ id: n.id, label: n.label, depth, levelName: n.levelName, code: n.code });
            if (n.children && n.children.length) flatten(n.children, depth + 1, out);
        }
        return out;
    };

    const flattenedEntities = flatten(data?.skuHierarchy || []);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(flattenedEntities[0]?.id || null);

    if (isLoading) return (
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
    if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">Failed to load configuration data</div>;

    // Filter stakeholder types to only show Electrician, Retailer, and Counter Staffs
    const allowedStakeholderNames = ['Electrician', 'Retailer', 'Counter Staffs'];
    const stakeholderTypes = useMemo(() => {
        return (data?.stakeholderTypes || []).filter((s: any) => 
            allowedStakeholderNames.some(name => 
                s.name?.toLowerCase().includes(name.toLowerCase()) ||
                s.code?.toLowerCase().includes(name.toLowerCase())
            )
        );
    }, [data?.stakeholderTypes]);
    const pointsMatrix = data?.pointsMatrix || [];

    useEffect(() => {
        if (!selectedStakeholderId && stakeholderTypes.length > 0) {
            setSelectedStakeholderId(stakeholderTypes[0].id);
        }
    }, [stakeholderTypes, selectedStakeholderId]);

    useEffect(() => {
        if (selectedStakeholderId) {
            const s = stakeholderTypes.find(st => st.id === selectedStakeholderId);
            if (s) {
                setStakeholderMaxDailyScans(s.maxDailyScans || 50);
                setStakeholderKycLevel(s.requiredKycLevel || 'Basic');
                const channels = s.allowedRedemptionChannels || [];
                setStakeholderChannelIds(channels.map((c) => Number(c)));
            }
        }
    }, [selectedStakeholderId, stakeholderTypes]);

    return (
        <main className="flex-1 overflow-y-auto p-6">
            {/* ---------- Tabs ---------- */}
            <div className="tabs mb-6">
                {tabLabels.map((label, i) => (
                    <button key={label} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{label}</button>
                ))}
            </div>

            {/* ---------- Stakeholder Tab ---------- */}
            <TabPanel value={tab} index={0}>
                <div className="space-y-6">
                    {/* Stakeholder Types Table */}
                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Stakeholder Types</h3>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                                    <i className="fas fa-download text-xs"></i> Export
                                </button>
                                <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                                    <i className="fas fa-upload text-xs"></i> Import
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Type ID</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Type Name</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Max Daily Scans</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">KYC Level</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stakeholderTypes.map((row) => (
                                        <tr key={row.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 text-sm text-gray-600">{row.id}</td>
                                            <td className="py-3 text-sm text-gray-600">{row.code || row.name}</td>
                                            <td className="py-3 text-sm text-gray-600">{row.desc}</td>
                                            <td className="py-3 text-sm text-gray-600">{row.maxDailyScans}</td>
                                            <td className="py-3 text-sm text-gray-600">{row.requiredKycLevel}</td>
                                            <td className="py-3 text-sm">
                                                <span className={`badge ${row.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>{row.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Config + Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Config Form */}
                        <div className="widget-card rounded-xl shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stakeholder Configuration</h3>
                            <form className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stakeholder Type</label>
                                    <select value={selectedStakeholderId || ''} onChange={(e) => setSelectedStakeholderId(e.target.value)} className={selectClass}>
                                        {stakeholderTypes.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Daily Scans</label>
                                    <input type="number" value={stakeholderMaxDailyScans} onChange={(e) => setStakeholderMaxDailyScans(Number(e.target.value))} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Required KYC Level</label>
                                    <select value={stakeholderKycLevel} onChange={(e) => setStakeholderKycLevel(e.target.value)} className={selectClass}>
                                        <option value="Basic">Basic</option>
                                        <option value="Standard">Standard</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500">Allowed Redemption Channels</p>
                                    {(data?.redemptionChannels || []).map((ch: any) => (
                                        <label key={ch.id} className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" checked={stakeholderChannelIds.includes(Number(ch.id))} onChange={(e) => {
                                                setStakeholderChannelIds((prev) => {
                                                    const id = Number(ch.id);
                                                    if (e.target.checked) return Array.from(new Set([...prev, id]));
                                                    return prev.filter((x) => x !== id);
                                                });
                                            }} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                            {ch.name}
                                        </label>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-2 items-center">
                                    <button type="button" className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50" onClick={() => {
                                        if (selectedStakeholderId) {
                                            const s = stakeholderTypes.find(st => st.id === selectedStakeholderId);
                                            if (s) {
                                                setStakeholderMaxDailyScans(s.maxDailyScans || 50);
                                                setStakeholderKycLevel(s.requiredKycLevel || 'Basic');
                                                const channels = s.allowedRedemptionChannels || [];
                                                setStakeholderChannelIds(channels.map((c: any) => Number(c)));
                                            }
                                        }
                                    }}>Cancel</button>
                                    <button type="button" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50" onClick={() => {
                                        if (!selectedStakeholderId) return;
                                        setConfirmOpen(true);
                                    }} disabled={stakeholderMutation.isPending}>
                                        {stakeholderMutation.isPending ? 'Saving...' : 'Save Configuration'}
                                    </button>
                                    {stakeholderSaveStatus === 'success' && <span className="text-sm text-green-600 ml-2">Saved</span>}
                                    {stakeholderSaveStatus === 'error' && <span className="text-sm text-red-600 ml-2">Save failed</span>}
                                </div>

                                {/* Confirm Dialog */}
                                {confirmOpen && (
                                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Confirm Save</h4>
                                            <p className="text-sm text-gray-600 mb-4">Are you sure you want to save changes to this stakeholder configuration?</p>
                                            <div className="flex justify-end gap-2">
                                                <button type="button" className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50" onClick={() => setConfirmOpen(false)}>Cancel</button>
                                                <button type="button" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50" onClick={() => {
                                                    if (!selectedStakeholderId) return;
                                                    stakeholderMutation.mutate({
                                                        id: Number(selectedStakeholderId),
                                                        maxDailyScans: stakeholderMaxDailyScans,
                                                        requiredKycLevel: stakeholderKycLevel,
                                                        allowedRedemptionChannels: stakeholderChannelIds
                                                    });
                                                    setConfirmOpen(false);
                                                }} disabled={stakeholderMutation.isPending}>
                                                    {stakeholderMutation.isPending ? 'Saving...' : 'Confirm'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Statistics */}
                        <div className="widget-card rounded-xl shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stakeholder Statistics</h3>
                            <div className="space-y-4">
                                {[
                                    { label: 'Total Retailers', value: '8,234', percent: 65 },
                                    { label: 'Total CSBs', value: '2,145', percent: 17 },
                                    { label: 'Total Electricians', value: '2,077', percent: 16 },
                                    { label: 'Total Distributors', value: '120', percent: 1 },
                                ].map((s) => (
                                    <div key={s.label}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm">{s.label}</span>
                                            <span className="font-medium">{s.value}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${s.percent}%` }} />
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-6 space-y-2">
                                    <div className="flex items-center text-sm">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                                        125 new retailers added this week
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                                        32 CSBs upgraded to premium tier
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                                        15 electricians pending KYC verification
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </TabPanel>

            {/* ---------- SKU Tab ---------- */}
            <TabPanel value={tab} index={1}>
                <div className="space-y-6">
                    {/* SKU Hierarchy Tree */}
                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">SKU Hierarchy</h3>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                                    <ChevronDown className="w-4 h-4" /> Expand All
                                </button>
                                <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                                    <ChevronRight className="w-4 h-4" /> Collapse All
                                </button>
                            </div>
                        </div>
                        <TreeView data={data?.skuHierarchy || []} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* SKU Points Config */}
                        <div className="widget-card rounded-xl shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">SKU Points Configuration</h3>
                            <form className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stakeholder Type</label>
                                    <select value={skuStakeholder} onChange={(e) => setSkuStakeholder(e.target.value)} className={selectClass}>
                                        <option value="All">All Stakeholders</option>
                                        {stakeholderTypes.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apply To Entity</label>
                                    <div className="max-h-[260px] overflow-auto border border-gray-200 rounded-lg p-2">
                                        <TreeView data={data?.skuHierarchy || []} selectedId={selectedEntityId} onSelect={(id) => setSelectedEntityId(id)} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Selected: {selectedEntityId ? (flattenedEntities.find(f => f.id === selectedEntityId)?.label || selectedEntityId) : 'None'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Points per Scan</label>
                                    <input type="number" value={pointsPerScan} onChange={(e) => setPointsPerScan(Number(e.target.value))} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Scans per Day</label>
                                    <input type="number" value={maxScansPerDay} onChange={(e) => setMaxScansPerDay(Number(e.target.value))} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                                    <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label>
                                    <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className={inputClass} />
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    Active
                                </label>
                                <div className="flex justify-end gap-2 items-center">
                                    <button type="button" className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50" onClick={() => {
                                        setSkuStakeholder('All');
                                        setSkuCategory('Electrical Products');
                                        setSkuSubCategory('Wires & Cables');
                                        setSkuGroup('Household Wires');
                                        setPointsPerScan(10);
                                        setMaxScansPerDay(5);
                                        setValidFrom('');
                                        setValidTo('');
                                        setIsActive(true);
                                    }}>Cancel</button>
                                    <button type="button" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50" onClick={() => {
                                        skuConfigMutation.mutate({
                                            clientId: 1,
                                            userTypeId: skuStakeholder === 'All' ? undefined : Number(skuStakeholder),
                                            entityId: Number(selectedEntityId),
                                            pointsPerUnit: pointsPerScan,
                                            maxScansPerDay: maxScansPerDay,
                                            validFrom: validFrom || undefined,
                                            validTo: validTo || undefined,
                                            isActive: isActive
                                        });
                                    }} disabled={skuConfigMutation.isPending}>
                                        {skuConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                                    </button>
                                    {saveStatus === 'success' && <span className="text-sm text-green-600 ml-2">Saved</span>}
                                    {saveStatus === 'error' && <span className="text-sm text-red-600 ml-2">Save failed</span>}
                                </div>
                            </form>
                        </div>

                        {/* SKU Performance Chart */}
                        <div className="widget-card rounded-xl shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">SKU Performance</h3>
                            <div className="h-64">
                                <Bar
                                    data={{
                                        labels: (data?.topSkus || []).map(s => s.name),
                                        datasets: [
                                            {
                                                label: 'Scans',
                                                data: (data?.topSkus || []).map(s => s.scans),
                                                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'],
                                                borderRadius: 5,
                                            },
                                        ],
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                    }}
                                />
                            </div>
                            <div className="mt-4 space-y-2">
                                {(data?.topSkus || []).map((i) => (
                                    <div key={i.name} className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-sm">{i.name}</p>
                                            <p className="text-xs text-gray-500">{i.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-sm">{i.scans} scans</p>
                                            <p className="text-xs text-green-600">Top Performing</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </TabPanel>

            {/* ---------- Points Matrix Tab ---------- */}
            <TabPanel value={tab} index={2}>
                <div className="flex flex-col gap-6">
                    {/* Points Matrix Table */}
                    <div className="widget-card rounded-xl shadow p-6 order-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Points Matrix Rules</h3>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                                    <i className="fas fa-download text-xs"></i> Export
                                </button>
                                <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                                    <i className="fas fa-upload text-xs"></i> Import
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Rule ID</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Stakeholder</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">SKU/Category</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Base Points</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Adjustment</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Effective From</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pointsMatrix.map((r) => (
                                        <tr key={r.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 text-sm text-gray-600">{r.id}</td>
                                            <td className="py-3 text-sm">
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${r.ruleType === 'Override' ? 'border-purple-400 text-purple-600' : 'border-gray-300 text-gray-600'}`}>{r.ruleType}</span>
                                            </td>
                                            <td className="py-3 text-sm text-gray-600">{r.stakeholder}</td>
                                            <td className="py-3">
                                                <span className="block text-[0.65rem] uppercase font-bold text-gray-400">{r.categoryHeader}</span>
                                                <span className="text-sm font-semibold text-blue-600">{r.categoryItem}</span>
                                            </td>
                                            <td className="py-3 text-sm text-gray-600">{r.base}</td>
                                            <td className="py-3 text-sm text-gray-600">{r.mult}</td>
                                            <td className="py-3 text-sm text-gray-600">{r.from}</td>
                                            <td className="py-3 text-sm text-gray-600 truncate max-w-[150px]" title={r.description}>{r.description || '---'}</td>
                                            <td className="py-3 text-sm">
                                                <span className={`badge ${r.status === 'Active' ? 'badge-success' : r.status === 'Scheduled' ? 'badge-warning' : 'badge-primary'}`}>{r.status}</span>
                                            </td>
                                            <td className="py-3 text-sm">
                                                {r.ruleType === 'Base' ? (
                                                    <button onClick={() => {
                                                        setSelectedRule(r);
                                                        setEditBasePoints(r.rawValue || 0);
                                                        setEditBaseMaxScans(r.maxScansPerDay || 5);
                                                        setEditModalOpen(true);
                                                    }} className="p-1 hover:bg-gray-100 rounded"><Edit size={16} className="text-gray-500" /></button>
                                                ) : (
                                                    <button onClick={() => {
                                                        if (confirm('Are you sure you want to delete this rule?')) {
                                                            deleteRuleMutation.mutate(Number(r.id.replace('RULE-', '')));
                                                        }
                                                    }} className="p-1 hover:bg-red-50 rounded"><Delete size={16} className="text-red-500" /></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Edit Base Points Modal */}
                    {editModalOpen && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">Edit Base Points Configuration</h4>
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-500">Stakeholder: {selectedRule?.stakeholder} | Item: {selectedRule?.category}</p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Base Points</label>
                                        <input type="number" value={editBasePoints} onChange={(e) => setEditBasePoints(Number(e.target.value))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Scans Per Day</label>
                                        <input type="number" value={editBaseMaxScans} onChange={(e) => setEditBaseMaxScans(Number(e.target.value))} className={inputClass} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50" onClick={() => setEditModalOpen(false)}>Cancel</button>
                                    <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700" onClick={() => {
                                        if (selectedRule) {
                                            updateBasePointsMutation.mutate({
                                                id: Number(selectedRule.id.replace('CFG-', '')),
                                                clientId: 1,
                                                pointsPerUnit: editBasePoints,
                                                maxScansPerDay: editBaseMaxScans,
                                                isActive: true
                                            });
                                        }
                                    }}>Save Changes</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 order-1">
                        {/* Add/Edit Rule Form */}
                        <div className="widget-card rounded-xl shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add/Edit Points Matrix Rule</h3>
                            <form className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                                    <input type="text" value={pmName} onChange={(e) => setPmName(e.target.value)} className={inputClass} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stakeholder Type</label>
                                    <select value={pmUserTypeId} onChange={(e) => setPmUserTypeId(e.target.value === 'All' ? 'All' : Number(e.target.value) as any)} className={selectClass}>
                                        <option value="All">All</option>
                                        {stakeholderTypes.map((s) => (
                                            <option key={s.id} value={Number(s.id)}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apply To SKU Entity</label>

                                    {/* Level color legend */}
                                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                        {SKU_LEVEL_STYLES.map((s, i) => (
                                            <span key={i} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full inline-block ${s.bar}`}></span>
                                                L{i + 1}{i === 0 ? ' (Top)' : i === SKU_LEVEL_STYLES.length - 1 ? ' (Leaf)' : ''}
                                            </span>
                                        ))}
                                        <span className="text-xs text-gray-400 ml-1">← parent → child</span>
                                    </div>

                                    {/* Custom hierarchical dropdown */}
                                    <div className="relative">
                                        {pmSkuDropdownOpen && (
                                            <div className="fixed inset-0 z-10" onClick={() => setPmSkuDropdownOpen(false)} />
                                        )}

                                        {/* Trigger */}
                                        <button
                                            type="button"
                                            onClick={() => { setPmSkuDropdownOpen(o => !o); setPmSkuEntitySearch(''); }}
                                            className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-left hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                        >
                                            {pmSkuEntityId !== null && flattenedEntities.find(f => Number(f.id) === pmSkuEntityId)
                                                ? (() => {
                                                    const sel = flattenedEntities.find(f => Number(f.id) === pmSkuEntityId)!;
                                                    const s = SKU_LEVEL_STYLES[Math.min(sel.depth, SKU_LEVEL_STYLES.length - 1)];
                                                    return (
                                                        <span className="flex items-center gap-2 min-w-0">
                                                            <span className={`shrink-0 inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${s.badge}`}>{sel.levelName}</span>
                                                            <span className="truncate text-gray-900">{sel.label}</span>
                                                            {sel.code && <span className="shrink-0 text-xs text-gray-400 font-mono">[{sel.code}]</span>}
                                                        </span>
                                                    );
                                                })()
                                                : <span className="text-gray-400">-- Select Entity (optional) --</span>
                                            }
                                            <ChevronDown className={`shrink-0 w-4 h-4 text-gray-400 transition-transform ${pmSkuDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Dropdown panel */}
                                        {pmSkuDropdownOpen && (
                                            <div className="absolute z-20 mt-1 w-full min-w-[420px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                                                {/* Search */}
                                                <div className="p-2 border-b border-gray-100">
                                                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                                                        <i className="fas fa-search text-xs text-gray-400"></i>
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={pmSkuEntitySearch}
                                                            onChange={(e) => setPmSkuEntitySearch(e.target.value)}
                                                            placeholder="Search entities…"
                                                            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
                                                        />
                                                        {pmSkuEntitySearch && (
                                                            <button type="button" onClick={() => setPmSkuEntitySearch('')} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* None option */}
                                                <div
                                                    className="flex items-center px-3 py-2 text-sm text-gray-400 italic hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                                    onClick={() => { setPmSkuEntityId(null); setPmSkuDropdownOpen(false); }}
                                                >
                                                    — None (apply to all) —
                                                </div>
                                                {/* Options */}
                                                <div className="max-h-80 overflow-y-auto">
                                                    {flattenedEntities
                                                        .filter(f =>
                                                            !pmSkuEntitySearch ||
                                                            f.label.toLowerCase().includes(pmSkuEntitySearch.toLowerCase()) ||
                                                            (f.code?.toLowerCase().includes(pmSkuEntitySearch.toLowerCase()) ?? false)
                                                        )
                                                        .map(f => {
                                                            const s = SKU_LEVEL_STYLES[Math.min(f.depth, SKU_LEVEL_STYLES.length - 1)];
                                                            const isSelected = Number(f.id) === pmSkuEntityId;
                                                            return (
                                                                <div
                                                                    key={f.id}
                                                                    onClick={() => { setPmSkuEntityId(Number(f.id)); setPmSkuDropdownOpen(false); setPmSkuEntitySearch(''); }}
                                                                    className={`flex items-center gap-2 py-2 pr-3 cursor-pointer transition-colors ${isSelected ? s.rowSelected : `bg-white ${s.rowHover}`}`}
                                                                    style={{ paddingLeft: `${f.depth * 20 + 12}px` }}
                                                                >
                                                                    <span className={`shrink-0 w-1 h-5 rounded-full ${s.bar}`}></span>
                                                                    <span className={`shrink-0 inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${s.badge}`}>{f.levelName}</span>
                                                                    <span className={`truncate text-sm ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{f.label}</span>
                                                                    {f.code && <span className="shrink-0 text-xs text-gray-400 font-mono ml-1">[{f.code}]</span>}
                                                                    {isSelected && <i className="fas fa-check text-xs text-blue-600 ml-auto shrink-0"></i>}
                                                                </div>
                                                            );
                                                        })
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU Variant ID (optional)</label>
                                    <input type="number" value={pmSkuVariantId ?? ''} onChange={(e) => setPmSkuVariantId(e.target.value ? Number(e.target.value) : null)} className={inputClass} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                                    <select value={pmActionType} onChange={(e) => setPmActionType(e.target.value)} className={selectClass}>
                                        <option value="FLAT_OVERRIDE">Flat Override</option>
                                        <option value="PERCENTAGE_ADD">Percentage Add</option>
                                        <option value="FIXED_ADD">Fixed Add</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Action Value</label>
                                    <input type="number" value={pmActionValue} onChange={(e) => setPmActionValue(Number(e.target.value))} className={inputClass} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
                                    <input type="date" value={pmValidFrom} onChange={(e) => setPmValidFrom(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Effective To</label>
                                    <input type="date" value={pmValidTo} onChange={(e) => setPmValidTo(e.target.value)} className={inputClass} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea rows={2} value={pmDescription} onChange={(e) => setPmDescription(e.target.value)} className={inputClass + " resize-none"} />
                                </div>

                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={pmIsActive} onChange={(e) => setPmIsActive(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    Active
                                </label>

                                <div className="flex justify-end gap-2 items-center">
                                    <button type="button" className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50" onClick={() => {
                                        setPmRuleId(null);
                                        setPmName('');
                                        setPmUserTypeId('All');
                                        setPmSkuEntityId(null);
                                        setPmSkuVariantId(null);
                                        setPmActionType('FLAT_OVERRIDE');
                                        setPmActionValue(10);
                                        setPmValidFrom('');
                                        setPmValidTo('');
                                        setPmIsActive(true);
                                        setPmDescription('');
                                    }}>Cancel</button>
                                    <button type="button" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50" onClick={() => {
                                        pointsRuleMutation.mutate({
                                            id: pmRuleId ?? undefined,
                                            name: pmName || `Rule ${Date.now()}`,
                                            clientId: pmClientId,
                                            userTypeId: pmUserTypeId === 'All' ? undefined : Number(pmUserTypeId),
                                            skuEntityId: pmSkuEntityId ?? undefined,
                                            skuVariantId: pmSkuVariantId ?? undefined,
                                            actionType: pmActionType,
                                            actionValue: pmActionValue,
                                            description: pmDescription,
                                            isActive: pmIsActive,
                                            validFrom: pmValidFrom || undefined,
                                            validTo: pmValidTo || undefined,
                                        });
                                    }} disabled={pointsRuleMutation.isPending}>
                                        {pointsRuleMutation.isPending ? 'Saving...' : 'Save Rule'}
                                    </button>
                                    {pmSaveStatus === 'success' && <span className="text-sm text-green-600 ml-2">Saved</span>}
                                    {pmSaveStatus === 'error' && <span className="text-sm text-red-600 ml-2">Save failed</span>}
                                </div>
                            </form>
                        </div>

                        {/* Points Distribution Chart */}
                        <div className="widget-card rounded-xl shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Points Distribution Analysis</h3>
                            <div className="h-64">
                                <Pie
                                    data={{
                                        labels: ['Electrical Products', 'Lighting Products', 'Special Promotion'],
                                        datasets: [
                                            {
                                                data: [65, 25, 10],
                                                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
                                            },
                                        ],
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'bottom' } },
                                    }}
                                />
                            </div>
                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Total Points Awarded (Last 30 days)</span>
                                    <span className="font-medium">245,678</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Average Points per Transaction</span>
                                    <span className="font-medium">12.5</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Highest Point Category</span>
                                    <span className="font-medium">Electrical Products</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Lowest Point Category</span>
                                    <span className="font-medium">Lighting Products</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </TabPanel>
            {/* ---------- Target Master Tab ---------- */}
            <TabPanel value={tab} index={3}>
                <div className="space-y-6">
                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Target Configuration</h3>
                                <p className="text-sm text-gray-500">Define sales and loyalty targets for different stakeholder tiers</p>
                            </div>
                            <button className="btn btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                                <i className="fas fa-plus"></i> Create New Target
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Active Targets</p>
                                <p className="text-2xl font-bold text-indigo-900">12</p>
                                <p className="text-xs text-indigo-500 mt-2">Across 3 stakeholder types</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Completion Rate</p>
                                <p className="text-2xl font-bold text-emerald-900">68%</p>
                                <p className="text-xs text-emerald-500 mt-2">Average across all active users</p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Rewards Pending</p>
                                <p className="text-2xl font-bold text-amber-900">₹45,200</p>
                                <p className="text-xs text-amber-500 mt-2">To be distributed this month</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Target Name</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stakeholder</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Criteria</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reward</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { name: 'Monthly Scan Milestone', stakeholder: 'Electrician', criteria: '50 Scans', reward: '500 Points', duration: 'Oct 2026', status: 'Active' },
                                        { name: 'Quarterly Volume Growth', stakeholder: 'Retailer', criteria: '₹10L Sales', reward: '₹5,000 Cashback', duration: 'Q4 2026', status: 'Scheduled' },
                                        { name: 'New Product Launch', stakeholder: 'All', criteria: '5 SKU Scans', reward: 'Double Points', duration: '15-30 Oct', status: 'Active' },
                                    ].map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                            <td className="py-4 px-4 text-sm font-medium text-gray-900">{row.name}</td>
                                            <td className="py-4 px-4 text-sm text-gray-600">{row.stakeholder}</td>
                                            <td className="py-4 px-4 text-sm text-gray-600">{row.criteria}</td>
                                            <td className="py-4 px-4 text-sm font-semibold text-emerald-600">{row.reward}</td>
                                            <td className="py-4 px-4 text-sm text-gray-500">{row.duration}</td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${row.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-sm">
                                                <button className="text-gray-400 hover:text-blue-600 mr-3 transition"><i className="fas fa-edit"></i></button>
                                                <button className="text-gray-400 hover:text-red-600 transition"><i className="fas fa-trash"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </TabPanel>
        </main>
    );
}
