"use client"

import { useState, useMemo } from 'react';
import PageWithTopBar from "@/components/PageWithTopBar";
import { createBoosterSchemeAction } from "@/actions/schemes-actions";
import { toast } from "react-hot-toast";

interface SchemesClientProps {
    initialSchemes: any[];
    masterData: any;
}

export default function SchemesClient({ initialSchemes, masterData }: SchemesClientProps) {
    const [activeTab, setActiveTab] = useState('Booster Scheme');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        targetType: 'Category' as 'Category' | 'SubCategory' | 'SKU',
        targetIds: [] as number[],
        rewardType: 'Fixed' as 'Fixed' | 'Percentage',
        rewardValue: 0,
        audienceIds: [] as number[],
        geoScope: {
            zones: [] as string[],
            states: [] as string[],
            cities: [] as string[]
        }
    });

    const tabs = ['Booster Scheme', 'Slab Based', 'Cross-Sell'];

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createBoosterSchemeAction(formData);
            if (res.success) {
                toast.success("Booster Scheme created successfully!");
                setIsCreateModalOpen(false);
                // Reset form
            } else {
                toast.error(res.error || "Failed to create scheme");
            }
        } catch (err) {
            toast.error("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const toggleTargetId = (id: number) => {
        setFormData(prev => ({
            ...prev,
            targetIds: prev.targetIds.includes(id) 
                ? prev.targetIds.filter(i => i !== id) 
                : [...prev.targetIds, id]
        }));
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

    return (
        <PageWithTopBar title="Schemes & Promotions" subtitle="Manage loyalty rewards and booster programs">
            <div className="space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-gray-100/50 rounded-2xl w-fit border border-gray-200/50 backdrop-blur-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                                activeTab === tab 
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
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-200 transition-all active:scale-95"
                        >
                            <i className="fas fa-plus-circle"></i>
                            Create {activeTab}
                        </button>
                    </div>

                    <div className="p-8">
                        {activeTab === 'Booster Scheme' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {initialSchemes.filter(s => s.schemeType === 'Booster' || !s.schemeType).map((scheme, i) => (
                                    <div key={scheme.id || i} className="group relative bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-gray-100 transition-all duration-500 border-b-4 border-b-red-500/20">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-red-50 rounded-2xl text-red-600 group-hover:scale-110 transition-transform">
                                                <i className="fas fa-rocket text-xl"></i>
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
                                                <span className="text-gray-700">{new Date(scheme.startDate).toLocaleDateString()} - {new Date(scheme.endDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <i className="fas fa-coins text-red-500 w-4"></i>
                                                <span className="text-gray-400">Reward:</span>
                                                <span className="text-red-600 font-bold">
                                                    {scheme.config?.booster?.rewardValue}
                                                    {scheme.config?.booster?.rewardType === 'Percentage' ? '%' : ' Pts'} Top-up
                                                </span>
                                            </div>
                                        </div>

                                        <button className="w-full mt-6 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-2">
                                            View Details
                                            <i className="fas fa-chevron-right text-[10px]"></i>
                                        </button>
                                    </div>
                                ))}

                                {initialSchemes.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
                                        <i className="fas fa-gift text-6xl text-gray-300 mb-4"></i>
                                        <p className="text-gray-500 font-medium italic">No schemes found. Start by creating one!</p>
                                    </div>
                                )}
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

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200">
                                    <i className="fas fa-rocket text-xl"></i>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Create Booster Scheme</h2>
                                    <p className="text-sm text-gray-500 font-medium">Configure top-up rewards for specific targets</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors">
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
                                        onChange={e => setFormData({...formData, name: e.target.value})}
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
                                            onChange={e => setFormData({...formData, startDate: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">End Date</label>
                                        <input 
                                            type="date" 
                                            required
                                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 font-bold"
                                            value={formData.endDate}
                                            onChange={e => setFormData({...formData, endDate: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Target Selection */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                        1. Select Targets
                                    </label>
                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        {['Category', 'SubCategory', 'SKU'].map(t => (
                                            <button 
                                                key={t}
                                                type="button"
                                                onClick={() => setFormData({...formData, targetType: t as any, targetIds: []})}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.targetType === t ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[200px] overflow-y-auto p-2 bg-gray-50 rounded-3xl border border-gray-100">
                                    {(formData.targetType === 'Category' ? masterData.categories : 
                                      formData.targetType === 'SubCategory' ? masterData.subCategories : 
                                      masterData.skus).map((item: any) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => toggleTargetId(item.id)}
                                            className={`p-4 rounded-2xl text-left transition-all duration-300 border-2 ${
                                                formData.targetIds.includes(item.id)
                                                ? 'bg-red-50 border-red-500 text-red-700 shadow-md shadow-red-100 scale-[0.98]'
                                                : 'bg-white border-transparent text-gray-600 hover:border-gray-200 shadow-sm'
                                            }`}
                                        >
                                            <p className="text-[10px] font-black uppercase truncate">{item.name}</p>
                                            {item.skuCode && <p className="text-[8px] opacity-60 mt-0.5">{item.skuCode}</p>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section 3: Reward Configuration */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-end">
                                <div className="md:col-span-2 p-8 bg-gradient-to-br from-red-600 to-red-700 rounded-[32px] text-white shadow-xl shadow-red-200">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-black uppercase tracking-widest">2. Reward Config</h3>
                                        <div className="flex bg-white/20 p-1 rounded-xl">
                                            {['Fixed', 'Percentage'].map(r => (
                                                <button 
                                                    key={r}
                                                    type="button"
                                                    onClick={() => setFormData({...formData, rewardType: r as any})}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.rewardType === r ? 'bg-white text-red-600' : 'text-white/80'}`}
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
                                                onChange={e => setFormData({...formData, rewardValue: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                        <div className="text-4xl font-black opacity-40">
                                            {formData.rewardType === 'Percentage' ? '%' : 'PTS'}
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold mt-4 opacity-70 italic">* This reward will be added as a top-up on top of the base points.</p>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                        3. User Audience
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {masterData.userTypes
                                            .filter((ut: any) => ['retailer', 'mechanic'].includes(ut.name.toLowerCase()))
                                            .map((ut: any) => (
                                            <button
                                                key={ut.id}
                                                type="button"
                                                onClick={() => toggleAudienceId(ut.id)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border-2 ${
                                                    formData.audienceIds.includes(ut.id)
                                                    ? 'bg-gray-800 border-gray-800 text-white shadow-lg'
                                                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                                                }`}
                                            >
                                                {ut.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Geography */}
                            <div className="space-y-6">
                                <label className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                    4. Geographical Scope
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-gray-50 rounded-[32px] border border-gray-100">
                                    {/* Zones */}
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase ml-1">Zones</p>
                                        <div className="flex flex-wrap gap-2">
                                            {masterData.geography.zones.map((z: string, idx: number) => (
                                                <button key={`${z}-${idx}`} type="button" onClick={() => toggleGeo('zones', z)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.geoScope.zones.includes(z) ? 'bg-red-500 text-white' : 'bg-white text-gray-500'}`}>
                                                    {z}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* States */}
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase ml-1">States</p>
                                        <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                                            {masterData.geography.states
                                                .filter((s: any) => formData.geoScope.zones.length === 0 || formData.geoScope.zones.includes(s.zone))
                                                .map((s: any, idx: number) => (
                                                <button key={`${s.name}-${idx}`} type="button" onClick={() => toggleGeo('states', s.name)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.geoScope.states.includes(s.name) ? 'bg-red-500 text-white' : 'bg-white text-gray-500'}`}>
                                                    {s.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Cities */}
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase ml-1">Cities</p>
                                        <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                                            {masterData.geography.cities
                                                .filter((c: any) => formData.geoScope.states.length === 0 || formData.geoScope.states.includes(c.state))
                                                .map((c: any, idx: number) => (
                                                <button key={`${c.name}-${idx}`} type="button" onClick={() => toggleGeo('cities', c.name)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.geoScope.cities.includes(c.name) ? 'bg-red-500 text-white' : 'bg-white text-gray-500'}`}>
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
                                    className="px-12 py-4 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}
                                    Launch Scheme
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageWithTopBar>
    );
}
