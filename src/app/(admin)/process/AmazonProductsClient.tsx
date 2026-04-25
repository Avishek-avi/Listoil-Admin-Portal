'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAmazonProductsAction, uploadAmazonProductsAction } from '@/actions/amazon-actions';

// --- Helper Functions ---
const calculateDiscount = (mrp: any, csp: any) => {
    const mrpNum = parseFloat(mrp);
    const cspNum = parseFloat(csp);
    if (mrpNum > 0 && cspNum > 0) {
        const discount = ((mrpNum - cspNum) / mrpNum) * 100;
        return discount.toFixed(1);
    }
    return "0";
};

export default function AmazonProductsClient() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [openUploadDialog, setOpenUploadDialog] = useState(false);
    const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const queryClient = useQueryClient();

    // Data Fetching
    const { data: productsData, isLoading } = useQuery({
        queryKey: ['amazon-products', page, pageSize],
        queryFn: () => getAmazonProductsAction(page, pageSize),
    });

    const products = productsData?.success ? productsData.products : [];
    const pagination = productsData?.success ? productsData.pagination : { total: 0, page: 1, totalPages: 1 };

    // Mutation for Upload
    const uploadMutation = useMutation({
        mutationFn: uploadAmazonProductsAction,
        onSuccess: (data) => {
            if (data.success) {
                setSnackbarMessage(`Successfully uploaded ${data.count} products`);
                setSnackbarOpen(true);
                setOpenUploadDialog(false);
                setSelectedFile(null);
                queryClient.invalidateQueries({ queryKey: ['amazon-products'] });
            } else {
                setSnackbarMessage(`Upload failed: ${data.error}`);
                setSnackbarOpen(true);
            }
        },
        onError: (err) => {
            setSnackbarMessage('Upload failed due to an error');
            setSnackbarOpen(true);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (!selectedFile) return;
        const formData = new FormData();
        formData.append('file', selectedFile);
        uploadMutation.mutate(formData);
    };

    const downloadTemplate = () => {
        const headers = [
            "S.No.", "Category", "Category Image Path", "Sub Category", "Sub Category Image Path",
            "ASIN(SKU)", "Product Image Path", "Product Name", "Model No.", "Product Description",
            "MRP", "Inventory Count", "CSP ON AMAZON", "Discounted Price (incl GST & delivery)",
            "Points", "Diff", "Amazon URL", "Comments / Vendor"
        ];
        const sample = [
            "1", "Electronics", "", "Phones", "", "B00EXAMPLE", "", "Sample Phone", "M123", "Desc", "10000", "10", "9000", "8500", "100", "500", "", "Vendor A"
        ];
        const csvContent = [headers.join(','), sample.join(',')].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'amazon_products_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Amazon Marketplace Products</h3>
                <div className="flex gap-2">
                    <button onClick={downloadTemplate} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                        <i className="fas fa-download text-xs"></i> Template
                    </button>
                    <button onClick={() => setOpenUploadDialog(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                        <i className="fas fa-cloud-upload-alt text-xs"></i> Upload CSV
                    </button>
                </div>
            </div>

            {/* PRODUCT TABLE */}
            <div className="widget-card rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-14">Image</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ASIN / SKU</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Model</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">MRP</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CSP</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Points</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inventory</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={10} className="py-12 text-center">
                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                </td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={10} className="py-12 text-center text-gray-400">
                                    <i className="fas fa-box-open text-3xl mb-2 block"></i>
                                    No products found
                                </td></tr>
                            ) : (
                                products.map((p: any, idx: number) => {
                                    const discount = calculateDiscount(p.mrp, p.csp_price);
                                    const lowStock = Number(p.inventory) > 0 && Number(p.inventory) <= 5;
                                    const outOfStock = Number(p.inventory) === 0;
                                    return (
                                        <tr key={p.id} className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                            <td className="px-4 py-3">
                                                <div className="w-12 h-12 rounded-lg border border-gray-100 bg-white flex items-center justify-center overflow-hidden">
                                                    {p.image
                                                        ? <img src={p.image} alt="" className="w-full h-full object-contain" />
                                                        : <i className="fas fa-image text-gray-300 text-xl"></i>
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{p.asin_sku || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3 max-w-[220px]">
                                                <p className="font-medium text-gray-900 truncate" title={p.name}>{p.name}</p>
                                                {(p.category || p.sub_category) && (
                                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{[p.category, p.sub_category].filter(Boolean).join(' › ')}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{p.model_no || '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-gray-400 line-through text-xs">₹{Number(p.mrp).toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-semibold text-green-700">₹{Number(p.csp_price).toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {Number(discount) > 0
                                                    ? <span className="inline-block text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">{discount}% off</span>
                                                    : <span className="text-gray-300">—</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">{p.points ?? 0} pts</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {outOfStock
                                                    ? <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Out of stock</span>
                                                    : lowStock
                                                        ? <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{p.inventory} left</span>
                                                        : <span className="text-xs text-gray-700 font-medium">{p.inventory}</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => { setSelectedProduct(p); setOpenPreviewDialog(true); }}
                                                        title="View details"
                                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                                                    >
                                                        <i className="fas fa-eye text-sm"></i>
                                                    </button>
                                                    {p.url && (
                                                        <a
                                                            href={p.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="View on Amazon"
                                                            className="p-1.5 hover:bg-orange-50 rounded-lg text-gray-400 hover:text-orange-600 transition-colors"
                                                        >
                                                            <i className="fab fa-amazon text-sm"></i>
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* UPLOAD DIALOG */}
            {openUploadDialog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Upload Products CSV</h4>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition"
                            onClick={() => fileInputRef.current?.click()}>
                            <input type="file" accept=".csv" hidden ref={fileInputRef} onChange={handleFileChange} />
                            <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                            <p className="text-sm text-gray-600">{selectedFile ? selectedFile.name : "Click to select CSV file"}</p>
                        </div>
                        {uploadMutation.isPending && (
                            <div className="mt-3 text-center">
                                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                <p className="text-xs text-gray-500 mt-1">Uploading...</p>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 mt-4">
                            <button className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50" onClick={() => setOpenUploadDialog(false)}>Cancel</button>
                            <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={!selectedFile || uploadMutation.isPending} onClick={handleUpload}>Upload</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PREVIEW DIALOG */}
            {openPreviewDialog && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h4>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div>
                                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-[200px] h-[200px] object-contain rounded-lg" />
                            </div>
                            <div className="flex-1">
                                <h5 className="text-lg font-semibold">{selectedProduct.name}</h5>
                                <p className="text-sm text-gray-500 mb-2">Model: {selectedProduct.model_no}</p>
                                <div className="flex gap-2 mb-3">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{selectedProduct.category}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">{selectedProduct.sub_category}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                    <div>
                                        <p className="text-xs text-gray-500">MRP</p>
                                        <p className="text-base font-semibold text-red-600">₹{selectedProduct.mrp}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">CSP</p>
                                        <p className="text-base font-semibold text-green-600">₹{selectedProduct.csp_price}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Points</p>
                                        <p className="text-base font-semibold">{selectedProduct.points}</p>
                                    </div>
                                </div>
                                <p className="text-sm font-medium mt-3 mb-1">Description</p>
                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded max-h-[150px] overflow-auto">{selectedProduct.description}</p>
                                <a href={selectedProduct.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                                    View on Amazon →
                                </a>
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50" onClick={() => setOpenPreviewDialog(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SNACKBAR */}
            {snackbarOpen && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                    <span className="text-sm">{snackbarMessage}</span>
                    <button onClick={() => setSnackbarOpen(false)} className="text-blue-600 hover:text-blue-800 font-bold text-sm">✕</button>
                </div>
            )}
        </div>
    );
}
