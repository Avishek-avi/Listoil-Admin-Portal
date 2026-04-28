
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

import { fetchQrHistory, fetchQrFileAction, toggleQrBatchStatusAction, syncQrExcelAction } from '@/app/actions/qr.actions';

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

  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSync = async () => {
    if (!selectedFile) { alert('Please select an Excel file'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', 'qr-sync');
      
      const result = await syncQrExcelAction(formData);
      if (result.success) {
        alert('QR Codes synced successfully!');
        setSelectedFile(null);
        await loadQrBatches();
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred during sync');
    } finally {
      setUploading(false);
    }
  };

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

  return (
    <div className="space-y-6 mt-3">
      {/* Sync QR Codes */}
      <div className="widget-card rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-gradient">Sync QR Codes</h3>
        <p className="text-sm text-gray-500 mb-6">Upload an Excel file to sync QR codes with the inventory. Only .xlsx and .xls formats are supported.</p>
        
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
                        <button 
                            onClick={() => setSelectedFile(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                            Clear
                        </button>
                    )}
                    <button 
                        onClick={handleSync} 
                        disabled={uploading || !selectedFile} 
                        className="btn btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                    >
                        {uploading ? (
                            <><i className="fas fa-spinner fa-spin mr-2"></i> Syncing...</>
                        ) : (
                            <><i className="fas fa-sync-alt mr-2"></i> Sync QR Codes</>
                        )}
                    </button>
                </div>
            </div>
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