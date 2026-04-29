"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
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
    Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { useQuery } from "@tanstack/react-query";
import { getDashboardDataAction } from "@/actions/dashboard-actions";

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function DashboardClient() {
    const router = useRouter();
    const { data: session, status: sessionStatus } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });

    // -- State for Charts & Filters --
    const [growthRange, setGrowthRange] = useState('7d');
    const [transactionRange, setTransactionRange] = useState('7d');

    // -- Fetch Dashboard Data --
    const { data: dashboardData, isLoading, error } = useQuery({
        queryKey: ['dashboard-data', growthRange, transactionRange],
        queryFn: () => getDashboardDataAction({ growthRange, transactionRange }),
        // Poll every 30 seconds for live-like updates
        refetchInterval: 30000
    });



    if (sessionStatus === "loading" || isLoading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                Failed to load dashboard data. Please try again later.
            </div>
        );
    }

        const iconBox = (bg: string, icon: string) => (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <i className={`${icon} text-white text-sm`}></i>
            </div>
        );



    // -- Chart Configs --
    const charts = dashboardData?.charts;
    
    const lineChartData = {
        labels: charts?.memberGrowth?.labels || [],
        datasets: [
            {
                label: "New Members",
                data: charts?.memberGrowth?.data || [],
                borderColor: "#D6001C",
                backgroundColor: "rgba(214, 0, 28, 0.1)",
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: "#D6001C"
            },
        ],
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: { beginAtZero: true, grid: { display: false } },
            x: { grid: { display: false } },
        },
    };

    const barChartData = {
        labels: charts?.pointsTransactions?.labels || [],
        datasets: [
            {
                label: "Points Earned",
                data: charts?.pointsTransactions?.earned || [],
                backgroundColor: "#0957C3",
                borderRadius: 4,
            },
            {
                label: "Points Redeemed",
                data: charts?.pointsTransactions?.redeemed || [],
                backgroundColor: "#D6001C",
                borderRadius: 4,
            },
        ],
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: "bottom" as const },
        },
        scales: {
            y: { beginAtZero: true, grid: { display: false } },
            x: { grid: { display: false } },
        },
    };


    const stats = dashboardData?.stats;

    // Calculate percentages for bars
    const activePercent = stats?.totalMembers ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0;
    const blockedPercent = stats?.totalMembers ? Math.round((stats.blockedMembers / stats.totalMembers) * 100) : 0;
    const kycPercent = stats?.totalMembers ? Math.round((stats.kycApproved / stats.totalMembers) * 100) : 0;

    return (
        <div>
            {/* Dashboard Content */}

            {/* ② Program Health KPIs (6 compact cards) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">Total Enrolled</span>
                        <i className="fas fa-users text-red-500 text-sm"></i>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stats?.totalMembers?.toLocaleString() ?? 0}</p>
                    <p className="text-xs text-green-600 mt-1"><i className="fas fa-arrow-up mr-1"></i>+0 this week</p>
                </div>
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">Active (30d)</span>
                        <i className="fas fa-user-check text-green-500 text-sm"></i>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stats?.activeMembers?.toLocaleString() ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">{activePercent}% engagement</p>
                </div>
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">Points Issued</span>
                        <i className="fas fa-coins text-yellow-500 text-sm"></i>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stats?.totalPointsIssued?.toLocaleString() ?? 0}</p>
                    <p className="text-xs text-green-600 mt-1"><i className="fas fa-arrow-up mr-1"></i>+0%</p>
                </div>
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">Redeemed</span>
                        <i className="fas fa-gift text-purple-500 text-sm"></i>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stats?.pointsRedeemed?.toLocaleString() ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">-- burn rate</p>
                </div>
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">KYC Pending</span>
                        <i className="fas fa-clock text-orange-500 text-sm"></i>
                    </div>
                    <p className="text-xl font-bold text-orange-500">{stats?.kycPending?.toLocaleString() ?? 0}</p>
                    <p className="text-xs text-red-500 mt-1"><i className="fas fa-exclamation-circle mr-1"></i>-- urgent</p>
                </div>
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">Redemption Q</span>
                        <i className="fas fa-hourglass-half text-red-500 text-sm"></i>
                    </div>
                    <p className="text-xl font-bold text-red-500">{dashboardData?.pendingApprovalsCount ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Pending approval</p>
                </div>
            </div>

            {/* ③ Segment Overview (Retailers vs Mechanics) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Retailer Segment */}
                <div className="widget-card rounded-xl p-6 transition hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Retailer Overview</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Invoice Based</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-red-50 rounded-lg">
                            <p className="text-xs text-gray-500">Total Points Issued</p>
                            <p className="text-xl font-bold text-red-600">{dashboardData?.segments?.retailer?.points?.toLocaleString() ?? 0}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-xs text-gray-500">Total Retailers</p>
                            <p className="text-xl font-bold text-green-600">{dashboardData?.segments?.retailer?.total ?? 0}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Active Retailers</span>
                            <span className="font-semibold">{dashboardData?.segments?.retailer?.active ?? 0}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${dashboardData?.segments?.retailer?.total ? (dashboardData.segments.retailer.active / dashboardData.segments.retailer.total) * 100 : 0}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">KYC Compliance</span>
                            <span className="font-semibold">{dashboardData?.segments?.retailer?.kycCompliance ?? 0}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${dashboardData?.segments?.retailer?.kycCompliance ?? 0}%` }}></div>
                        </div>
                    </div>
                    <button 
                        onClick={() => router.push('/members?type=retailer')}
                        className="w-full mt-6 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                        View Detailed Analytics
                    </button>


                </div>

                {/* Mechanic Segment */}
                <div className="widget-card rounded-xl p-6 transition hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Mechanic Overview</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">Scan Based</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-orange-50 rounded-lg">
                            <p className="text-xs text-gray-500">Scan Points Issued</p>
                            <p className="text-xl font-bold text-orange-600">{dashboardData?.segments?.mechanic?.points?.toLocaleString() ?? 0}</p>
                        </div>
                        <div className="p-3 bg-teal-50 rounded-lg">
                            <p className="text-xs text-gray-500">Total Scans</p>
                            <p className="text-xl font-bold text-teal-600">{stats?.totalScans?.toLocaleString() ?? 0}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Active Mechanics</span>
                            <span className="font-semibold">{dashboardData?.segments?.mechanic?.active?.toLocaleString() ?? 0}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${dashboardData?.segments?.mechanic?.total ? (dashboardData.segments.mechanic.active / dashboardData.segments.mechanic.total) * 100 : 0}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">KYC Compliance</span>
                            <span className="font-semibold">{dashboardData?.segments?.mechanic?.kycCompliance ?? 0}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${dashboardData?.segments?.mechanic?.kycCompliance ?? 0}%` }}></div>
                        </div>
                    </div>
                    <button 
                        onClick={() => router.push('/members?type=mechanic')}
                        className="w-full mt-6 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                        View Detailed Analytics
                    </button>


                </div>
            </div>

            {/* ④ CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Member Growth Chart */}
                <div className="widget-card rounded-xl shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Member Growth</h3>
                        <select 
                            value={growthRange}
                            onChange={(e) => setGrowthRange(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 outline-none"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 3 months</option>
                            <option value="365d">Last year</option>
                        </select>
                    </div>
                    <div className="h-64">
                        <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                </div>

                {/* Points Transaction Chart */}
                <div className="widget-card rounded-xl shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Points Transactions</h3>
                        <select 
                            value={transactionRange}
                            onChange={(e) => setTransactionRange(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 outline-none"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 3 months</option>
                            <option value="365d">Last year</option>
                        </select>
                    </div>

                    <div className="h-64">
                        <Bar data={barChartData} options={barChartOptions} />
                    </div>
                </div>
            </div>

            {/* Admin Activity Overview (New Section) */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Internal Admin Oversight</h3>
                    <div className="h-px flex-1 bg-gray-100"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="widget-card rounded-xl p-4 bg-gray-50/50 border-dashed border-2 border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-400">Registered Admins</span>
                            <i className="fas fa-user-shield text-gray-400 text-xs"></i>
                        </div>
                        <p className="text-lg font-bold text-gray-700">{dashboardData?.adminStats?.totalAdmins ?? 0}</p>
                    </div>
                    <div className="widget-card rounded-xl p-4 bg-gray-50/50 border-dashed border-2 border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-400">Active Admin Sessions</span>
                            <i className="fas fa-key text-gray-400 text-xs"></i>
                        </div>
                        <p className="text-lg font-bold text-gray-700">{dashboardData?.adminStats?.activeAdmins ?? 0}</p>
                    </div>
                </div>
            </div>

            {/* 4. QUICK ACTIONS & RECENT TRANSACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Quick Actions */}
                <div className="widget-card rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => router.push('/members')}
                            className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition flex items-center justify-between group"
                        >
                            <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center mr-3 flex-shrink-0"><i className="fas fa-user-plus text-white text-xs"></i></div>
                                  <span className="text-sm font-medium text-gray-700">Add New Member</span>
                            </div>
                               <i className="fas fa-chevron-right text-gray-300 group-hover:text-red-500 transition text-xs"></i>
                        </button>
                            <button
                                onClick={() => router.push('/qr-management')}
                                className="w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between group hover:bg-emerald-50"
                                style={{background:"rgba(16,185,129,0.05)", border:"1px solid rgba(16,185,129,0.1)"}}
                            >
                            <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center mr-3 flex-shrink-0"><i className="fas fa-qrcode text-white text-xs"></i></div>
                                  <span className="text-sm font-medium text-gray-700">Sync QR Codes</span>
                            </div>
                               <i className="fas fa-chevron-right text-gray-300 group-hover:text-emerald-500 transition text-xs"></i>
                        </button>
                            <button
                                onClick={() => router.push('/schemes-campaigns')}
                                className="w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between group hover:bg-violet-50"
                                style={{background:"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.1)"}}
                            >
                            <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center mr-3 flex-shrink-0"><i className="fas fa-bullhorn text-white text-xs"></i></div>
                                  <span className="text-sm font-medium text-gray-700">Create Campaign</span>
                            </div>
                               <i className="fas fa-chevron-right text-gray-300 group-hover:text-violet-500 transition text-xs"></i>
                        </button>
                            <button
                                onClick={() => router.push('/mis-analytics?tab=reports')}
                                className="w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between group hover:bg-orange-50"
                                style={{background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.1)"}}
                            >
                            <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center mr-3 flex-shrink-0"><i className="fas fa-chart-line text-white text-xs"></i></div>
                                  <span className="text-sm font-medium text-gray-700">View Reports</span>
                            </div>
                               <i className="fas fa-chevron-right text-gray-300 group-hover:text-orange-500 transition text-xs"></i>
                        </button>
                    </div>
                </div>

                {/* Recent Transactions Table */}
                <div className="widget-card rounded-xl shadow p-6 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                        <button className="text-sm text-red-600 hover:text-red-800">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Transaction ID</th>
                                    <th>Member</th>
                                    <th>Type</th>
                                    <th>Points</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData?.recentActivity?.map((row: any) => (
                                    <tr key={row.id}>
                                        <td className="font-mono text-xs text-gray-400">{row.id}</td>
                                        <td className="font-medium">{row.member}</td>
                                        <td>
                                            <span className={`badge ${row.typeClass}`}>{row.type}</span>
                                        </td>
                                        <td className={`font-semibold ${row.ptClass}`}>{row.points}</td>
                                        <td className="text-gray-400 text-xs">{row.time}</td>
                                    </tr>
                                ))}
                                {(!dashboardData?.recentActivity || dashboardData.recentActivity.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="py-4 text-center text-gray-500">
                                            No recent transactions found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 5. TOP PERFORMERS & PENDING APPROVALS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                <div className="widget-card rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers This Month</h3>
                    <div className="space-y-4">
                        {dashboardData?.topPerformers?.map((p: any, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className={`h-10 w-10 rounded-full ${p.bg} flex items-center justify-center mr-3`}>
                                        <span className={`${p.text} font-bold`}>{p.initial}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                                        <p className="text-xs text-gray-500">{p.pts}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-green-600">{p.change}</p>
                                    <p className="text-xs text-gray-400">vs last month</p>
                                </div>
                            </div>
                        ))}
                        {(!dashboardData?.topPerformers || dashboardData.topPerformers.length === 0) && (
                            <p className="text-sm text-gray-500 text-center">No performance data available</p>
                        )}
                    </div>
                </div>

                {/* Pending Approvals */}
                <div className="widget-card rounded-xl shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                        <span className="badge badge-warning">{dashboardData?.pendingApprovalsCount ?? 0} items</span>
                    </div>
                    <div className="space-y-3">
                        {dashboardData?.pendingApprovalsCount > 0 ? (
                            <>
                                {dashboardData.pendingApprovals.map((item: any, idx: number) => (
                                    <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${item.type === 'KYC' ? 'bg-orange-50' : 'bg-red-50'}`}>
                                        <div>
                                            <p className="text-sm font-medium">{item.label}</p>
                                            <p className="text-xs text-gray-500">{item.subLabel}</p>
                                        </div>
                                        <button 
                                            onClick={() => router.push(item.type === 'KYC' ? `/members?type=${item.label.includes('Retailer') ? 'retailer' : 'mechanic'}&kycStatus=Pending` : '/process?tab=1')}
                                            className={`text-xs font-medium hover:underline ${item.type === 'KYC' ? 'text-orange-600' : 'text-red-600'}`}
                                        >
                                            Review
                                        </button>

                                    </div>
                                ))}

                                <div className="text-center py-2">
                                    <p className="text-sm text-gray-600 mb-2">
                                        {dashboardData.pendingApprovalsCount} pending requests total
                                    </p>
                                    <button className="text-sm text-red-600 hover:text-red-800 font-medium">
                                        View All Approvals
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500 text-center">No pending approvals</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
