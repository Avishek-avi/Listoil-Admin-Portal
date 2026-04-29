import React from 'react';

interface QRStatisticsProps {
    totalGenerated: number;
    totalScanned: number;
}

const QRStatistics: React.FC<QRStatisticsProps> = ({ totalGenerated, totalScanned }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="widget-card rounded-xl shadow p-6">
                <p className="text-sm text-gray-500 mb-1">Total QR Generated</p>
                <h3 className="text-3xl font-bold text-gray-900">{totalGenerated}</h3>
                <p className="text-sm text-green-600 mt-2">+12% from last month</p>
            </div>
            <div className="widget-card rounded-xl shadow p-6">
                <p className="text-sm text-gray-500 mb-1">Total Scanned</p>
                <h3 className="text-3xl font-bold text-gray-900">{totalScanned}</h3>
                <p className="text-sm text-red-600 mt-2">0% conversion rate</p>
            </div>
        </div>
    );
};

export default QRStatistics;
