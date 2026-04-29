
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

import { fetchQrHistory, fetchQrFileAction, toggleQrBatchStatusAction, syncQrExcelAction, fetchBatchItemsAction } from '@/app/actions/qr.actions';
import * as XLSX from 'xlsx';


interface QRBatch {
  batchId: number;
  skuCode: string;
  quantity: number;
  type: string;
  createdAt: string;
  isActive: boolean;
  fileUrl?: string;
}

function BatchDetails({ batchId }: { batchId: number }) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const limit = 10;

    useEffect(() => {
        const loadItems = async () => {
            setLoading(true);
            const res = await fetchBatchItemsAction(batchId, page, limit);
            if (res.success) {
                setItems(res.data);
                setTotal(res.total);
            }
            setLoading(false);
        };
        loadItems();
    }, [batchId, page]);

    if (loading && page === 0) return <div className="p-4 text-center text-sm text-gray-500">Loading items...</div>;

    return (
        <div className="bg-gray-50 p-4 border-t border-b">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Synced QR Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((item: any) => (
                    <div key={item.inventoryId} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-xs font-mono text-gray-600">{item.serialNumber}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.isQrScanned ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                {item.isQrScanned ? 'Scanned' : 'Not Scanned'}
                            </span>
                        </div>
                        <span className={`status-dot ${item.isActive ? 'active' : 'blocked'}`}></span>
                    </div>
                ))}
            </div>
            {total > limit && (
                <div className="mt-4 flex justify-center gap-2">
                    <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-2 py-1 text-xs border rounded disabled:opacity-50">Prev</button>
                    <span className="text-xs self-center">Page {page + 1} of {Math.ceil(total / limit)}</span>
                    <button disabled={(page + 1) * limit >= total} onClick={() => setPage(page + 1)} className="px-2 py-1 text-xs border rounded disabled:opacity-50">Next</button>
                </div>
            )}
        </div>
    );
}

interface SyncResult {
    success: boolean;
    message: string;
}

function SyncStatusModal({ result, onClose }: { result: SyncResult, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-200">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${result.success ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                    <i className={`fas ${result.success ? 'fa-check-circle' : 'fa-exclamation-circle'} text-4xl`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{result.success ? 'Sync Successful' : 'Sync Failed'}</h3>
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">{result.message}</p>
                <button 
                    onClick={onClose}
                    className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg ${result.success ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'}`}
                >
                    {result.success ? 'Great, continue' : 'Try again'}
                </button>
            </div>
        </div>
    );
}

export default function QRGeneration() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [activeTab, setActiveTab] = useState<'sync' | 'batches'>('sync');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [batches, setBatches] = useState<any[]>([]);

  const [loadingBatches, setLoadingBatches] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatus, setBatchStatus] = useState('');
  const [debouncedBatchSearch, setDebouncedBatchSearch] = useState('');
  const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedBatchSearch(batchSearch), 500);
    return () => clearTimeout(handler);
  }, [batchSearch]);

  const loadQrBatches = async () => {
    setLoadingBatches(true);
    try {
      const result = await fetchQrHistory(page, rowsPerPage, { searchTerm: debouncedBatchSearch, status: batchStatus });
      if (result.success) { 
          setBatches(result.data || []); 
          setTotalCount(result.total || 0); 
      }
    } catch (error) { console.error('Error loading batches:', error); }
    finally { setLoadingBatches(false); }
  };

  useEffect(() => { 
      if (activeTab === 'batches') loadQrBatches(); 
  }, [page, rowsPerPage, debouncedBatchSearch, batchStatus, activeTab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        "Product Code": "SKU001",
        "Serial Number": "SN-10001",
        "qr-status": "Active",
        "generation date": new Date().toISOString().split('T')[0]
      },
      {
        "Product Code": "SKU001",
        "Serial Number": "SN-10002",
        "qr-status": "Active",
        "generation date": new Date().toISOString().split('T')[0]
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, "qr_sync_sample.xlsx");
  };

  const handleSync = async () => {

    if (!selectedFile) { alert('Please select an Excel file'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const result = await syncQrExcelAction(formData);
      setSyncResult(result);
      if (result.success) {
        setSelectedFile(null);
        setPage(0); // Reset to first page to show new batch
        setActiveTab('batches');
      }

    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred during sync');
    } finally {
      setUploading(false);
    }
  };

  const handleStatusToggle = async (batchId: number, currentStatus: boolean) => {
    try {
      const result = await toggleQrBatchStatusAction(batchId, !currentStatus);
      if (result.success) { await loadQrBatches(); } else { alert('Failed to update status: ' + result.message); }
    } catch (error) { console.error('Status toggle error:', error); }
  };

  const handleDownload = async (batchId: number) => {
    try {
      const result = await fetchQrFileAction(batchId);
      if (result.success && 'fileUrl' in result && result.fileUrl) { window.open(result.fileUrl, '_blank'); }
      else { alert('Error: ' + (result.message || 'Failed to download file')); }
    } catch (error) { console.error('Download error:', error); }
  };

  if (status === 'loading') {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6 mt-3">
      {/* Tabs Header */}
      <div className="flex gap-1 bg-gray-100/50 p-1 rounded-xl w-fit border border-gray-200">
          <button 
            onClick={() => setActiveTab('sync')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'sync' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              <i className="fas fa-sync-alt mr-2"></i>Generation & Sync
          </button>
          <button 
            onClick={() => setActiveTab('batches')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'batches' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              <i className="fas fa-list mr-2"></i>Sync Batches History
          </button>
      </div>

      {activeTab === 'sync' && (
          <div className="widget-card rounded-xl shadow p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 text-gradient">Sync QR Codes</h3>
              <button 
                onClick={handleDownloadSample}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-all"
              >
                  <i className="fas fa-download"></i> Download Sample Format
              </button>
          </div>

            <p className="text-sm text-gray-500 mb-6">Upload an Excel file with headers: <span className="font-mono bg-gray-100 px-1 rounded">Product Code</span>, <span className="font-mono bg-gray-100 px-1 rounded">Serial Number</span>, <span className="font-mono bg-gray-100 px-1 rounded">qr-status</span>.</p>
            
            <div className="max-w-xl">
                <div className="flex flex-col gap-4">
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer group bg-gray-50/50" onClick={() => document.getElementById('fileInput')?.click()}>
                        <input type="file" id="fileInput" className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <i className="fas fa-file-excel text-blue-600 text-xl"></i>
                        </div>
                        {selectedFile ? (
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-900">{selectedFile.name}</p>
                                <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-900 text-gradient">Click to upload Excel</p>
                                <p className="text-xs text-gray-500">Drag and drop or click to browse</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-2">
                        {selectedFile && (
                            <button onClick={() => setSelectedFile(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Clear</button>
                        )}
                        <button 
                            onClick={handleSync} 
                            disabled={uploading || !selectedFile} 
                            className="btn btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                        >
                            {uploading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Syncing...</> : <><i className="fas fa-sync-alt mr-2"></i> Sync QR Codes</>}
                        </button>
                    </div>
                </div>
            </div>
          </div>
      )}

      {activeTab === 'batches' && (
          <div className="widget-card rounded-xl shadow p-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sync Batches History</h3>
                <p className="text-sm text-gray-500">View and manage all synced QR batches.</p>
              </div>
              <div className="flex gap-3">
                <input type="text" placeholder="Search SKU..." value={batchSearch} onChange={(e) => setBatchSearch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[120px]">
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="min-w-full">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="w-10"></th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Code</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Synced Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingBatches ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400"><i className="fas fa-spinner fa-spin mr-2"></i>Loading batches...</td></tr>
                  ) : batches.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400">No sync batches found</td></tr>
                  ) : (
                    batches.map((batch: any) => (
                      <>
                        <tr key={batch.batchId} className={`border-t hover:bg-gray-50/80 transition-colors ${expandedBatchId === batch.batchId ? 'bg-blue-50/30' : ''}`}>
                          <td className="py-4 px-2 text-center">
                              <button 
                                onClick={() => setExpandedBatchId(expandedBatchId === batch.batchId ? null : batch.batchId)}
                                className="w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors"
                              >
                                  <i className={`fas fa-chevron-${expandedBatchId === batch.batchId ? 'down' : 'right'} text-xs text-gray-400`}></i>
                              </button>
                          </td>
                          <td className="py-4 px-4 text-sm font-medium text-gray-700">#{batch.batchId}</td>
                          <td className="py-4 px-4 text-sm text-gray-600 font-semibold">{batch.skuCode}</td>
                          <td className="py-4 px-4 text-sm"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold">{batch.quantity}</span></td>
                          <td className="py-4 px-4 text-sm text-gray-500">{batch.createdAt ? new Date(batch.createdAt).toLocaleString() : 'N/A'}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${batch.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${batch.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                              {batch.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4 px-4 flex gap-2">
                            <button
                              onClick={() => handleStatusToggle(batch.batchId, batch.isActive)}
                              className={`p-1.5 rounded-lg border transition-all ${batch.isActive ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
                              title={batch.isActive ? 'Deactivate' : 'Activate'}
                            >
                              <i className={`fas fa-${batch.isActive ? 'ban' : 'check-circle'}`}></i>
                            </button>
                            {batch.fileUrl && (
                                <button
                                  onClick={() => handleDownload(batch.batchId)}
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all"
                                  title="Download Original"
                                >
                                  <i className="fas fa-download"></i>
                                </button>
                            )}
                          </td>
                        </tr>
                        {expandedBatchId === batch.batchId && (
                            <tr>
                                <td colSpan={7} className="p-0">
                                    <BatchDetails batchId={batch.batchId} />
                                </td>
                            </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-gray-500">
                Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, totalCount)} of {totalCount} entries
              </p>
              <div className="flex items-center gap-3">
                <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white shadow-sm">
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <div className="flex gap-1">
                  <button disabled={page === 0} onClick={() => setPage(page - 1)} className="p-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"><i className="fas fa-chevron-left"></i></button>
                  <div className="bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold shadow-md shadow-blue-200">{page + 1}</div>
                  <button disabled={(page + 1) * rowsPerPage >= totalCount} onClick={() => setPage(page + 1)} className="p-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"><i className="fas fa-chevron-right"></i></button>
                </div>
              </div>
            </div>
          </div>
      )}

      {syncResult && (
          <SyncStatusModal 
            result={syncResult} 
            onClose={() => setSyncResult(null)} 
          />
      )}
    </div>
  );
}
