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

    // Level color styles for L1–L6 SKU hierarchy
    const SKU_LEVEL_STYLES = [
        { badge: 'bg-indigo-100 text-indigo-700 border border-indigo-300', bar: 'bg-indigo-500', rowHover: 'hover:bg-indigo-50', rowSelected: 'bg-indigo-50' },
        { badge: 'bg-blue-100 text-blue-700 border border-blue-300', bar: 'bg-blue-500', rowHover: 'hover:bg-blue-50', rowSelected: 'bg-blue-50' },
        { badge: 'bg-cyan-100 text-cyan-700 border border-cyan-300', bar: 'bg-cyan-400', rowHover: 'hover:bg-cyan-50', rowSelected: 'bg-cyan-50' },
        { badge: 'bg-teal-100 text-teal-700 border border-teal-300', bar: 'bg-teal-400', rowHover: 'hover:bg-teal-50', rowSelected: 'bg-teal-50' },
        { badge: 'bg-green-100 text-green-700 border border-green-300', bar: 'bg-green-500', rowHover: 'hover:bg-green-50', rowSelected: 'bg-green-50' },
        { badge: 'bg-amber-100 text-amber-700 border border-amber-300', bar: 'bg-amber-500', rowHover: 'hover:bg-amber-50', rowSelected: 'bg-amber-50' },
    ];

    const flatten = (nodes: any[], depth = 0, out: { id: string; label: string; depth: number; levelName: string; code?: string }[] = []) => {
        for (const n of nodes) {
            out.push({ id: n.id, label: n.label, depth, levelName: n.levelName, code: n.code });
            if (n.children && n.children.length) flatten(n.children, depth + 1, out);
        }
        return out;
    };

    const flattenedEntities = flatten(data?.skuHierarchy || []);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(flattenedEntities[0]?.id || null);

    const allowedStakeholderNames = ['Electrician', 'Retailer', 'Counter Staffs'];
    const stakeholderTypes = useMemo(() => {
        return (data?.stakeholderTypes || []).filter((s: any) => 
            allowedStakeholderNames.some(name => 
                s.name?.toLowerCase().includes(name.toLowerCase()) ||
                s.code?.toLowerCase().includes(name.toLowerCase())
            )
        );
    }, [data?.stakeholderTypes]);

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
                setStakeholderChannelIds(channels.map((c: any) => Number(c)));
            }
        }
    }, [selectedStakeholderId, stakeholderTypes]);

    if (isLoading) return (
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
    if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">Failed to load configuration data</div>;

    const pointsMatrix = data?.pointsMatrix || [];

    return (
        <main className="flex-1 overflow-y-auto p-6">
            <div className="tabs mb-6">
                {tabLabels.map((label, i) => (
                    <button key={label} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{label}</button>
                ))}
            </div>

            <TabPanel value={tab} index={0}>
                <div className="space-y-6">
                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Stakeholder Types</h3>
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                </div>
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
                                                }}>Confirm</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="widget-card rounded-xl shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stakeholder Statistics</h3>
                            <div className="space-y-4">
                                {(data?.stakeholderStats || []).map((s: any) => (
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
                                    {(data?.dynamicMessages || []).map((msg: string, idx: number) => (
                                        <div key={idx} className="flex items-center text-sm">
                                            <span className={`w-2 h-2 rounded-full mr-2 ${msg.toLowerCase().includes('pending') ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                            {msg}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </TabPanel>

            <TabPanel value={tab} index={1}>
                <div className="space-y-6">
                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">SKU Hierarchy</h3>
                        </div>
                        <TreeView data={data?.skuHierarchy || []} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                <div className="flex justify-end gap-2 items-center">
                                    <button type="button" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50" onClick={() => {
                                        skuConfigMutation.mutate({
                                            clientId: 1,
                                            userTypeId: skuStakeholder === 'All' ? undefined : Number(skuStakeholder),
                                            entityId: Number(selectedEntityId),
                                            pointsPerUnit: pointsPerScan,
                                            maxScansPerDay: maxScansPerDay,
                                            isActive: isActive
                                        });
                                    }}>Save Configuration</button>
                                </div>
                            </form>
                        </div>
                        <div className="widget-card rounded-xl shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">SKU Performance</h3>
                            <div className="h-64">
                                <Bar
                                    data={{
                                        labels: (data?.topSkus || []).map(s => s.name),
                                        datasets: [{
                                            label: 'Scans',
                                            data: (data?.topSkus || []).map(s => s.scans),
                                            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'],
                                            borderRadius: 5,
                                        }],
                                    }}
                                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </TabPanel>

            <TabPanel value={tab} index={2}>
                <div className="space-y-6">
                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Points Matrix Rules</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Rule ID</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Stakeholder</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">SKU/Category</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Points</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pointsMatrix.map((r) => (
                                        <tr key={r.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 text-sm text-gray-600">{r.id}</td>
                                            <td className="py-3 text-sm">{r.ruleType}</td>
                                            <td className="py-3 text-sm text-gray-600">{r.stakeholder}</td>
                                            <td className="py-3 text-sm text-gray-600">{r.categoryItem}</td>
                                            <td className="py-3 text-sm text-gray-600">{r.base}</td>
                                            <td className="py-3 text-sm">{r.status}</td>
                                            <td className="py-3 text-sm">
                                                <button onClick={() => deleteRuleMutation.mutate(Number(r.id.replace('RULE-', '')))} className="p-1 text-red-500"><Delete size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </TabPanel>

            <TabPanel value={tab} index={3}>
                <div className="space-y-6">
                    <div className="widget-card rounded-xl shadow p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Target Configuration</h3>
                        <p className="text-sm text-gray-500 mb-4">Target management is currently being migrated to real-time data tracking.</p>
                    </div>
                </div>
            </TabPanel>
        </main>
    );
}
