'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getNotificationTemplatesAction,
    getNotificationLogsAction,
    getEventMastersAction,
    upsertNotificationTemplateAction,
    sendManualNotificationAction
} from '@/actions/notification-actions';

export default function CommunicationClient() {
    const [activeTab, setActiveTab] = useState(0);
    const [openTemplateModal, setOpenTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data: templates = [], isLoading: loadingTemplates } = useQuery({
        queryKey: ['notification-templates'],
        queryFn: () => getNotificationTemplatesAction()
    });

    const { data: logs = [], isLoading: loadingLogs } = useQuery({
        queryKey: ['notification-logs'],
        queryFn: () => getNotificationLogsAction()
    });

    const { data: eventMasters = [] } = useQuery({
        queryKey: ['event-masters'],
        queryFn: () => getEventMastersAction()
    });

    const upsertMutation = useMutation({
        mutationFn: upsertNotificationTemplateAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
            setOpenTemplateModal(false);
            setEditingTemplate(null);
        }
    });

    const handleEditTemplate = (template: any) => {
        setEditingTemplate(template);
        setOpenTemplateModal(true);
    };

    const handleSaveTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());
        upsertMutation.mutate({
            ...editingTemplate,
            ...data,
            isActive: data.isActive === 'on',
            triggerType: editingTemplate?.triggerType || 'manual'
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sent': return 'badge-success';
            case 'scheduled': return 'badge-warning';
            case 'draft': return 'badge-primary';
            default: return 'badge-primary';
        }
    };

    const getChannelIcon = (type: string) => {
        switch (type) {
            case 'email': return 'fas fa-envelope';
            case 'sms': return 'fas fa-comment-dots';
            case 'notification': return 'fas fa-bell';
            default: return 'fas fa-paper-plane';
        }
    };

    if (loadingTemplates || loadingLogs) return (
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
    );

    const tabs = [
        { label: 'Campaigns & Direct', icon: 'fas fa-paper-plane' },
        { label: 'Templates', icon: 'fas fa-list' },
        { label: 'Event Triggers', icon: 'fas fa-cog' },
        { label: 'Logs & History', icon: 'fas fa-history' },
    ];

    return (
        <div>
            {/* Tabs */}
            <div className="tabs mb-6">
                {tabs.map((t, i) => (
                    <button key={i} className={`tab ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>
                        <i className={`${t.icon} mr-2`}></i>{t.label}
                    </button>
                ))}
            </div>

            {/* Tab 0: Campaigns & Direct */}
            {activeTab === 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
                    <div className="widget-card rounded-xl shadow p-6 h-fit">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compose Campaign</h3>
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Template</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                                <option value="">-- Select Template --</option>
                                {templates.filter((t: any) => t.triggerType === 'campaign' || t.triggerType === 'manual').map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target User Group / IDs</label>
                            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" rows={2} placeholder="Enter User IDs separated by comma"></textarea>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Data (JSON)</label>
                            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" rows={3} placeholder='{"name": "John"}'></textarea>
                        </div>
                        <button className="btn btn-primary w-full">
                            <i className="fas fa-paper-plane mr-2"></i>Launch Campaign
                        </button>
                    </div>

                    <div className="widget-card rounded-xl shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Campaigns</h3>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>Channel</th>
                                        <th>Status</th>
                                        <th>Recipients</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500">No active campaigns found</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 1: Templates */}
            {activeTab === 1 && (
                <div className="widget-card rounded-xl shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Notification Templates</h3>
                        <button onClick={() => { setEditingTemplate(null); setOpenTemplateModal(true); }} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition">
                            <i className="fas fa-plus mr-2"></i>Create Template
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Slug</th>
                                    <th>Trigger</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map((t: any) => (
                                    <tr key={t.id}>
                                        <td className="py-3 text-sm font-medium text-gray-900">{t.name}</td>
                                        <td className="py-3 text-sm"><span className="badge badge-primary">{t.slug}</span></td>
                                        <td className="py-3 text-sm"><span className="badge badge-warning">{t.triggerType}</span></td>
                                        <td className="py-3 text-sm">
                                            <span className={`badge ${t.isActive ? 'badge-success' : 'badge-danger'}`}>{t.isActive ? 'Active' : 'Inactive'}</span>
                                        </td>
                                        <td className="py-3 text-sm">
                                            <button onClick={() => handleEditTemplate(t)} className="text-red-600 hover:text-red-800 mr-3"><i className="fas fa-edit"></i></button>
                                            <button className="text-green-600 hover:text-green-800"><i className="fas fa-play"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Event Triggers */}
            {activeTab === 2 && (
                <div className="widget-card rounded-xl shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Event Triggers</h3>
                        <button className="btn btn-secondary">
                            <i className="fas fa-plus mr-2"></i>Add Event Mapping
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Event Key</th>
                                    <th>Description</th>
                                    <th>Template</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventMasters.map((e: any) => (
                                    <tr key={e.id}>
                                        <td className="py-3 text-sm"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{e.eventKey}</code></td>
                                        <td className="py-3 text-sm text-gray-600">{e.description || 'No description'}</td>
                                        <td className="py-3 text-sm">{templates.find((t: any) => t.id === e.templateId)?.name || 'Not Linked'}</td>
                                        <td className="py-3 text-sm">
                                            <span className={`badge ${e.isActive ? 'badge-success' : 'badge-danger'}`}>{e.isActive ? 'Active' : 'Inactive'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 3: Logs & History */}
            {activeTab === 3 && (
                <div className="widget-card rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Logs</h3>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User ID</th>
                                    <th>Channel</th>
                                    <th>Status</th>
                                    <th>Template</th>
                                    <th>Sent At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((l: any) => (
                                    <tr key={l.id}>
                                        <td className="py-3 text-sm">#{l.userId}</td>
                                        <td className="py-3 text-sm">
                                            <span className="flex items-center gap-2">
                                                <i className={getChannelIcon(l.channel)}></i>{l.channel.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 text-sm"><span className={`badge ${getStatusBadge(l.status)}`}>{l.status}</span></td>
                                        <td className="py-3 text-sm">{templates.find((t: any) => t.id === l.templateId)?.name || `ID: ${l.templateId}`}</td>
                                        <td className="py-3 text-sm text-gray-500">{new Date(l.sentAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Template Modal */}
            {openTemplateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <form onSubmit={handleSaveTemplate}>
                            <div className="px-6 py-4 border-b">
                                <h3 className="text-lg font-semibold text-gray-900">{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                                        <input type="text" name="name" defaultValue={editingTemplate?.name} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                                        <input type="text" name="slug" defaultValue={editingTemplate?.slug} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Push Notification</h4>
                                    <input type="text" name="pushTitle" defaultValue={editingTemplate?.pushTitle} placeholder="Push Title" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-2" />
                                    <textarea name="pushBody" defaultValue={editingTemplate?.pushBody} placeholder="Push Body" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"></textarea>
                                    <p className="text-xs text-gray-400 mt-1">Use &#123;&#123;key&#125;&#125; for placeholders</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">SMS Message</h4>
                                    <textarea name="smsBody" defaultValue={editingTemplate?.smsBody} placeholder="SMS Body" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"></textarea>
                                    <p className="text-xs text-gray-400 mt-1">Use &#123;&#123;key&#125;&#125; for placeholders</p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="isActive" defaultChecked={editingTemplate ? editingTemplate.isActive : true} className="rounded border-gray-300" />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>
                            </div>
                            <div className="px-6 py-4 border-t flex justify-end gap-3">
                                <button type="button" onClick={() => setOpenTemplateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={upsertMutation.isPending} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                                    {upsertMutation.isPending ? 'Saving...' : 'Save Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
