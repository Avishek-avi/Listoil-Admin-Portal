'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSchemesDataAction } from '@/actions/schemes-actions';

export default function SchemesClient() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['schemes-data'],
        queryFn: getSchemesDataAction
    });

    const activeCampaigns = data?.activeCampaigns || [];
    const skuData = data?.skuData || [];
    const productHierarchy = data?.productHierarchy || {};

    const [campaignType, setCampaignType] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [campaignDescription, setCampaignDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [targetAudience, setTargetAudience] = useState<string[]>([]);
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');

    // Booster
    const [pointsMultiplier, setPointsMultiplier] = useState('');
    const [boosterSelectedSkus, setBoosterSelectedSkus] = useState<any>({});
    const [boosterSearch, setBoosterSearch] = useState('');

    // Slab Based
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [slabBasis, setSlabBasis] = useState('scans');
    const [slabRewardType, setSlabRewardType] = useState('monetary');
    const [slabs, setSlabs] = useState([
        { name: 'Slab 1', min: 1, max: 2, multiplier: 1, rewardType: 'gold-coins', rewardValue: '' },
        { name: 'Slab 2', min: 3, max: 5, multiplier: 2, rewardType: 'gold-coins', rewardValue: '' },
        { name: 'Slab 3', min: 6, max: '', multiplier: 3, rewardType: 'gold-coins', rewardValue: '' },
    ]);
    const [slabSelectedSkus, setSlabSelectedSkus] = useState<any>({});
    const [slabSearch, setSlabSearch] = useState('');

    // Cross-Sell
    const [crossSellRewardType, setCrossSellRewardType] = useState('monetary');
    const [combinations, setCombinations] = useState([
        {
            productCount: 2,
            name: '',
            products: Array.from({ length: 2 }, (_, i) => ({ category: '', subcategory: '', sku: '', quantity: 1 })),
            extraPoints: 0,
            rewardType: 'gold-coins',
            rewardValue: '',
            active: true,
        },
    ]);

    // Promo Schemes
    const [promoPointsMultiplier, setPromoPointsMultiplier] = useState('');
    const [birthdayEnabled, setBirthdayEnabled] = useState(false);
    const [birthdayPoints, setBirthdayPoints] = useState(0);
    const [birthdayMultiplier, setBirthdayMultiplier] = useState(1);
    const [anniversaryEnabled, setAnniversaryEnabled] = useState(false);
    const [anniversaryPoints, setAnniversaryPoints] = useState(0);
    const [anniversaryMultiplier, setAnniversaryMultiplier] = useState(1);
    const [customEnabled, setCustomEnabled] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customPoints, setCustomPoints] = useState(0);
    const [customMultiplier, setCustomMultiplier] = useState(1);
    const [customDate, setCustomDate] = useState('');
    const [promoSelectedSkus, setPromoSelectedSkus] = useState({});
    const [promoSearch, setPromoSearch] = useState('');

    const handleAudienceChange = (value: string) => {
        if (value === 'both') {
            setTargetAudience(['both']);
        } else {
            setTargetAudience((prev) => {
                if (prev.includes('both')) return [value];
                if (prev.includes(value)) return prev.filter((v) => v !== value);
                return [...prev, value];
            });
        }
    };

    const handleSkuChange = (section: string, skuCode: string, checked: boolean) => {
        const setFn = section === 'booster' ? setBoosterSelectedSkus : section === 'slab' ? setSlabSelectedSkus : setPromoSelectedSkus;
        setFn((prev: any) => {
            if (checked) {
                const sku = skuData.find((s: any) => s.skuCode === skuCode);
                return { ...prev, [skuCode]: sku };
            } else {
                const { [skuCode]: _, ...rest } = prev;
                return rest;
            }
        });
    };

    const handleSelectAll = (section: string, checked: boolean) => {
        const setFn = section === 'booster' ? setBoosterSelectedSkus : section === 'slab' ? setSlabSelectedSkus : setPromoSelectedSkus;
        if (checked) {
            const selected: any = {};
            skuData.forEach((sku: any) => selected[sku.skuCode] = sku);
            setFn(selected);
        } else {
            setFn({});
        }
    };

    const filterSkus = (search: string) => skuData.filter((sku: any) => Object.values(sku).some((v: any) => v.toLowerCase().includes(search.toLowerCase())));

    const addSlab = () => {
        const slabCount = slabs.length + 1;
        setSlabs([...slabs, { name: `Slab ${slabCount}`, min: slabCount * (slabBasis === 'scans' ? 5 : 100), max: (slabCount + 1) * (slabBasis === 'scans' ? 5 : 100) as any, multiplier: slabCount, rewardType: 'gold-coins', rewardValue: '' }]);
    };

    const updateSlab = (index: number, field: string, value: any) => {
        const newSlabs = [...slabs];
        (newSlabs[index] as any)[field] = value;
        setSlabs(newSlabs);
    };

    const removeSlab = (index: number) => setSlabs(slabs.filter((_, i) => i !== index));

    const addCombination = () => {
        setCombinations([...combinations, {
            productCount: 2,
            name: '',
            products: Array.from({ length: 2 }, () => ({ category: '', subcategory: '', sku: '', quantity: 1 })),
            extraPoints: 0,
            rewardType: 'gold-coins',
            rewardValue: '',
            active: true,
        }]);
    };

    const updateCombination = (index: number, field: string, value: any) => {
        const newCombs = [...combinations];
        (newCombs[index] as any)[field] = value;
        if (field === 'productCount') {
            newCombs[index].products = Array.from({ length: value }, (_, i) => newCombs[index].products[i] || { category: '', subcategory: '', sku: '', quantity: 1 });
        }
        setCombinations(newCombs);
    };

    const updateProduct = (combIndex: number, prodIndex: number, field: string, value: any) => {
        const newCombs = [...combinations];
        (newCombs[combIndex].products[prodIndex] as any)[field] = value;
        if (field === 'category') newCombs[combIndex].products[prodIndex].subcategory = '';
        if (field === 'category' || field === 'subcategory') newCombs[combIndex].products[prodIndex].sku = '';
        setCombinations(newCombs);
    };

    const removeCombination = (index: number) => setCombinations(combinations.filter((_, i) => i !== index));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCampaignType(''); setCampaignName(''); setCampaignDescription('');
        setStartDate(''); setEndDate(''); setTargetAudience([]);
        setState(''); setCity(''); setDistrict('');
        setPointsMultiplier(''); setBoosterSelectedSkus({}); setBoosterSearch('');
        setCategory(''); setSubCategory(''); setSlabBasis('scans'); setSlabRewardType('monetary');
        setSlabs([]); setSlabSelectedSkus({}); setSlabSearch('');
        setCrossSellRewardType('monetary');
        setCombinations([{ productCount: 2, name: '', products: Array.from({ length: 2 }, () => ({ category: '', subcategory: '', sku: '', quantity: 1 })), extraPoints: 0, rewardType: 'gold-coins', rewardValue: '', active: true }]);
        setPromoPointsMultiplier(''); setBirthdayEnabled(false); setBirthdayPoints(0); setBirthdayMultiplier(1);
        setAnniversaryEnabled(false); setAnniversaryPoints(0); setAnniversaryMultiplier(1);
        setCustomEnabled(false); setCustomName(''); setCustomPoints(0); setCustomMultiplier(1); setCustomDate('');
        setPromoSelectedSkus({}); setPromoSearch('');
    };

    if (isLoading) return (
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
    if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">Failed to load schemes data</div>;

    const kpiCards = [
        { label: 'Total Campaigns', value: '24', icon: 'fas fa-bullhorn', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', sub: '3 new this month' },
        { label: 'Active Campaigns', value: '8', icon: 'fas fa-play-circle', iconBg: 'bg-green-100', iconColor: 'text-green-600', sub: '2 started this week' },
        { label: 'Total Participants', value: '1,245', icon: 'fas fa-users', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', sub: '12% from last month' },
        { label: 'Points Distributed', value: '45,670', icon: 'fas fa-coins', iconBg: 'bg-red-100', iconColor: 'text-red-600', sub: '8% from last month' },
    ];

    const campaignTypes = [
        { key: 'booster', label: 'Booster', icon: 'fa-coins', desc: 'Offer additional points for specific actions' },
        { key: 'slab-based', label: 'Slab Based', icon: 'fa-layer-group', desc: 'Define slabs with customizable ranges and multipliers' },
        { key: 'cross-sell', label: 'Cross Sell', icon: 'fa-exchange-alt', desc: 'Reward customers for purchasing from different categories' },
        { key: 'promo-schemes', label: 'Promo Schemes', icon: 'fa-gift', desc: 'Special promotions with bonus points for occasions' },
    ];

    return (
        <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {kpiCards.map((card, i) => (
                    <div key={i} className="widget-card rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-sm font-medium text-gray-600">{card.label}</p>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{background: card.iconBg.replace('bg-','').replace('-100',''), opacity: 1}}>
                                        <i className={`${card.icon} ${card.iconColor} text-sm`}></i>
                                    </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
                        <div className="flex items-center text-sm text-green-600">
                            <i className="fas fa-arrow-up mr-1 text-xs"></i>{card.sub}
                        </div>
                    </div>
                ))}
            </div>

            {/* Active Campaigns Table */}
            <div className="widget-card rounded-xl shadow p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Active Campaigns</h3>
                    <div className="flex gap-2">
                        <button onClick={() => document.getElementById('campaignCreationSection')?.scrollIntoView({ behavior: 'smooth' })} className="btn btn-primary">
                            <i className="fas fa-plus"></i> Create Campaign
                        </button>
                        <button className="btn btn-secondary">
                            <i className="fas fa-download"></i> Export
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Campaign ID</th>
                                <th>Campaign Name</th>
                                <th>Type</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Participants</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeCampaigns.map((camp: any) => (
                                <tr key={camp.id}>
                                    <td className="font-mono text-xs text-gray-400">{camp.id}</td>
                                    <td className="font-medium">{camp.name}</td>
                                    <td>{camp.type}</td>
                                    <td className="text-gray-500 text-xs">{camp.start}</td>
                                    <td className="text-gray-500 text-xs">{camp.end}</td>
                                    <td>{camp.participants}</td>
                                    <td><span className="badge badge-success">{camp.status}</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-ghost text-blue-600 !p-1.5" title="Edit"><i className="fas fa-edit text-sm"></i></button>
                                            <button className="btn btn-ghost text-red-500 !p-1.5" title="Delete"><i className="fas fa-trash text-sm"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Campaign */}
            <div id="campaignCreationSection" className="widget-card rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Campaign</h3>
                <form onSubmit={handleSubmit}>
                    {/* Campaign Type Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Campaign Type</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {campaignTypes.map((type) => (
                                <button type="button" key={type.key} onClick={() => setCampaignType(type.key)} className={`p-4 rounded-xl border-2 text-center transition ${campaignType === type.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <i className={`fas ${type.icon} text-2xl text-blue-600 mb-2`}></i>
                                    <h4 className="font-medium text-gray-900">{type.label}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Campaign Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                            <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea value={campaignDescription} onChange={(e) => setCampaignDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                            <i className="fas fa-save mr-2"></i>Create Campaign
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
