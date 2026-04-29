'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    getRoleDataAction, 
    getAdminRolesAction, 
    createPortalUserAction,
    updatePortalUserAction,
    resetUserPasswordAction,
    toggleUserStatusAction
} from '@/actions/role-actions';
import { getStatesAction, getCitiesAction, getUserScopesAction } from '@/actions/scope-actions';

export default function RolesClient() {
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newUserData, setNewUserData] = useState({ name: '', email: '', phone: '', roleId: '', password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [editingUser, setEditingUser] = useState<any>(null);
    const [resettingUser, setResettingUser] = useState<any>(null);

    const { data: adminRoles } = useQuery({
        queryKey: ['admin-roles'],
        queryFn: () => getAdminRolesAction()
    });

    const { data: states } = useQuery({
        queryKey: ['states'],
        queryFn: () => getStatesAction()
    });

    const { data: cities } = useQuery({
        queryKey: ['cities'],
        queryFn: () => getCitiesAction()
    });

    const [selectedScopeIds, setSelectedScopeIds] = useState<number[]>([]);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['role-data', debouncedSearch, roleFilter, statusFilter],
        queryFn: () => getRoleDataAction({ searchTerm: debouncedSearch, roleFilter, statusFilter })
    });

    useEffect(() => {
        if (editingUser) {
            const uid = parseInt(editingUser.id.replace('USR', ''));
            getUserScopesAction(uid).then(scopes => {
                setSelectedScopeIds(scopes.map(s => s.scopeEntityId!));
            });
        } else {
            setSelectedScopeIds([]);
        }
    }, [editingUser]);

    if (isLoading) return (
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
    );
    if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">Failed to load role data</div>;

    const users = data?.users || [];
    const roles = data?.roles || [];
    const logs = data?.logs || [];

    const tabs = [
        { label: 'Users', icon: 'fas fa-users' },
        { label: 'Access Logs', icon: 'fas fa-history' },
    ];

    const statCards = [
        { label: 'Total Users', value: data?.stats?.totalUsers || 0, icon: 'fas fa-users', iconBg: 'bg-red-100', iconColor: 'text-red-600', sub: '+0', subLabel: 'this month', subColor: 'text-green-600' },
        { label: 'Active Users', value: data?.stats?.activeUsers || 0, icon: 'fas fa-check-circle', iconBg: 'bg-green-100', iconColor: 'text-green-600', sub: `${data?.stats?.totalUsers ? Math.round(((data.stats.activeUsers || 0) / data.stats.totalUsers) * 100) : 0}%`, subLabel: 'active rate', subColor: 'text-green-600' },
        { label: 'Admin Users', value: data?.stats?.adminUsers || 0, icon: 'fas fa-shield-alt', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', sub: `${data?.stats?.totalUsers ? Math.round(((data.stats.adminUsers || 0) / data.stats.totalUsers) * 100) : 0}%`, subLabel: 'of total', subColor: 'text-red-600' },
        { label: 'Pending Invites', value: data?.stats?.pendingInvites || 0, icon: 'fas fa-bell', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', sub: '0', subLabel: 'expiring', subColor: 'text-orange-600' },
    ];

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'Admin': return 'badge-primary';
            case 'Manager': return 'badge-success';
            case 'Operator': return 'badge-warning';
            default: return 'badge-primary';
        }
    };

    const getStatusDot = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'pending': return 'bg-yellow-500';
            default: return 'bg-red-500';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-600';
            case 'pending': return 'text-yellow-600';
            default: return 'text-red-600';
        }
    };

    return (
        <div>
            {/* Tabs */}
            <div className="tabs mb-6">
                {tabs.map((t, i) => (
                    <button key={i} className={`tab ${tabValue === i ? 'active' : ''}`} onClick={() => setTabValue(i)}>
                        <i className={`${t.icon} mr-2`}></i>{t.label}
                    </button>
                ))}
            </div>

            {/* Users Tab */}
            {tabValue === 0 && (
                <div>
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        {statCards.map((card, i) => (
                            <div key={i} className="widget-card rounded-xl shadow p-6">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm text-gray-500">{card.label}</p>
                                    <div className={`p-2 ${card.iconBg} rounded-lg`}>
                                        <i className={`${card.icon} ${card.iconColor}`}></i>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-1">{card.value}</h3>
                                <div className="flex items-center text-sm">
                                    <span className={`${card.subColor} font-medium mr-1`}>{card.sub}</span>
                                    <span className="text-gray-500">{card.subLabel}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="widget-card rounded-xl shadow p-4 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="relative md:col-span-1">
                                <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm" />
                            </div>
                            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                                <option value="">All Roles</option>
                                <option value="Admin">Admin</option>
                                <option value="Manager">Manager</option>
                                <option value="Operator">Operator</option>
                                <option value="Viewer">Viewer</option>
                            </select>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="pending">Pending</option>
                            </select>
                            <button onClick={() => { setSearchTerm(''); setRoleFilter(''); setStatusFilter(''); }} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                                <i className="fas fa-filter mr-2"></i>Reset
                            </button>
                            <button onClick={() => { 
                                setSelectedScopeIds([]); 
                                setNewUserData({ name: '', email: '', phone: '', roleId: '', password: '' });
                                setIsAddModalOpen(true); 
                            }} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center justify-center">
                                <i className="fas fa-plus mr-2"></i>Add User
                            </button>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Department</th>
                                        <th>Last Login</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user: any) => (
                                        <tr key={user.id}>
                                            <td className="py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: user.color }}>
                                                        {user.initials}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                        <p className="text-xs text-gray-500">{user.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 text-sm text-gray-600">{user.email}</td>
                                            <td className="py-3 text-sm"><span className={`badge ${getRoleBadge(user.role)}`}>{user.role}</span></td>
                                            <td className="py-3 text-sm text-gray-600">{user.department}</td>
                                            <td className="py-3 text-sm text-gray-500">{user.lastLogin}</td>
                                            <td className="py-3 text-sm">
                                                <span className="flex items-center gap-1.5">
                                                    <span className={`w-2 h-2 rounded-full ${getStatusDot(user.status)}`}></span>
                                                    <span className={getStatusColor(user.status)}>{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
                                                </span>
                                            </td>
                                            <td className="py-3 text-sm">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingUser(user)} className="text-red-600 hover:text-red-800 p-1" title="Edit User"><i className="fas fa-edit"></i></button>
                                                    <button onClick={() => setResettingUser(user)} className="text-green-600 hover:text-green-800 p-1" title="Reset Password"><i className="fas fa-key"></i></button>
                                                    <button 
                                                        onClick={async () => {
                                                            if (confirm(`Are you sure you want to ${user.status === 'inactive' ? 'activate' : 'suspend'} ${user.name}?`)) {
                                                                const uid = parseInt(user.id.replace('USR', ''));
                                                                await toggleUserStatusAction(uid, user.status !== 'inactive');
                                                                window.location.reload();
                                                            }
                                                        }}
                                                        className={`${user.status === 'inactive' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'} p-1`} 
                                                        title={user.status === 'inactive' ? 'Activate User' : 'Suspend User'}
                                                    >
                                                        <i className={`fas ${user.status === 'inactive' ? 'fa-user-check' : 'fa-ban'}`}></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <p className="text-sm text-gray-500">Showing 1 to {users.length} of {data?.stats?.totalUsers || 0} entries</p>
                            <div className="flex gap-1">
                                <button className="btn btn-secondary btn-sm">Previous</button>
                                <button className="btn btn-primary btn-sm">1</button>
                                <button className="btn btn-secondary btn-sm">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Access Logs Tab */}
            {tabValue === 1 && (
                <div className="widget-card rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Access Logs</h3>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Module</th>
                                    <th>IP Address</th>
                                    <th>Date/Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log: any) => (
                                    <tr key={log.id}>
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: log.color }}>
                                                    {log.initials}
                                                </div>
                                                <span className="text-sm text-gray-700">{log.user}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-sm text-gray-600">{log.action}</td>
                                        <td className="py-3 text-sm text-gray-600">{log.module}</td>
                                        <td className="py-3 text-sm text-gray-500">{log.ip}</td>
                                        <td className="py-3 text-sm text-gray-500">{log.dateTime}</td>
                                        <td className="py-3 text-sm">
                                            <span className={`badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                                                {log.status === 'success' ? 'Success' : 'Failed'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Portal User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900">Add Portal User</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setIsSubmitting(true);
                            const roleName = adminRoles?.find((r: any) => r.id === parseInt(newUserData.roleId))?.name;
                            const res = await createPortalUserAction({
                                ...newUserData,
                                roleId: parseInt(newUserData.roleId),
                                scopes: roleName === 'TSM' || roleName === 'SR' ? {
                                    type: roleName === 'TSM' ? 'State' : 'City',
                                    entityIds: selectedScopeIds
                                } : undefined
                            });
                            setIsSubmitting(false);
                            if (res.success) {
                                setIsAddModalOpen(false);
                                setNewUserData({ name: '', email: '', phone: '', roleId: '', password: '' });
                                window.location.reload();
                            } else {
                                alert(res.error);
                            }
                        }}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input required type="text" value={newUserData.name} onChange={e => setNewUserData({...newUserData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" placeholder="Enter full name" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input required type="email" autoComplete="off" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" placeholder="name@sturlite.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input required type="tel" value={newUserData.phone} onChange={e => setNewUserData({...newUserData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" placeholder="10 digit mobile number" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Portal Role</label>
                                    <select required value={newUserData.roleId} onChange={e => setNewUserData({...newUserData, roleId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white">
                                        <option value="">Select a role</option>
                                        {adminRoles?.map((r: any) => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Scope Selection */}
                                {adminRoles?.find((r: any) => r.id === parseInt(newUserData.roleId))?.name === 'TSM' && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Map States</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border rounded-lg bg-gray-50">
                                            {states?.map((s: any) => (
                                                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedScopeIds.includes(s.id)} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedScopeIds([...selectedScopeIds, s.id]);
                                                            else setSelectedScopeIds(selectedScopeIds.filter(id => id !== s.id));
                                                        }}
                                                        className="rounded text-red-600 focus:ring-red-500"
                                                    />
                                                    {s.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {adminRoles?.find((r: any) => r.id === parseInt(newUserData.roleId))?.name === 'SR' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Map City</label>
                                        <select 
                                            required 
                                            value={selectedScopeIds[0] || ''} 
                                            onChange={e => setSelectedScopeIds([parseInt(e.target.value)])}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white"
                                        >
                                            <option value="">Select a city</option>
                                            {cities?.map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Set Password</label>
                                    <input required type="password" autoComplete="new-password" value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" placeholder="Minimum 8 characters" minLength={8} />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary px-6">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary px-8">
                                    {isSubmitting ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-red-50">
                            <h3 className="text-lg font-semibold text-red-900">Edit Portal User</h3>
                            <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setIsSubmitting(true);
                            const uid = parseInt(editingUser.id.replace('USR', ''));
                            const roleName = adminRoles?.find((r: any) => r.id === parseInt(editingUser.roleId))?.name;
                            const res = await updatePortalUserAction(uid, {
                                name: editingUser.name,
                                email: editingUser.email,
                                phone: editingUser.phone,
                                roleId: parseInt(editingUser.roleId) || 11,
                                scopes: roleName === 'TSM' || roleName === 'SR' ? {
                                    type: roleName === 'TSM' ? 'State' : 'City',
                                    entityIds: selectedScopeIds
                                } : undefined
                            });
                            setIsSubmitting(false);
                            if (res.success) {
                                setEditingUser(null);
                                window.location.reload();
                            } else {
                                alert(res.error);
                            }
                        }}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input required type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input required type="email" autoComplete="off" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input required type="tel" value={editingUser.phone} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Portal Role</label>
                                    <select required value={editingUser.roleId} onChange={e => setEditingUser({...editingUser, roleId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white">
                                        <option value="">Select a role</option>
                                        {adminRoles?.map((r: any) => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Scope Selection */}
                                {adminRoles?.find((r: any) => r.id === parseInt(editingUser.roleId))?.name === 'TSM' && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Map States</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border rounded-lg bg-red-50/50">
                                            {states?.map((s: any) => (
                                                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedScopeIds.includes(s.id)} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedScopeIds([...selectedScopeIds, s.id]);
                                                            else setSelectedScopeIds(selectedScopeIds.filter(id => id !== s.id));
                                                        }}
                                                        className="rounded text-red-600 focus:ring-red-500"
                                                    />
                                                    {s.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {adminRoles?.find((r: any) => r.id === parseInt(editingUser.roleId))?.name === 'SR' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Map City</label>
                                        <select 
                                            required 
                                            value={selectedScopeIds[0] || ''} 
                                            onChange={e => setSelectedScopeIds([parseInt(e.target.value)])}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white"
                                        >
                                            <option value="">Select a city</option>
                                            {cities?.map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
                                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-lg font-medium transition shadow-sm disabled:opacity-50">
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resettingUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-green-50">
                            <h3 className="text-lg font-semibold text-green-900">Reset Password</h3>
                            <button onClick={() => setResettingUser(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const password = (e.target as any).password.value;
                            if (password.length < 8) return alert('Password must be at least 8 characters');
                            
                            setIsSubmitting(true);
                            const uid = parseInt(resettingUser.id.replace('USR', ''));
                            const res = await resetUserPasswordAction(uid, password);
                            setIsSubmitting(false);
                            
                            if (res.success) {
                                alert('Password updated successfully');
                                setResettingUser(null);
                            } else {
                                alert(res.error);
                            }
                        }}>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-600">Resetting password for <strong>{resettingUser.name}</strong></p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input required name="password" type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" placeholder="Minimum 8 characters" minLength={8} />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
                                <button type="button" onClick={() => setResettingUser(null)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-medium transition shadow-sm disabled:opacity-50">
                                    {isSubmitting ? 'Saving...' : 'Save Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
