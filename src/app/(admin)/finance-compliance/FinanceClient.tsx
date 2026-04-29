"use client"

import React, { useState } from 'react'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { useQuery } from '@tanstack/react-query'
import { getFinanceDataAction, getComplianceDataAction } from '@/actions/finance-actions'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

export default function FinanceClient() {
    const [activeTab, setActiveTab] = useState(0)
    const [filters, setFilters] = useState({ startDate: '', endDate: '', type: '', status: '' })
    const [tempFilters, setTempFilters] = useState({ startDate: '', endDate: '', type: '', status: '' })
    const [compFilters, setCompFilters] = useState({ status: 'All Status', type: 'All Stakeholders' })

    const { data: financeData, isLoading, error } = useQuery({
        queryKey: ['finance-data', filters],
        queryFn: () => getFinanceDataAction(filters)
    })

    const { data: complianceData, isLoading: isLoadingComp } = useQuery({
        queryKey: ['compliance-data', compFilters],
        queryFn: () => getComplianceDataAction(compFilters),
        enabled: activeTab === 2
    })

    const handleApplyFilters = () => setFilters(tempFilters)
    const handleResetFilters = () => {
        const reset = { startDate: '', endDate: '', type: '', status: '' }
        setTempFilters(reset)
        setFilters(reset)
    }

    const revenueTrendData = {
        labels: financeData?.overview?.revenueTrend?.labels || [],
        datasets: [{
            label: 'Revenue',
            data: financeData?.overview?.revenueTrend?.data || [],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
        }]
    }
    const revenueTrendOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: false, ticks: { callback: (value: any) => '₹' + (Number(value) / 10000000).toFixed(1) + 'Cr' }, grid: { display: false } },
            x: { grid: { display: false } }
        }
    }

    const pointsFlowData = {
        labels: financeData?.overview?.pointsFlow?.labels || [],
        datasets: [
            { label: 'Points Issued', data: financeData?.overview?.pointsFlow?.issued || [], backgroundColor: '#10B981', borderRadius: 5 },
            { label: 'Points Redeemed', data: financeData?.overview?.pointsFlow?.redeemed || [], backgroundColor: '#F59E0B', borderRadius: 5 }
        ]
    }
    const pointsFlowOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' as const } },
        scales: {
            y: { beginAtZero: true, ticks: { callback: (value: any) => '₹' + (Number(value) / 100000).toFixed(0) + 'L' }, grid: { display: false } },
            x: { grid: { display: false } }
        }
    }

    if (isLoading) return (
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
    )
    if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">Failed to load finance data</div>

    const tabs = [
        { label: 'Financial Overview', icon: 'fas fa-chart-pie' },
        { label: 'Transactions', icon: 'fas fa-exchange-alt' },
        { label: 'Compliance & KYC', icon: 'fas fa-shield-alt' },
    ]

    const kpiCards = [
        { label: 'Total Revenue', value: `₹${financeData?.overview?.totalRevenue?.toLocaleString()}`, icon: 'fas fa-wallet', iconBg: 'bg-red-100', iconColor: 'text-red-600', change: '+12.5%', changeColor: 'text-green-600', period: 'This Month', sub: 'vs last month' },
        { label: 'Points Issued', value: financeData?.overview?.pointsIssued?.toLocaleString(), icon: 'fas fa-coins', iconBg: 'bg-green-100', iconColor: 'text-green-600', change: '+8.3%', changeColor: 'text-green-600', period: 'This Month', sub: 'vs last month' },
        { label: 'Points Redeemed', value: financeData?.overview?.pointsRedeemed?.toLocaleString(), icon: 'fas fa-exchange-alt', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', change: '-3.2%', changeColor: 'text-red-600', period: 'This Month', sub: 'vs last month' },
        { label: 'Active Points Value', value: financeData?.overview?.activePointsValue?.toLocaleString(), icon: 'fas fa-chart-line', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', change: '+15.7%', changeColor: 'text-green-600', period: 'Current', sub: 'growth' },
    ]

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

            {/* Financial Overview */}
            {activeTab === 0 && (
                <div>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        {kpiCards.map((card, i) => (
                            <div key={i} className="widget-card rounded-xl shadow p-6">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: card.iconBg.replace('bg-','').replace('-100','#') + '40'}}>
                                        <i className={`${card.icon} ${card.iconColor} text-sm`}></i>
                                    </div>
                                    <span className="text-xs text-gray-500">{card.period}</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
                                <p className="text-sm text-gray-500">{card.label}</p>
                                <div className="flex items-center mt-2 text-sm">
                                    <span className={`${card.changeColor} font-medium mr-2`}>{card.change}</span>
                                    <span className="text-gray-500">{card.sub}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="widget-card rounded-xl shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                            <div style={{ height: 300 }}>
                                <Line data={revenueTrendData} options={revenueTrendOptions} />
                            </div>
                        </div>
                        <div className="widget-card rounded-xl shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Points Flow Analysis</h3>
                            <div style={{ height: 300 }}>
                                <Bar data={pointsFlowData} options={pointsFlowOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                            <button onClick={() => setActiveTab(1)} className="text-sm text-red-600 hover:text-red-800 font-medium">View All</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Transaction ID</th>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Member</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {financeData?.transactions?.map((row: any) => (
                                        <tr key={row.id}>
                                            <td className="font-mono text-xs text-gray-400">{row.id}</td>
                                            <td className="text-gray-500 text-xs">{row.date}</td>
                                            <td><span className={`badge ${row.typeBadge}`}>{row.type}</span></td>
                                            <td className="text-gray-600">{row.member}</td>
                                            <td className="font-semibold">{row.amount}</td>
                                            <td><span className={`badge ${row.badgeColor}`}>{row.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Transactions */}
            {activeTab === 1 && (
                <div className="widget-card rounded-xl shadow p-6">
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700">Start Date</label>
                            <input type="date" value={tempFilters.startDate} onChange={(e) => setTempFilters({ ...tempFilters, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700">End Date</label>
                            <input type="date" value={tempFilters.endDate} onChange={(e) => setTempFilters({ ...tempFilters, endDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700">Type</label>
                            <select value={tempFilters.type} onChange={(e) => setTempFilters({ ...tempFilters, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                                <option value="">All Types</option>
                                <option value="credit">Credit</option>
                                <option value="debit">Debit</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700">Status</label>
                            <select value={tempFilters.status} onChange={(e) => setTempFilters({ ...tempFilters, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                                <option value="">All Status</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <button onClick={handleApplyFilters} className="btn btn-primary">Apply</button>
                            <button onClick={handleResetFilters} className="btn btn-secondary">Reset</button>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
                            <p className="text-2xl font-bold text-gray-900">1,234</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">Total Credits</p>
                            <p className="text-2xl font-bold text-green-600">₹{(financeData?.overview?.pointsIssued || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">Total Debits</p>
                            <p className="text-2xl font-bold text-red-600">₹{(financeData?.overview?.pointsRedeemed || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">Net Balance</p>
                            <p className="text-2xl font-bold text-purple-600">₹{((financeData?.overview?.pointsIssued || 0) - (financeData?.overview?.pointsRedeemed || 0)).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="overflow-x-auto border-t border-gray-100">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{width: '40px'}}><input type="checkbox" className="rounded border-gray-300" /></th>
                                    <th>Transaction ID</th>
                                    <th>Date & Time</th>
                                    <th>Type</th>
                                    <th>Member ID</th>
                                    <th>Name</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financeData?.transactions?.map((row: any) => (
                                    <tr key={row.id}>
                                        <td style={{width: '40px'}}><input type="checkbox" className="rounded border-gray-300" /></td>
                                        <td className="font-mono text-xs text-gray-400">{row.id}</td>
                                        <td className="text-gray-500 text-xs">{row.date} 10:30 AM</td>
                                        <td><span className={`badge ${row.typeBadge}`}>{row.type}</span></td>
                                        <td className="font-mono text-xs">MEM{(row.userId || '001').toString().slice(-3)}</td>
                                        <td className="text-gray-600">{row.member}</td>
                                        <td className="text-gray-500 text-sm">Purchase Reward</td>
                                        <td className="font-semibold">{row.amount}</td>
                                        <td><span className={`badge ${row.badgeColor}`}>{row.status}</span></td>
                                        <td className="py-3 text-sm">
                                            <div className="flex gap-2">
                                                <button className="btn btn-ghost text-red-600 !p-1.5" title="View"><i className="fas fa-eye text-xs"></i></button>
                                                <button className="btn btn-ghost text-emerald-600 !p-1.5" title="Edit"><i className="fas fa-edit text-xs"></i></button>
                                                <button className="btn btn-ghost text-red-500 !p-1.5" title="Cancel"><i className="fas fa-times text-xs"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="mt-4 flex justify-between items-center">
                        <p className="text-sm text-gray-500">Showing 1 to {financeData?.transactions?.length || 0} of 1,234 entries</p>
                        <div className="flex gap-1">
                            <button className="btn btn-secondary">Previous</button>
                            <button className="btn btn-primary">1</button>
                            <button className="btn btn-secondary">2</button>
                            <button className="btn btn-secondary">3</button>
                            <button className="btn btn-secondary">Next</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Compliance & KYC */}
            {activeTab === 2 && (
                <div className="widget-card rounded-xl shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">KYC Compliance List</h3>
                        <div className="flex gap-3">
                            <select value={compFilters.status} onChange={(e) => setCompFilters({ ...compFilters, status: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                                <option>All Status</option>
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <select value={compFilters.type} onChange={(e) => setCompFilters({ ...compFilters, type: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                                <option>All Stakeholders</option>
                                <option>Mechanic</option>
                                <option>Retailer</option>
                                <option>Counter Sales</option>
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Member</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Type</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Document</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingComp ? (
                                    <tr><td colSpan={6} className="py-8 text-center">
                                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                                    </td></tr>
                                ) : complianceData?.length === 0 ? (
                                    <tr><td colSpan={6} className="py-8 text-center text-gray-500">No records found</td></tr>
                                ) : (
                                    complianceData?.map((item: any) => (
                                        <tr key={item.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.member}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{item.type}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{item.document}</td>
                                            <td className="py-3 px-4 text-sm"><span className={`badge ${item.badgeColor}`}>{item.status}</span></td>
                                            <td className="py-3 px-4 text-sm text-gray-500">{item.date}</td>
                                            <td className="py-3 px-4 text-sm">
                                                <button className="text-red-600 hover:text-red-800 text-sm font-medium">Verify</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
