
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

import { generateQrCodeAction, fetchQrHistory, fetchQrFileAction, toggleQrBatchStatusAction } from '@/app/actions/qr.actions';
import {
  fetchL1Action,
  fetchL2Action,
  fetchL3Action,
  fetchL4Action,
  fetchL5Action,
  fetchL6Action,
  fetchVariantsAction
} from '@/app/actions/sku-level.actions';

interface QRBatch {
  batchId: string;
  skuCode: string;
  quantity: number;
  generatedDate: string;
  status: 'Active' | 'Inactive';
}

export default function QRGeneration() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [sku, setSku] = useState('');
  const [qrType, setQrType] = useState('inner');
  const [numberOfQRs, setNumberOfQRs] = useState('');

  const [variants, setVariants] = useState<any[]>([]);

  const [l1List, setL1List] = useState<any[]>([]);
  const [l2List, setL2List] = useState<any[]>([]);
  const [l3List, setL3List] = useState<any[]>([]);
  const [l4List, setL4List] = useState<any[]>([]);
  const [l5List, setL5List] = useState<any[]>([]);
  const [l6List, setL6List] = useState<any[]>([]);

  const [selectedL1, setSelectedL1] = useState<number | ''>('');
  const [selectedL2, setSelectedL2] = useState<number | ''>('');
  const [selectedL3, setSelectedL3] = useState<number | ''>('');
  const [selectedL4, setSelectedL4] = useState<number | ''>('');
  const [selectedL5, setSelectedL5] = useState<number | ''>('');
  const [selectedL6, setSelectedL6] = useState<number | ''>('');

  useEffect(() => { fetchL1Action().then(setL1List); }, []);

  useEffect(() => {
    if (selectedL1) { fetchL2Action(selectedL1).then(setL2List); } else { setL2List([]); }
    setSelectedL2(''); setSelectedL3(''); setSelectedL4(''); setSelectedL5(''); setSelectedL6('');
    setL3List([]); setL4List([]); setL5List([]); setL6List([]); setVariants([]); setSku('');
  }, [selectedL1]);

  useEffect(() => {
    if (selectedL2) { fetchL3Action(selectedL1 || undefined, selectedL2).then(setL3List); } else { setL3List([]); }
    setSelectedL3(''); setSelectedL4(''); setSelectedL5(''); setSelectedL6('');
    setL4List([]); setL5List([]); setL6List([]); setVariants([]); setSku('');
  }, [selectedL1, selectedL2]);

  useEffect(() => {
    if (selectedL3) { fetchL4Action(selectedL1 || undefined, selectedL2 || undefined, selectedL3).then(setL4List); } else { setL4List([]); }
    setSelectedL4(''); setSelectedL5(''); setSelectedL6('');
    setL5List([]); setL6List([]); setVariants([]); setSku('');
  }, [selectedL1, selectedL2, selectedL3]);

  useEffect(() => {
    if (selectedL4) { fetchL5Action(selectedL1 || undefined, selectedL2 || undefined, selectedL3 || undefined, selectedL4).then(setL5List); } else { setL5List([]); }
    setSelectedL5(''); setSelectedL6(''); setL6List([]); setVariants([]); setSku('');
  }, [selectedL1, selectedL2, selectedL3, selectedL4]);

  useEffect(() => {
    if (selectedL5) { fetchL6Action(selectedL1 || undefined, selectedL2 || undefined, selectedL3 || undefined, selectedL4 || undefined, selectedL5).then(setL6List); } else { setL6List([]); }
    setSelectedL6(''); setVariants([]); setSku('');
  }, [selectedL1, selectedL2, selectedL3, selectedL4, selectedL5]);

  useEffect(() => {
    if (selectedL6) { fetchVariantsAction(selectedL6).then(setVariants); } else { setVariants([]); }
    setSku('');
  }, [selectedL6]);

  const [batches, setBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatus, setBatchStatus] = useState('');
  const [debouncedBatchSearch, setDebouncedBatchSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedBatchSearch(batchSearch), 500);
    return () => clearTimeout(handler);
  }, [batchSearch]);

  const loadQrBatches = async () => {
    setLoadingBatches(true);
    try {
      const result = await fetchQrHistory(page, rowsPerPage, { searchTerm: debouncedBatchSearch, status: batchStatus });
      if (result.success) { setBatches(result.data || []); setTotalCount(result.total || 0); }
      else { console.error('Failed to load batches:', result.message); }
    } catch (error) { console.error('Error loading batches:', error); }
    finally { setLoadingBatches(false); }
  };

  useEffect(() => { loadQrBatches(); }, [page, rowsPerPage, debouncedBatchSearch, batchStatus]);

  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!sku || !qrType || !numberOfQRs) { alert('Please fill all fields'); return; }
    const quantity = parseInt(numberOfQRs, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > 10000) { alert('Quantity must be between 1 and 10000'); return; }
    setGenerating(true);
    try {
      const result = await generateQrCodeAction({ skuCode: sku, type: qrType as 'inner' | 'outer', quantity: parseInt(numberOfQRs, 10) });
      if (result.success) { alert(result.message); await loadQrBatches(); setSku(''); setQrType('inner'); setNumberOfQRs(''); }
      else { alert('Error: ' + result.message); }
    } catch (error) { console.error(error); alert('An unexpected error occurred'); }
    finally { setGenerating(false); }
  };

  const handleStatusToggle = async (batchId: number, currentStatus: boolean) => {
    try {
      const result = await toggleQrBatchStatusAction(batchId, !currentStatus);
      if (result.success) { await loadQrBatches(); } else { alert('Failed to update status: ' + result.message); }
    } catch (error) { console.error('Status toggle error:', error); alert('Failed to update status'); }
  };

  const handleDownload = async (batchId: number) => {
    try {
      const result = await fetchQrFileAction(batchId);
      if (result.success && 'fileUrl' in result && result.fileUrl) { window.open(result.fileUrl, '_blank'); }
      else { alert('Error: ' + (result.message || 'Failed to download file')); }
    } catch (error) { console.error('Download error:', error); alert('Failed to download file'); }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6 mt-3">
      {/* Generate QR Codes */}
      <div className="widget-card rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate QR Codes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">L1 Level</label>
            <select value={selectedL1} onChange={(e) => setSelectedL1(Number(e.target.value) || '')} className={selectClass}>
              <option value="">-- Select L1 --</option>
              {l1List.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">L2 Level</label>
            <select value={selectedL2} onChange={(e) => setSelectedL2(Number(e.target.value) || '')} className={selectClass}>
              <option value="">-- Select L2 --</option>
              {l2List.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">L3 Level</label>
            <select value={selectedL3} onChange={(e) => setSelectedL3(Number(e.target.value) || '')} className={selectClass}>
              <option value="">-- Select L3 --</option>
              {l3List.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">L4 Level</label>
            <select value={selectedL4} onChange={(e) => setSelectedL4(Number(e.target.value) || '')} className={selectClass}>
              <option value="">-- Select L4 --</option>
              {l4List.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">L5 Level</label>
            <select value={selectedL5} onChange={(e) => setSelectedL5(Number(e.target.value) || '')} className={selectClass}>
              <option value="">-- Select L5 --</option>
              {l5List.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">L6 Level</label>
            <select value={selectedL6} onChange={(e) => setSelectedL6(Number(e.target.value) || '')} className={selectClass}>
              <option value="">-- Select L6 --</option>
              {l6List.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU Variant</label>
            <select value={sku} onChange={(e) => setSku(e.target.value)} disabled={!selectedL6 || variants.length === 0} className={selectClass}>
              <option value="">-- Select Variant --</option>
              {variants.map((item: any) => (
                <option key={item.id} value={item.name}>{item.name} {item.packSize ? `(${item.packSize})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QR Type</label>
            <select value={qrType} onChange={(e) => setQrType(e.target.value)} className={selectClass}>
              <option value="">-- Select Type --</option>
              <option value="inner">Inner</option>
              <option value="outer">Outer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input type="number" placeholder="Enter quantity" value={numberOfQRs} onChange={(e) => {
              const value = e.target.value;
              if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 10000)) setNumberOfQRs(value);
            }} min={1} max={10000} className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleGenerate} disabled={generating} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {generating ? 'Generating...' : 'Generate QR Codes'}
          </button>
        </div>
      </div>

      {/* QR Batches */}
      <div className="widget-card rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">QR Batches</h3>
          <div className="flex gap-3">
            <input type="text" placeholder="Search SKU..." value={batchSearch} onChange={(e) => setBatchSearch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[120px]">
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Batch ID</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">SKU Code</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Created Date</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Download</th>
              </tr>
            </thead>
            <tbody>
              {loadingBatches ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-500">Loading batches...</td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-500">No batches found</td></tr>
              ) : (
                batches.map((batch: any) => (
                  <tr key={batch.batchId} className="border-b hover:bg-gray-50">
                    <td className="py-3 text-sm text-gray-600">{batch.batchId}</td>
                    <td className="py-3 text-sm text-gray-600">{batch.skuCode}</td>
                    <td className="py-3 text-sm text-gray-600 capitalize">{batch.type}</td>
                    <td className="py-3 text-sm font-medium text-blue-600">{batch.quantity}</td>
                    <td className="py-3 text-sm text-gray-500">{batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="py-3 text-sm">
                      <span className={`inline-flex items-center gap-2 text-xs font-semibold ${batch.isActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                        <span className={`status-dot ${batch.isActive ? 'active' : 'blocked'}`}></span>
                        {batch.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-sm">
                      <button
                        onClick={() => handleStatusToggle(batch.batchId, batch.isActive)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md border text-xs font-semibold transition ${batch.isActive
                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                      >
                        {batch.isActive ? 'Make Inactive' : 'Make Active'}
                      </button>
                    </td>
                    <td className="py-3 text-sm">
                      {batch.fileUrl ? (
                        <button
                          onClick={() => handleDownload(batch.batchId)}
                          className="inline-flex items-center px-3 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition"
                        >
                          Download
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">Processing...</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500">
            Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, totalCount)} of {totalCount} entries
          </p>
          <div className="flex items-center gap-3">
            <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} className="px-2 py-1 border border-gray-300 rounded text-sm bg-white">
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
            </select>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50">Previous</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">{page + 1}</button>
              <button disabled={(page + 1) * rowsPerPage >= totalCount} onClick={() => setPage(page + 1)} className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}