'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getConfigurationAction,
    saveCreativeAction,
    deleteCreativeAction,
    updateReferralGlobalConfigAction,
    updateUserTypeReferralConfigAction
} from '@/actions/configuration-actions';
import { uploadFileAction } from '@/actions/file-actions';

export default function ConfigurationClient() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState(1);
    const [userType, setUserType] = useState('');
    const [selectedReferralUserType, setSelectedReferralUserType] = useState<number | ''>('');
    const [isSaving, setIsSaving] = useState(false);

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
    const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"

    const { data: configData } = useQuery({
        queryKey: ['configuration'],
        queryFn: getConfigurationAction
    });

    const creativesByType = useMemo(() => {
        const grouped: Record<number, any[]> = {};
        for (const creative of configData?.creatives || []) {
            const typeId = Number(creative.typeId);
            if (!grouped[typeId]) grouped[typeId] = [];
            grouped[typeId].push(creative);
        }
        return grouped;
    }, [configData?.creatives]);

    const [referralGlobalFields, setReferralGlobalFields] = useState<any>(null);
    const [referralUserTypeFields, setReferralUserTypeFields] = useState<any>(null);

    useEffect(() => {
        if (configData?.referralConfig?.global && !referralGlobalFields) {
            setReferralGlobalFields(configData.referralConfig.global);
        }
    }, [configData, referralGlobalFields]);

    const handleReferralUserTypeChange = (userTypeId: number | '') => {
        setSelectedReferralUserType(userTypeId);
        if (userTypeId === '') {
            setReferralUserTypeFields(null);
        } else {
            const utConfig = configData?.referralConfig?.userTypes?.find((ut: any) => ut.id === userTypeId);
            if (utConfig) {
                setReferralUserTypeFields({
                    isReferralEnabled: utConfig.isReferralEnabled,
                    referralRewardPoints: utConfig.referralRewardPoints,
                    refereeRewardPoints: utConfig.refereeRewardPoints,
                    maxReferrals: utConfig.maxReferrals,
                    referralCodePrefix: utConfig.referralCodePrefix || "",
                    referralValidityDays: utConfig.referralValidityDays || 30,
                    referralSuccessMessage: utConfig.referralSuccessMessage || ""
                });
            } else {
                setReferralUserTypeFields({
                    isReferralEnabled: true,
                    referralRewardPoints: 0,
                    refereeRewardPoints: 0,
                    maxReferrals: 10,
                    referralCodePrefix: "",
                    referralValidityDays: 30,
                    referralSuccessMessage: ""
                });
            }
        }
    };

    const handleSaveReferralConfig = async () => {
        setIsSaving(true);
        try {
            if (referralGlobalFields) {
                await updateReferralGlobalConfigAction(referralGlobalFields);
            }
            if (selectedReferralUserType !== '' && referralUserTypeFields) {
                await updateUserTypeReferralConfigAction(selectedReferralUserType, referralUserTypeFields);
            }
            queryClient.invalidateQueries({ queryKey: ['configuration'] });
            alert('Configuration saved successfully!');
        } catch (error) {
            console.error("Save failed:", error);
            alert('Failed to save configuration.');
        } finally {
            setIsSaving(false);
        }
    };

    // States for Creatives Modal
    const [isCreativeModalOpen, setIsCreativeModalOpen] = useState(false);
    const [currentCreative, setCurrentCreative] = useState<any>(null);
    const [creativeForm, setCreativeForm] = useState({
        id: undefined as number | undefined,
        typeId: 0,
        title: '',
        url: '',
        previewUrl: '',
        carouselName: '',
        displayOrder: 0,
        description: ''
    });

    const creativeSaveMutation = useMutation({
        mutationFn: saveCreativeAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['configuration'] });
            setIsCreativeModalOpen(false);
        }
    });

    const creativeDeleteMutation = useMutation({
        mutationFn: deleteCreativeAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['configuration'] });
        }
    });

    const handleOpenCreativeModal = (typeId: number, creative?: any) => {
        if (creative) {
            setCreativeForm({
                id: creative.id,
                typeId: creative.typeId,
                title: creative.title,
                url: creative.url,
                previewUrl: creative.previewUrl || creative.url,
                carouselName: creative.carouselName,
                displayOrder: creative.displayOrder || 0,
                description: creative.description || ''
            });
        } else {
            setCreativeForm({
                id: undefined,
                typeId: typeId,
                title: '',
                url: '',
                previewUrl: '',
                carouselName: '',
                displayOrder: 0,
                description: ''
            });
        }
        setIsCreativeModalOpen(true);
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'creatives');
            const result = await uploadFileAction(formData);
            if (result.success && result.url) {
                setCreativeForm({ ...creativeForm, url: result.url, previewUrl: result.url });
            } else {
                alert(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveCreative = async () => {
        if (!creativeForm.title || !creativeForm.url || !creativeForm.carouselName) {
            alert('Please fill in all required fields');
            return;
        }
        creativeSaveMutation.mutate(creativeForm);
    };

    const handleDeleteCreative = async (id: number) => {
        if (confirm('Are you sure you want to delete this item?')) {
            creativeDeleteMutation.mutate(id);
        }
    };

    const getCreativeIconClass = (typeName: string) => {
        const name = typeName.toLowerCase();
        if (name.includes('banner')) return 'fas fa-image text-blue-600';
        if (name.includes('video')) return 'fas fa-video text-purple-600';
        if (name.includes('content') || name.includes('doc') || name.includes('library')) return 'fas fa-file-alt text-red-600';
        if (name.includes('gift') || name.includes('reward')) return 'fas fa-gift text-yellow-600';
        return 'fas fa-image text-gray-600';
    };

    const getIconBgColor = (typeName: string) => {
        const name = typeName.toLowerCase();
        if (name.includes('banner')) return 'bg-blue-100';
        if (name.includes('video')) return 'bg-purple-100';
        if (name.includes('content') || name.includes('doc') || name.includes('library')) return 'bg-red-100';
        if (name.includes('gift') || name.includes('reward')) return 'bg-yellow-100';
        return 'bg-gray-100';
    };

    const detectAssetType = (url: string, typeName?: string): 'image' | 'video' | 'pdf' | 'other' => {
        const lowerTypeName = (typeName || '').toLowerCase();
        if (lowerTypeName.includes('video')) return 'video';

        const cleanUrl = (url || '').split('?')[0].toLowerCase();
        if (/\.(png|jpg|jpeg|gif|webp|svg|avif)$/.test(cleanUrl)) return 'image';
        if (/\.(mp4|webm|mov|m4v|avi)$/.test(cleanUrl)) return 'video';
        if (/\.pdf$/.test(cleanUrl)) return 'pdf';
        if (lowerTypeName.includes('banner') || lowerTypeName.includes('image')) return 'image';
        if (lowerTypeName.includes('content') || lowerTypeName.includes('doc') || lowerTypeName.includes('library')) return 'pdf';
        return 'other';
    };

    const renderCreativePreview = (url: string, title: string, typeName: string, compact = false) => {
        const assetType = detectAssetType(url, typeName);

        if (assetType === 'image') {
            return <img src={url} alt={title} loading="lazy" decoding="async" className="w-full h-full object-cover" />;
        }

        if (assetType === 'video') {
            return compact ? (
                <div className="w-full h-full flex items-center justify-center bg-purple-50">
                    <i className="fas fa-video text-purple-600 text-xl"></i>
                </div>
            ) : (
                <video src={url} className="w-full h-full object-cover" controls muted playsInline preload="metadata" />
            );
        }

        if (assetType === 'pdf') {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600">
                    <i className="fas fa-file-pdf text-2xl mb-1"></i>
                    {!compact && <span className="text-xs font-medium">PDF Preview</span>}
                </div>
            );
        }

        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                <i className="fas fa-file text-2xl mb-1"></i>
                {!compact && <span className="text-xs font-medium">Open file to preview</span>}
            </div>
        );
    };

    return (
        <div>
            {/* Tabs */}
            <div className="tabs mb-6">
                {/* <button className={`tab ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>Masters & Schemes</button> */}
                <button className={`tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>Banners & Content</button>
                <button className={`tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>Referral</button>
                {/* <button className={`tab ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>Communication</button> */}
            </div>

            {/* ══════ Masters & Schemes Tab ══════ */}
            {activeTab === 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="widget-card rounded-xl shadow p-6">
                        <h3 className="text-lg font-semibold text-primary mb-4">Redemption Matrix Configuration</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">User Type</label>
                                <select value={userType} onChange={(e) => setUserType(e.target.value)} className={selectClass}>
                                    <option value="">Select User Type</option>
                                    <option value="retailer">Retailer</option>
                                    <option value="csb">CSB</option>
                                    <option value="electrician">Electrician</option>
                                    <option value="staff">Staff</option>
                                </select>
                            </div>

                            {userType && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Min Points / Request for Redemption</label>
                                        <input type="number" defaultValue={0} className={inputClass} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Max Redemption Value / Day</label>
                                        <input type="number" defaultValue={0} className={inputClass} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Max Redemption Value / Week</label>
                                        <input type="number" defaultValue={0} className={inputClass} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Max Redemption Value / Month</label>
                                        <input type="number" defaultValue={0} className={inputClass} />
                                    </div>
                                </div>
                            )}

                            <button className="btn btn-primary">
                                Save Configuration
                            </button>
                        </div>
                    </div>

                    <div className="widget-card rounded-xl shadow p-6">
                        <h3 className="text-lg font-semibold text-primary mb-4">Scheme Management</h3>
                        <div className="space-y-4">
                            {/* Scheme Item 1 */}
                            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">Diwali Bonanza</p>
                                        <p className="text-sm text-gray-500">Double points on all scans during Diwali week</p>
                                        <div className="flex items-center mt-1 text-gray-500 text-xs">
                                            <i className="fas fa-calendar-alt mr-1"></i> Oct 15 - Oct 25, 2023
                                        </div>
                                    </div>
                                    <span className="badge badge-success">Active</span>
                                </div>
                                <div className="mt-2 flex gap-3">
                                    <button className="text-blue-600 text-sm hover:underline">Edit</button>
                                    <button className="text-red-600 text-sm hover:underline">Deactivate</button>
                                </div>
                            </div>

                            {/* Scheme Item 2 */}
                            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-500 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">New Member Welcome</p>
                                        <p className="text-sm text-gray-500">500 bonus points on first scan</p>
                                        <div className="flex items-center mt-1 text-gray-500 text-xs">
                                            <i className="fas fa-infinity mr-1"></i> Ongoing
                                        </div>
                                    </div>
                                    <span className="badge badge-success">Active</span>
                                </div>
                                <div className="mt-2 flex gap-3">
                                    <button className="text-blue-600 text-sm hover:underline">Edit</button>
                                    <button className="text-red-600 text-sm hover:underline">Deactivate</button>
                                </div>
                            </div>

                            {/* Scheme Item 3 */}
                            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-500 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">Referral Fiesta</p>
                                        <p className="text-sm text-gray-500">Extra 100 points per successful referral</p>
                                        <div className="flex items-center mt-1 text-gray-500 text-xs">
                                            <i className="fas fa-calendar-alt mr-1"></i> Sep 1 - Sep 30, 2023
                                        </div>
                                    </div>
                                    <span className="badge badge-danger">Inactive</span>
                                </div>
                                <div className="mt-2 flex gap-3">
                                    <button className="text-blue-600 text-sm hover:underline">Edit</button>
                                    <button className="text-green-600 text-sm hover:underline">Activate</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ Banners & Content Tab ══════ */}
            {activeTab === 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {configData?.creativeTypes?.map((type: any) => (
                        <div key={type.id} className="widget-card rounded-xl shadow p-6 h-full" style={{ contentVisibility: 'auto', containIntrinsicSize: '420px' }}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-primary">{type.name} Management</h3>
                                <button
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                    onClick={() => handleOpenCreativeModal(type.id)}
                                >
                                    <i className="fas fa-plus mr-1"></i> Add New
                                </button>
                            </div>

                            <div className="space-y-4">
                                {(creativesByType[type.id] || [])
                                    .map((creative: any) => (
                                        <div key={creative.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:shadow-sm">
                                            <div className={`flex-shrink-0 w-16 h-16 ${getIconBgColor(type.name)} rounded-lg flex items-center justify-center overflow-hidden border`}>
                                                {creative.previewUrl ? renderCreativePreview(creative.previewUrl, creative.title, type.name, true) : (
                                                    <i className={`${getCreativeIconClass(type.name)} text-2xl`}></i>
                                                )}
                                            </div>
                                            <div className="ml-4 flex-1">
                                                <p className="font-semibold text-sm">{creative.title}</p>
                                                <p className="text-xs text-gray-500">{creative.carouselName}</p>
                                                {creative.previewUrl && (
                                                    <a href={creative.previewUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-block mt-1">
                                                        Preview uploaded content
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <button className="p-1.5 hover:bg-blue-50 rounded text-blue-600" onClick={() => handleOpenCreativeModal(type.id, creative)}>
                                                    <i className="fas fa-edit text-sm"></i>
                                                </button>
                                                <button className="p-1.5 hover:bg-red-50 rounded text-red-600" onClick={() => handleDeleteCreative(creative.id)}>
                                                    <i className="fas fa-trash text-sm"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                {(creativesByType[type.id] || []).length === 0 && (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-gray-500">No {type.name.toLowerCase()} items found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {(!configData?.creativeTypes || configData.creativeTypes.length === 0) && (
                        <div className="col-span-full widget-card rounded-xl shadow p-12 text-center">
                            <h3 className="text-lg font-semibold text-gray-500 mb-2">No Banner or Content Sections Configured</h3>
                            <p className="text-sm text-gray-500 mb-4">Creative types defined in the database will appear here automatically.</p>
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                                <i className="fas fa-plus mr-1"></i> Add Creative Type
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ══════ Referral Tab ══════ */}
            {activeTab === 2 && (
                <div className="widget-card rounded-xl shadow p-8 max-w-4xl mx-auto">
                    <h3 className="text-lg font-semibold text-primary mb-6 border-b pb-4">Referral Configuration</h3>
                    <div className="space-y-6">
                        {/* Global System Settings */}
                        <div className="bg-blue-50 p-4 rounded-lg mb-6">
                            <p className="text-sm font-bold text-blue-700 mb-3">Global System Settings</p>
                            <label className="flex items-center gap-3 cursor-pointer mb-4">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={referralGlobalFields?.enabled ?? configData?.referralConfig?.global?.enabled ?? true}
                                        onChange={(e) => setReferralGlobalFields({
                                            ...(referralGlobalFields || configData?.referralConfig?.global),
                                            enabled: e.target.checked
                                        })}
                                    />
                                    <div className="w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                </div>
                                <span className="font-medium text-sm">Enable Referral Program System-wide</span>
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Referral Code Prefix</label>
                                    <input
                                        className={inputClass}
                                        value={referralGlobalFields?.prefix ?? configData?.referralConfig?.global?.prefix ?? "STURLITE"}
                                        onChange={(e) => setReferralGlobalFields({
                                            ...(referralGlobalFields || configData?.referralConfig?.global),
                                            prefix: e.target.value
                                        })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Referral Validity (Days)</label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={referralGlobalFields?.validityDays ?? configData?.referralConfig?.global?.validityDays ?? 30}
                                        onChange={(e) => setReferralGlobalFields({
                                            ...(referralGlobalFields || configData?.referralConfig?.global),
                                            validityDays: parseInt(e.target.value)
                                        })}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-medium text-gray-700">Success Message</label>
                                    <textarea
                                        rows={2}
                                        className={inputClass}
                                        value={referralGlobalFields?.successMessage ?? configData?.referralConfig?.global?.successMessage ?? ""}
                                        onChange={(e) => setReferralGlobalFields({
                                            ...(referralGlobalFields || configData?.referralConfig?.global),
                                            successMessage: e.target.value
                                        })}
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-200 my-4" />

                        {/* Per-UserType Settings */}
                        <div>
                            <p className="text-sm font-bold text-blue-700 mb-3">Per-UserType Overrides</p>
                            <div className="space-y-1 mb-4">
                                <label className="text-sm font-medium text-gray-700">Configure for User Type</label>
                                <select
                                    value={selectedReferralUserType}
                                    onChange={(e) => handleReferralUserTypeChange(e.target.value === '' ? '' : Number(e.target.value))}
                                    className={selectClass}
                                >
                                    <option value="">Global Default (None Selected)</option>
                                    {configData?.referralConfig?.userTypes?.map((ut: any) => (
                                        <option key={ut.id} value={ut.id}>{ut.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedReferralUserType !== '' && referralUserTypeFields && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                    <div className="md:col-span-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={referralUserTypeFields.isReferralEnabled}
                                                onChange={(e) => setReferralUserTypeFields({ ...referralUserTypeFields, isReferralEnabled: e.target.checked })}
                                            />
                                            <span className="font-medium text-sm">Enable Referral for this User Type</span>
                                        </label>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Referral Reward Points (to Referrer)</label>
                                        <input
                                            type="number"
                                            className={inputClass}
                                            value={referralUserTypeFields.referralRewardPoints}
                                            onChange={(e) => setReferralUserTypeFields({ ...referralUserTypeFields, referralRewardPoints: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Referee Reward Points (to New Member)</label>
                                        <input
                                            type="number"
                                            className={inputClass}
                                            value={referralUserTypeFields.refereeRewardPoints}
                                            onChange={(e) => setReferralUserTypeFields({ ...referralUserTypeFields, refereeRewardPoints: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Maximum Referrals allowed</label>
                                        <input
                                            type="number"
                                            className={inputClass}
                                            value={referralUserTypeFields.maxReferrals}
                                            onChange={(e) => setReferralUserTypeFields({ ...referralUserTypeFields, maxReferrals: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Referral Code Prefix (Override)</label>
                                        <input
                                            className={inputClass}
                                            value={referralUserTypeFields.referralCodePrefix}
                                            onChange={(e) => setReferralUserTypeFields({ ...referralUserTypeFields, referralCodePrefix: e.target.value })}
                                            placeholder="Leave empty to use global"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Referral Validity (Days Override)</label>
                                        <input
                                            type="number"
                                            className={inputClass}
                                            value={referralUserTypeFields.referralValidityDays}
                                            onChange={(e) => setReferralUserTypeFields({ ...referralUserTypeFields, referralValidityDays: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-sm font-medium text-gray-700">Success Message (Override)</label>
                                        <textarea
                                            rows={2}
                                            className={inputClass}
                                            value={referralUserTypeFields.referralSuccessMessage}
                                            onChange={(e) => setReferralUserTypeFields({ ...referralUserTypeFields, referralSuccessMessage: e.target.value })}
                                            placeholder="Leave empty to use global"
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedReferralUserType === '' && (
                                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
                                    <p className="text-gray-500">Select a User Type to configure specific rewards and limits. <br />Global settings at the top apply to all unless overridden.</p>
                                </div>
                            )}
                        </div>

                        <hr className="border-gray-200 mt-6" />

                        <div className="flex justify-end gap-3">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setReferralGlobalFields(null);
                                    handleReferralUserTypeChange(selectedReferralUserType);
                                }}
                                disabled={isSaving}
                            >
                                Reset Changes
                            </button>
                            <button
                                className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
                                onClick={handleSaveReferralConfig}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Saving...</>
                                ) : (
                                    <><i className="fas fa-save"></i> Save Configuration</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ Communication Tab ══════ */}
            {activeTab === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-primary">Communication Triggers</h3>
                            <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                                <i className="fas fa-plus mr-1"></i> Create
                            </button>
                        </div>

                        <div className="space-y-4">
                            {[
                                { title: 'Welcome Message', desc: 'Sent to new members upon registration', icon: 'fa-bell', channels: 'SMS, Push Notification', border: 'border-blue-500' },
                                { title: 'Points Credited', desc: 'Sent when points are credited to member account', icon: 'fa-bell', channels: 'SMS, Push Notification', border: 'border-green-500' },
                                { title: 'Inactivity Nudge', desc: 'Sent to members inactive for 30 days', icon: 'fa-brands fa-whatsapp', channels: 'WhatsApp, SMS', border: 'border-yellow-500' },
                            ].map((trigger) => (
                                <div key={trigger.title} className={`bg-gray-50 rounded-lg p-4 border-l-4 ${trigger.border} hover:shadow-md transition-shadow`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{trigger.title}</p>
                                            <p className="text-sm text-gray-500">{trigger.desc}</p>
                                            <div className="flex items-center mt-1 text-gray-500 text-xs">
                                                <i className={`fas ${trigger.icon} mr-1`}></i> {trigger.channels}
                                            </div>
                                        </div>
                                        <span className="badge badge-success">Active</span>
                                    </div>
                                    <div className="mt-2 flex gap-3">
                                        <button className="text-blue-600 text-sm hover:underline">Edit</button>
                                        <button className="text-red-600 text-sm hover:underline">Deactivate</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-primary">Message Templates</h3>
                            <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                                <i className="fas fa-plus mr-1"></i> Create
                            </button>
                        </div>

                        <div className="space-y-4">
                            {[
                                { title: 'Welcome SMS Template', desc: 'Used for new member registration', bg: 'bg-blue-100', color: 'text-blue-600' },
                                { title: 'Points Credited Template', desc: 'Used when points are credited', bg: 'bg-green-100', color: 'text-green-600' },
                                { title: 'Referral Success Template', desc: 'Used when referral is successful', bg: 'bg-purple-100', color: 'text-purple-600' },
                            ].map((tpl) => (
                                <div key={tpl.title} className="flex items-center p-3 bg-gray-50 rounded-lg hover:shadow-sm">
                                    <div className={`flex-shrink-0 w-12 h-12 ${tpl.bg} rounded-lg flex items-center justify-center`}>
                                        <i className={`fas fa-comment-sms ${tpl.color}`}></i>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <p className="font-semibold text-sm">{tpl.title}</p>
                                        <p className="text-xs text-gray-500">{tpl.desc}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><i className="fas fa-edit text-sm"></i></button>
                                        <button className="p-1.5 hover:bg-red-50 rounded text-red-600"><i className="fas fa-trash text-sm"></i></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ Creative Management Modal ══════ */}
            {isCreativeModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-semibold">
                                {creativeForm.id ? 'Edit' : 'Add New'} {configData?.creativeTypes?.find((t: any) => t.id === creativeForm.typeId)?.name || 'Creative'}
                            </h3>
                            <button onClick={() => setIsCreativeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Title *</label>
                                <input
                                    className={inputClass}
                                    value={creativeForm.title}
                                    onChange={(e) => setCreativeForm({ ...creativeForm, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Carousel Name / Section *</label>
                                <input
                                    className={inputClass}
                                    placeholder="e.g. Home Page Main"
                                    value={creativeForm.carouselName}
                                    onChange={(e) => setCreativeForm({ ...creativeForm, carouselName: e.target.value })}
                                />
                            </div>
                            {creativeForm.previewUrl && (
                                <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden border flex items-center justify-center">
                                    {renderCreativePreview(
                                        creativeForm.previewUrl,
                                        creativeForm.title || 'Preview',
                                        configData?.creativeTypes?.find((t: any) => t.id === creativeForm.typeId)?.name || '',
                                        false
                                    )}
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1">Resource Artifact *</label>
                                <div className="flex gap-2 items-start">
                                    <div className="flex-1 space-y-1">
                                        <input
                                            className={inputClass}
                                            value={creativeForm.url}
                                            onChange={(e) => setCreativeForm({ ...creativeForm, url: e.target.value })}
                                            placeholder="https://example.com/image.jpg"
                                        />
                                        <p className="text-xs text-gray-400">Upload a file or paste a direct URL</p>
                                    </div>
                                    <label className={`inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition whitespace-nowrap ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading ? (
                                            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div> Uploading...</>
                                        ) : (
                                            <><i className="fas fa-cloud-upload-alt"></i> Upload</>
                                        )}
                                        <input type="file" hidden accept="image/*,video/*,application/pdf" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Display Order</label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={creativeForm.displayOrder}
                                        onChange={(e) => setCreativeForm({ ...creativeForm, displayOrder: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    rows={3}
                                    className={inputClass}
                                    value={creativeForm.description}
                                    onChange={(e) => setCreativeForm({ ...creativeForm, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 bg-gray-50 p-4 border-t rounded-b-xl">
                            <button onClick={() => setIsCreativeModalOpen(false)} className="btn btn-secondary">
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
                                onClick={handleSaveCreative}
                                disabled={creativeSaveMutation.isPending}
                            >
                                {creativeSaveMutation.isPending ? (
                                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Saving...</>
                                ) : (
                                    <><i className="fas fa-save"></i> {creativeForm.id ? 'Update' : 'Create'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
