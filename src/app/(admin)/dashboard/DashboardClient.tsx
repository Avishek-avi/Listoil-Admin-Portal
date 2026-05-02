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
import { getDashboardDataAction, getDashboardLocationsAction } from "@/actions/dashboard-actions";

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
    const [performerTab, setPerformerTab] = useState<'retailer' | 'mechanic'>('retailer');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');

    // -- Fetch Locations --
    const { data: locations } = useQuery({
        queryKey: ['dashboard-locations'],
        queryFn: () => getDashboardLocationsAction(),
        staleTime: 1000 * 60 * 60 // 1 hour
    });

    // -- Fetch Dashboard Data --
    const { data: dashboardData, isLoading, error } = useQuery({
        queryKey: ['dashboard-data', growthRange, transactionRange, selectedState, selectedCity],
        queryFn: () => getDashboardDataAction({ 
            growthRange, 
            transactionRange,
            state: selectedState,
            city: selectedCity
        }),
        refetchInterval: 30000
    });

    const filteredCities = Array.from(new Map((locations?.cities || [])
        .filter(c => !selectedState || c.state === selectedState)
        .map(c => [c.city, c])).values());

    if (sessionStatus === "loading" || isLoading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (error || dashboardData?.error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg m-6">
                <p className="font-bold">Failed to load dashboard data</p>
                <p className="text-xs mt-1 text-red-500 font-mono">
                    {error?.message || dashboardData?.errorMessage || "An unknown error occurred"}
                </p>
            </div>
        );
    }

    // -- Chart Configs --
    const charts = dashboardData?.charts;
    
    const lineChartData = {
        labels: charts?.memberGrowth?.labels || [],
        datasets: [
            {
                label: "Retailers",
                data: charts?.memberGrowth?.retailer || [],
                borderColor: "#D6001C",
                backgroundColor: "rgba(214, 0, 28, 0.1)",
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: "#D6001C",
                yAxisID: 'y',
            },
            {
                label: "Mechanics",
                data: charts?.memberGrowth?.mechanic || [],
                borderColor: "#0957C3",
                backgroundColor: "rgba(9, 87, 195, 0.1)",
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: "#0957C3",
                yAxisID: 'y1',
            },
        ],
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: { 
                display: true, 
                position: 'bottom' as const,
                labels: {
                    usePointStyle: true,
                    pointStyle: 'rectRounded',
                    boxWidth: 8,
                    padding: 20,
                    font: { size: 10, weight: 'bold' as any }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#111827',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 10,
                displayColors: true,
                usePointStyle: true,
            }
        },
        scales: {
            y: { 
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                beginAtZero: true, 
                grid: { display: true, color: '#f3f4f6' },
                title: { display: true, text: 'Retailers', font: { size: 10, weight: 'bold' as any } }
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                beginAtZero: true,
                grid: { drawOnChartArea: false },
                title: { display: true, text: 'Mechanics', font: { size: 10, weight: 'bold' as any } }
            },
            x: { grid: { display: false } },
        },
    };

    const barChartData = {
        labels: charts?.pointsTransactions?.labels || [],
        datasets: [
            {
                label: "Retailer Points Issued",
                data: charts?.pointsTransactions?.retailer || [],
                backgroundColor: "#9D66FF",
                borderRadius: 4,
                barPercentage: 0.8,
                categoryPercentage: 0.8,
            },
            {
                label: "Mechanic Points Issued",
                data: charts?.pointsTransactions?.mechanic || [],
                backgroundColor: "#5C93FF",
                borderRadius: 4,
                barPercentage: 0.8,
                categoryPercentage: 0.8,
            },
            {
                label: "Points Redeemed",
                data: charts?.pointsTransactions?.redeemed || [],
                backgroundColor: "#FF9552",
                borderRadius: 4,
                barPercentage: 0.8,
                categoryPercentage: 0.8,
            },
        ],
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                display: true, 
                position: "bottom" as const, 
                labels: { 
                    usePointStyle: true,
                    pointStyle: 'rectRounded',
                    boxWidth: 8, 
                    padding: 20,
                    font: { size: 10, weight: 'bold' as any } 
                } 
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#111827',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 10,
                displayColors: true,
                usePointStyle: true,
            }
        },
        scales: {
            y: { 
                beginAtZero: true, 
                grid: { display: true, color: '#f3f4f6' },
                ticks: {
                    callback: (value: any) => {
                        if (value >= 1000) return (value / 1000) + 'K';
                        return value;
                    },
                    font: { size: 10 }
                }
            },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
    };

    const stats = dashboardData?.stats;
    const activePercent = stats?.totalMembers ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0;

    // Formatting Helpers
    const formatPoints = (val: number) => {
        if (!val) return '0';
        if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
        return val.toLocaleString();
    };

    const formatCurrency = (val: number) => {
        if (!val) return '₹0';
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
        return `₹${val.toLocaleString()}`;
    };

    return (
        <div className="space-y-6">
            {/* ① Context & Filter Bar */}
            <div className="widget-card rounded-xl p-4 bg-white shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold flex items-center gap-2">
                            <i className="fas fa-user-shield"></i> Admin View
                        </div>
                        <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1">
                            <i className="fas fa-globe"></i> National
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">State</label>
                            <select 
                                value={selectedState}
                                onChange={(e) => {
                                    setSelectedState(e.target.value);
                                    setSelectedCity(''); // Reset city on state change
                                }}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-red-500 outline-none min-w-[120px]"
                            >
                                <option value="">All States</option>
                                {Array.from(new Set(locations?.states || [])).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">City</label>
                            <select 
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-red-500 outline-none min-w-[120px]"
                            >
                                <option value="">All Cities</option>
                                {filteredCities.map(c => (
                                    <option key={`${c.state}-${c.city}`} value={c.city}>{c.city}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ② Top Level Health KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-stretch">
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg bg-white border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Total Members</span>
                        <i className="fas fa-users text-blue-500 text-xs"></i>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stats?.totalMembers?.toLocaleString() ?? 0}</p>
                    <p className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1">
                        <i className="fas fa-arrow-up"></i> +0.0%
                    </p>
                </div>
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg bg-white border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Active (30d)</span>
                        <i className="fas fa-user-check text-green-500 text-xs"></i>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stats?.activeMembers?.toLocaleString() ?? 0}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">{activePercent}% active</p>
                </div>
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg bg-white border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Points Issued</span>
                        <i className="fas fa-coins text-yellow-500 text-xs"></i>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stats?.totalPointsIssued?.toLocaleString() ?? 0}</p>
                    <p className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1">
                        <i className="fas fa-arrow-up"></i> +0.0%
                    </p>
                </div>
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg bg-white border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Redeemed</span>
                        <i className="fas fa-gift text-purple-500 text-xs"></i>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stats?.pointsRedeemed?.toLocaleString() ?? 0}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">-- burn rate</p>
                </div>
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg bg-white border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">KYC Pending</span>
                        <i className="fas fa-clock text-orange-500 text-xs"></i>
                    </div>
                    <p className="text-xl font-bold text-orange-500">{stats?.kycPending?.toLocaleString() ?? 0}</p>
                    <p className="text-[10px] text-red-500 font-bold mt-1">Urgent Action</p>
                </div>
                <div className="widget-card rounded-xl p-4 transition hover:-translate-y-1 hover:shadow-lg bg-white border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Redemptions</span>
                        <i className="fas fa-hourglass-half text-red-500 text-xs"></i>
                    </div>
                    <p className="text-xl font-bold text-red-500">{dashboardData?.pendingApprovalsCount ?? 0}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">Awaiting review</p>
                </div>
            </div>

            {/* ③ Segment Overview: Retailers vs Mechanics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Retailer Card */}
                <div className="widget-card rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden flex flex-col transition hover:shadow-md">
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                                    <i className="fas fa-store text-red-600 text-lg"></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">Retailers</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Invoice Sync · Points via Purchase</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-full border border-red-100 uppercase tracking-wider">Invoice-based</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 flex-1">
                            <div className="bg-gray-50/50 rounded-xl p-4 flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Enrolled</p>
                                <p className="text-2xl font-bold text-gray-900 leading-none">{dashboardData?.segments?.retailer?.total?.toLocaleString() ?? 0}</p>
                                <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                                    <i className="fas fa-arrow-up text-[8px]"></i> +0 this month
                                </p>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl p-4 flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active (Invoiced)</p>
                                <p className="text-2xl font-bold text-gray-900 leading-none">{dashboardData?.segments?.retailer?.active?.toLocaleString() ?? 0}</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-2">
                                    {dashboardData?.segments?.retailer?.total ? Math.round((dashboardData.segments.retailer.active / dashboardData.segments.retailer.total) * 100) : 0}% active rate
                                </p>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl p-4 flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice Value</p>
                                <p className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(dashboardData?.segments?.retailer?.invoiceValue)}</p>
                                <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                                    <i className="fas fa-arrow-up text-[8px]"></i> +0% vs last mo
                                </p>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl p-4 flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Points Issued</p>
                                <p className="text-2xl font-bold text-gray-900 leading-none">{formatPoints(dashboardData?.segments?.retailer?.points)}</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-2">via automated sync</p>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-3.5 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center gap-5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            KYC Approved: <span className="text-gray-900">{dashboardData?.segments?.retailer?.kyc?.approved ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                            KYC Pending: <span className="text-gray-900">{dashboardData?.segments?.retailer?.kyc?.pending ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            Blocked: <span className="text-gray-900">{dashboardData?.segments?.retailer?.kyc?.blocked ?? 0}</span>
                        </div>
                    </div>
                </div>

                {/* Mechanic Card */}
                <div className="widget-card rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden flex flex-col transition hover:shadow-md">
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <i className="fas fa-user-gear text-blue-600 text-lg"></i>
                                </div>
                                Exception and QR Scan · Points per Scan
                            </div>
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100 uppercase tracking-wider">Scan-based</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 flex-1">
                            <div className="bg-gray-50/50 rounded-xl p-4 flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Enrolled</p>
                                <p className="text-2xl font-bold text-gray-900 leading-none">{dashboardData?.segments?.mechanic?.total?.toLocaleString() ?? 0}</p>
                                <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                                    <i className="fas fa-arrow-up text-[8px]"></i> +0 this month
                                </p>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl p-4 flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active (Scanned)</p>
                                <p className="text-2xl font-bold text-gray-900 leading-none">{dashboardData?.segments?.mechanic?.active?.toLocaleString() ?? 0}</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-2">
                                    {dashboardData?.segments?.mechanic?.total ? Math.round((dashboardData.segments.mechanic.active / dashboardData.segments.mechanic.total) * 100) : 0}% active rate
                                </p>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl p-4 flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">QR Scans (30d)</p>
                                <p className="text-2xl font-bold text-gray-900 leading-none">{dashboardData?.segments?.mechanic?.qrScans30d?.toLocaleString() ?? 0}</p>
                                <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                                    <i className="fas fa-arrow-up text-[8px]"></i> +0% this period
                                </p>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl p-4 flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Points Issued</p>
                                <p className="text-2xl font-bold text-gray-900 leading-none">{formatPoints(dashboardData?.segments?.mechanic?.points)}</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-2">via QR scan validation</p>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-3.5 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center gap-5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            KYC Approved: <span className="text-gray-900">{dashboardData?.segments?.mechanic?.kyc?.approved ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                            KYC Pending: <span className="text-gray-900">{dashboardData?.segments?.mechanic?.kyc?.pending ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            Blocked: <span className="text-gray-900">{dashboardData?.segments?.mechanic?.kyc?.blocked ?? 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ④ Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="widget-card rounded-xl p-6 bg-white shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Enrollment Trend</h3>
                            <p className="text-[10px] text-gray-400 font-bold">Retailers vs Mechanics registrations</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Live Trend</span>
                        </div>
                    </div>
                    <div className="h-72">
                        <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                </div>
                <div className="widget-card rounded-xl p-6 bg-white shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Points Flow by Segment</h3>
                            <p className="text-[10px] text-gray-400 font-bold">Issued (Retailer + Mechanic) vs Redeemed</p>
                        </div>
                    </div>
                    <div className="h-72">
                        <Bar data={barChartData} options={barChartOptions} />
                    </div>
                </div>
            </div>

            {/* ⑤ Bottom Row: Top Performers | Pending Actions | Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6 items-stretch">
                {/* Top Performers Card */}
                <div className="widget-card rounded-xl p-6 bg-white shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-gray-900">Top Performers</h3>
                        <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
                            <button 
                                onClick={() => setPerformerTab('retailer')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${performerTab === 'retailer' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Retailers
                            </button>
                            <button 
                                onClick={() => setPerformerTab('mechanic')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${performerTab === 'mechanic' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Mechanics
                            </button>
                        </div>
                    </div>
                    <div className="space-y-6 flex-1">
                        {(dashboardData?.topPerformers?.[performerTab === 'retailer' ? 'retailers' : 'mechanics'] || []).map((p: any, i: number) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 group-hover:text-[#7C3AED] transition-colors">{p.name}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">{p.location} · {p.id}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900">{performerTab === 'retailer' ? formatCurrency(p.val) : p.pts}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">
                                        {performerTab === 'retailer' ? 'invoice value' : 'scanned pts'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pending Actions Card */}
                <div className="widget-card rounded-xl p-6 bg-white shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-gray-900">Pending Actions</h3>
                        <span className="px-2.5 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-full border border-orange-100">
                            {dashboardData?.pendingApprovalsCount ?? 0} items
                        </span>
                    </div>
                    <div className="space-y-4 flex-1">
                        <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-colors" onClick={() => router.push('/members')}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-200">
                                    <i className="fas fa-id-card text-white text-sm"></i>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">KYC Approvals</p>
                                    <p className="text-[10px] text-orange-600 font-bold">{dashboardData?.pendingApprovals?.kyc?.mechanics} Mechanics · {dashboardData?.pendingApprovals?.kyc?.retailers} Retailers</p>
                                </div>
                            </div>
                            <span className="text-sm font-bold text-orange-700 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                                {dashboardData?.pendingApprovals?.kyc?.count}
                            </span>
                        </div>

                        <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 flex items-center justify-between cursor-pointer hover:bg-red-50 transition-colors" onClick={() => router.push('/process')}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-200">
                                    <i className="fas fa-gift text-white text-sm"></i>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Redemption Queue</p>
                                    <p className="text-[10px] text-red-600 font-bold">{formatCurrency(dashboardData?.pendingApprovals?.redemptions?.value)} total value</p>
                                </div>
                            </div>
                            <span className="text-sm font-bold text-red-700 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                                {dashboardData?.pendingApprovals?.redemptions?.count}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Program Activity Card */}
                <div className="widget-card rounded-xl p-6 bg-white shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-gray-900">Program Activity</h3>
                        <button className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest">View All</button>
                    </div>
                    <div className="space-y-5 flex-1">
                        {(dashboardData?.recentActivity || []).length > 0 ? (
                            dashboardData.recentActivity.slice(0, 6).map((activity: any, i: number) => {
                                const isPoints = activity.type?.toLowerCase().includes('points') || activity.type?.toLowerCase().includes('transaction');
                                const isKYC = activity.type?.toLowerCase().includes('kyc');
                                
                                return (
                                    <div key={i} className="flex items-center justify-between group cursor-default">
                                        <div className="flex gap-4 items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${
                                                isPoints ? 'bg-blue-50' : isKYC ? 'bg-orange-50' : 'bg-green-50'
                                            }`}>
                                                <i className={`fas ${
                                                    isPoints ? 'fa-gift text-blue-500' : 
                                                    isKYC ? 'fa-check-circle text-orange-500' : 
                                                    'fa-user-plus text-green-500'
                                                } text-[10px]`}></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 leading-tight group-hover:text-blue-600 transition-colors">
                                                    {activity.member}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-medium">{activity.time} · {activity.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${activity.ptClass || 'text-gray-900'}`}>{activity.points}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{activity.type}</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-10">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <i className="fas fa-history text-gray-300"></i>
                                </div>
                                <p className="text-xs text-gray-400 font-medium">No recent activity found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
