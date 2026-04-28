'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getEventBusSummaryAction,
    getEventHandlerConfigsAction,
    getEventKeysAction,
    upsertEventHandlerConfigAction,
    deleteEventHandlerConfigAction,
    toggleHandlerConfigAction,
} from '@/actions/eventbus-actions';

/**
 * Available handler classes in the backend.
 */
export const AVAILABLE_HANDLERS = [
  { name: 'AuditLogHandler', description: 'Logs every event to event_logs and system_logs tables', icon: 'fas fa-clipboard-list' },
  { name: 'NotificationHandler', description: 'Sends push/SMS/email based on event_master.templateId', icon: 'fas fa-bell' },
  { name: 'WelcomeBonusHandler', description: 'Awards registration bonus points on USER_CREATED', icon: 'fas fa-gift' },
  { name: 'ReferralBonusHandler', description: 'Awards referral bonus on USER_KYC_APPROVED', icon: 'fas fa-user-friends' },
] as const;

interface HandlerConfig {
    id?: number;
    eventKey: string;
    handlerName: string;
    priority: number;
    config: Record<string, any>;
    isActive: boolean;
}

export default function EventBusClient() {
    const [activeTab, setActiveTab] = useState(0);
    const [openModal, setOpenModal] = useState(false);
    const [editingConfig, setEditingConfig] = useState<HandlerConfig | null>(null);
    const [configJson, setConfigJson] = useState('{}');
    const [jsonError, setJsonError] = useState('');
    const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
    const [filterText, setFilterText] = useState('');
    const queryClient = useQueryClient();

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['eventbus-summary'],
        queryFn: getEventBusSummaryAction,
    });

    const { data: allConfigs = [], isLoading: loadingConfigs } = useQuery({
        queryKey: ['eventbus-configs'],
        queryFn: getEventHandlerConfigsAction,
    });

    const { data: eventKeys = [] } = useQuery({
        queryKey: ['eventbus-keys'],
        queryFn: getEventKeysAction,
    });

    const upsertMutation = useMutation({
        mutationFn: upsertEventHandlerConfigAction,
        onSuccess: (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['eventbus-summary'] });
                queryClient.invalidateQueries({ queryKey: ['eventbus-configs'] });
                setOpenModal(false);
                setEditingConfig(null);
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteEventHandlerConfigAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventbus-summary'] });
            queryClient.invalidateQueries({ queryKey: ['eventbus-configs'] });
        },
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
            toggleHandlerConfigAction(id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventbus-summary'] });
            queryClient.invalidateQueries({ queryKey: ['eventbus-configs'] });
        },
    });

    const handleOpenCreate = () => {
        setEditingConfig(null);
        setConfigJson('{}');
        setJsonError('');
        setOpenModal(true);
    };

    const handleOpenEdit = (config: any) => {
        setEditingConfig(config);
        setConfigJson(JSON.stringify(config.config || {}, null, 2));
        setJsonError('');
        setOpenModal(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget as HTMLFormElement);

        let parsedConfig = {};
        try {
            parsedConfig = JSON.parse(configJson);
            setJsonError('');
        } catch {
            setJsonError('Invalid JSON format');
            return;
        }

        upsertMutation.mutate({
            id: editingConfig?.id,
            eventKey: form.get('eventKey') as string,
            handlerName: form.get('handlerName') as string,
            priority: parseInt(form.get('priority') as string) || 0,
            config: parsedConfig,
            isActive: form.get('isActive') === 'on',
        });
    };

    const getHandlerInfo = (name: string) =>
        AVAILABLE_HANDLERS.find((h) => h.name === name);

    const getHandlerBadgeColor = (name: string) => {
        switch (name) {
            case 'AuditLogHandler': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'NotificationHandler': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'WelcomeBonusHandler': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'ReferralBonusHandler': return 'bg-purple-50 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getCategoryColor = (category?: string | null) => {
        switch (category?.toUpperCase()) {
            case 'USER': return 'badge-primary';
            case 'KYC': return 'badge-warning';
            case 'EARNING': case 'SCAN': return 'badge-success';
            case 'REDEMPTION': return 'badge-danger';
            case 'TICKETING': return 'badge-info';
            case 'ADMIN': return 'badge-secondary';
            default: return 'badge-primary';
        }
    };

    if (loadingSummary || loadingConfigs) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const tabs = [
        { label: 'Event Overview', icon: 'fas fa-project-diagram' },
        { label: 'Handler Config', icon: 'fas fa-cogs' },
        { label: 'Available Handlers', icon: 'fas fa-puzzle-piece' },
    ];

    // Filter events
    const filteredEvents = (summary?.summary || []).filter((e: any) =>
        !filterText ||
        e.eventKey.toLowerCase().includes(filterText.toLowerCase()) ||
        e.name?.toLowerCase().includes(filterText.toLowerCase()) ||
        e.category?.toLowerCase().includes(filterText.toLowerCase())
    );

    return (
        <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="widget-card rounded-xl shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <i className="fas fa-bolt text-blue-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{summary?.totalEvents || 0}</p>
                            <p className="text-xs text-gray-500">Total Events</p>
                        </div>
                    </div>
                </div>
                <div className="widget-card rounded-xl shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <i className="fas fa-link text-emerald-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{summary?.totalConfigs || 0}</p>
                            <p className="text-xs text-gray-500">Handler Bindings</p>
                        </div>
                    </div>
                </div>
                <div className="widget-card rounded-xl shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                            <i className="fas fa-check-circle text-green-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{summary?.activeConfigs || 0}</p>
                            <p className="text-xs text-gray-500">Active Bindings</p>
                        </div>
                    </div>
                </div>
                <div className="widget-card rounded-xl shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                            <i className="fas fa-puzzle-piece text-purple-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{AVAILABLE_HANDLERS.length}</p>
                            <p className="text-xs text-gray-500">Handler Types</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs mb-6">
                {tabs.map((t, i) => (
                    <button key={i} className={`tab ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>
                        <i className={`${t.icon} mr-2`}></i>{t.label}
                    </button>
                ))}
            </div>

            {/* Tab 0: Event Overview — Events grouped with their handlers */}
            {activeTab === 0 && (
                <div className="widget-card rounded-xl shadow p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
                        <h3 className="text-lg font-semibold text-gray-900">Event → Handler Pipeline</h3>
                        <div className="flex gap-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Filter events..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 shadow-sm"
                                />
                            </div>
                            <button onClick={handleOpenCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                                <i className="fas fa-plus"></i>Add Binding
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {filteredEvents.map((event: any) => (
                            <div key={event.eventKey} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Event Row Header */}
                                <div
                                    onClick={() => setExpandedEvent(expandedEvent === event.eventKey ? null : event.eventKey)}
                                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <i className={`fas fa-chevron-${expandedEvent === event.eventKey ? 'down' : 'right'} text-gray-400 text-xs w-3`}></i>
                                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-800">{event.eventKey}</code>
                                        {event.category && (
                                            <span className={`badge ${getCategoryColor(event.category)}`}>{event.category}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500">{event.activeHandlerCount}/{event.totalHandlerCount} handlers</span>
                                        <div className="flex gap-1">
                                            {(event.handlers || []).map((h: any) => (
                                                <span key={h.id} className={`inline-block w-2 h-2 rounded-full ${h.isActive ? 'bg-green-400' : 'bg-gray-300'}`} title={h.handlerName}></span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded — Handler Chain */}
                                {expandedEvent === event.eventKey && (
                                    <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                                        {event.handlers.length === 0 ? (
                                            <p className="text-sm text-gray-400 italic">No handlers bound. Click "Add Binding" to configure.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-500 font-medium mb-2">Execution Order (by priority):</p>
                                                {event.handlers
                                                    .sort((a: any, b: any) => a.priority - b.priority)
                                                    .map((h: any, idx: number) => {
                                                        const info = getHandlerInfo(h.handlerName);
                                                        return (
                                                            <div key={h.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-2.5">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs text-gray-400 font-mono w-6">#{idx + 1}</span>
                                                                    <i className={`${info?.icon || 'fas fa-cog'} text-gray-500 w-4 text-center`}></i>
                                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getHandlerBadgeColor(h.handlerName)}`}>
                                                                        {h.handlerName}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">P:{h.priority}</span>
                                                                    {Object.keys(h.config || {}).length > 0 && (
                                                                        <code className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                                                            {JSON.stringify(h.config)}
                                                                        </code>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: h.id, isActive: !h.isActive }); }}
                                                                        className={`w-8 h-4 rounded-full transition-colors relative ${h.isActive ? 'bg-green-400' : 'bg-gray-300'}`}
                                                                        title={h.isActive ? 'Active — Click to disable' : 'Inactive — Click to enable'}
                                                                    >
                                                                        <span className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-transform ${h.isActive ? 'right-0.5' : 'left-0.5'}`}></span>
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(h); }} className="text-blue-500 hover:text-blue-700 text-xs p-1">
                                                                        <i className="fas fa-edit"></i>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (confirm(`Delete ${h.handlerName} from ${event.eventKey}?`)) {
                                                                                deleteMutation.mutate(h.id);
                                                                            }
                                                                        }}
                                                                        className="text-red-400 hover:text-red-600 text-xs p-1"
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 1: Flat Config Table */}
            {activeTab === 1 && (
                <div className="widget-card rounded-xl shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">All Handler Configurations</h3>
                        <button onClick={handleOpenCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                            <i className="fas fa-plus mr-2"></i>Add Binding
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Event Key</th>
                                    <th>Handler</th>
                                    <th>Priority</th>
                                    <th>Config</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allConfigs.map((c: any) => (
                                    <tr key={c.id}>
                                        <td className="py-3 text-sm">
                                            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{c.eventKey}</code>
                                        </td>
                                        <td className="py-3 text-sm">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getHandlerBadgeColor(c.handlerName)}`}>
                                                {c.handlerName}
                                            </span>
                                        </td>
                                        <td className="py-3 text-sm text-center">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-mono font-bold text-gray-700">
                                                {c.priority}
                                            </span>
                                        </td>
                                        <td className="py-3 text-sm">
                                            {Object.keys(c.config || {}).length > 0 ? (
                                                <code className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                                    {JSON.stringify(c.config)}
                                                </code>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 text-sm">
                                            <button
                                                onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                                                className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'} cursor-pointer`}
                                            >
                                                {c.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="py-3 text-sm">
                                            <button onClick={() => handleOpenEdit(c)} className="text-blue-600 hover:text-blue-800 mr-3">
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Delete ${c.handlerName} binding for ${c.eventKey}?`)) {
                                                        deleteMutation.mutate(c.id);
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {allConfigs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-500">
                                            No handler configurations found. Click "Add Binding" to create one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Available Handlers Reference */}
            {activeTab === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AVAILABLE_HANDLERS.map((handler) => {
                        const boundTo = allConfigs.filter((c: any) => c.handlerName === handler.name);
                        const activeCount = boundTo.filter((c: any) => c.isActive).length;

                        return (
                            <div key={handler.name} className="widget-card rounded-xl shadow p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <i className={`${handler.icon} text-blue-600`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-gray-900">{handler.name}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{handler.description}</p>
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="badge badge-primary">{boundTo.length} bindings</span>
                                            <span className="badge badge-success">{activeCount} active</span>
                                        </div>
                                        {boundTo.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1">
                                                {boundTo.map((b: any) => (
                                                    <code key={b.id} className={`text-xs px-1.5 py-0.5 rounded ${b.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
                                                        {b.eventKey}
                                                    </code>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {openModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <form onSubmit={handleSave}>
                            <div className="px-6 py-4 border-b">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {editingConfig?.id ? 'Edit Handler Binding' : 'Create Handler Binding'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Map an event to a handler with priority and config.
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Event Key */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Key *</label>
                                    <select
                                        name="eventKey"
                                        defaultValue={editingConfig?.eventKey || ''}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">— Select Event —</option>
                                        {eventKeys.map((e: any) => (
                                            <option key={e.id} value={e.eventKey}>
                                                {e.eventKey} — {e.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Handler Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Handler *</label>
                                    <select
                                        name="handlerName"
                                        defaultValue={editingConfig?.handlerName || ''}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">— Select Handler —</option>
                                        {AVAILABLE_HANDLERS.map((h) => (
                                            <option key={h.name} value={h.name}>
                                                {h.name} — {h.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                    <input
                                        type="number"
                                        name="priority"
                                        defaultValue={editingConfig?.priority ?? 0}
                                        min={0}
                                        max={100}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Lower number = runs first. Convention: 0=Audit, 10=Business Logic, 20=Notification</p>
                                </div>

                                {/* Config JSON */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Config (JSON)</label>
                                    <textarea
                                        value={configJson}
                                        onChange={(e) => {
                                            setConfigJson(e.target.value);
                                            try { JSON.parse(e.target.value); setJsonError(''); } catch { setJsonError('Invalid JSON'); }
                                        }}
                                        rows={4}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${jsonError ? 'border-red-400' : 'border-gray-300'}`}
                                        placeholder='{"bonusPoints": 100}'
                                    />
                                    {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
                                    <p className="text-xs text-gray-400 mt-1">Handler-specific config. E.g. {`{"bonusPoints": 100}`} for WelcomeBonusHandler</p>
                                </div>

                                {/* Active Toggle */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        defaultChecked={editingConfig ? editingConfig.isActive : true}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>

                                {/* Error Display */}
                                {upsertMutation.data && !upsertMutation.data.success && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
                                        <i className="fas fa-exclamation-triangle mr-2"></i>
                                        {upsertMutation.data.error}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t flex justify-end gap-3">
                                <button type="button" onClick={() => setOpenModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={upsertMutation.isPending || !!jsonError}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {upsertMutation.isPending ? 'Saving...' : 'Save Binding'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
