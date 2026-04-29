"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { useQuery } from '@tanstack/react-query'
import { getMisAnalyticsAction } from '@/actions/mis-actions'
import { getReportDataAction, ReportColumn, ReportData } from '@/actions/report-actions'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

type RefReportConfig = {
    id: string;
    title: string;
    icon: string;
    sourceCategory: string;
    columns: ReportColumn[];
};

type ReportFilterDef = {
    id: string;
    label: string;
    type: 'text' | 'date-range' | 'number-range';
    keys: string[];
};

type ReportFilterValue = {
    value?: string;
    from?: string;
    to?: string;
    min?: string;
    max?: string;
};

const REPORT_CONFIGS: RefReportConfig[] = [
    {
        id: 'application-login',
        title: '1. Application Login',
        icon: 'fa-user-clock',
        sourceCategory: 'registration',
        columns: [
            { key: 'userNameUserIdMobile', label: 'User Name & UserId/Mobile', type: 'text' },
            { key: 'userTypeRole', label: 'User Type/Role', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'firstLoginDateTime', label: 'First Login Date & Time', type: 'date' },
            { key: 'lastLoginDateTime', label: 'Last Login Date & Time', type: 'date' },
            { key: 'loginDevice', label: 'Login Device', type: 'text' },
            { key: 'logoutDateTime', label: 'Logout Date & Time', type: 'date' },
            { key: 'welcomePointsEarned', label: 'Welcome Points Earned', type: 'number' },
            { key: 'totalScannedPoints', label: 'Total Scanned Points', type: 'number' },
            { key: 'totalRewardPoints', label: 'Total Reward Points', type: 'number' },
            { key: 'totalRedeemedPoints', label: 'Total Redeemed Points', type: 'number' },
            { key: 'totalBalancePoints', label: 'Total Balance Points', type: 'number' }
        ]
    },
    {
        id: 'registered-users',
        title: '2. Registered Users',
        icon: 'fa-users',
        sourceCategory: 'registration',
        columns: [
            { key: 'userId', label: 'User ID', type: 'text' },
            { key: 'uniqueCode', label: 'Unique Code', type: 'text' },
            { key: 'userTypeRole', label: 'User Type/Role', type: 'text' },
            { key: 'status', label: 'Status', type: 'status' },
            { key: 'email', label: 'Email', type: 'text' },
            { key: 'mobileNumber', label: 'Mobile Number', type: 'text' },
            { key: 'fullName', label: 'Full Name', type: 'text' },
            { key: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text' },
            { key: 'panNumber', label: 'PAN Number', type: 'text' },
            { key: 'aadhaarStatus', label: 'Aadhaar Status', type: 'status' },
            { key: 'dateOfBirth', label: 'Date of Birth', type: 'text' },
            { key: 'gender', label: 'Gender', type: 'text' },
            { key: 'age', label: 'Age', type: 'number' },
            { key: 'country', label: 'Country', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'mappedRetailer1', label: 'Mapped Retailer 1', type: 'text' },
            { key: 'mappedRetailer2', label: 'Mapped Retailer 2', type: 'text' }
        ]
    },
    {
        id: 'qr-transaction',
        title: '3. QR Transaction',
        icon: 'fa-qrcode',
        sourceCategory: 'qr-scans',
        columns: [
            { key: 'transactionId', label: 'Transaction ID', type: 'text' },
            { key: 'transactionDate', label: 'Transaction Date', type: 'date' },
            { key: 'amount', label: 'Amount', type: 'currency' },
            { key: 'paymentStatus', label: 'Payment Status', type: 'status' },
            { key: 'qrCodeId', label: 'QR Code ID', type: 'text' },
            { key: 'purpose', label: 'Purpose', type: 'text' },
            { key: 'qrContent', label: 'QR Content', type: 'text' },
            { key: 'skuUniqueCode', label: 'SKU_UNIQUE_CODE', type: 'text' },
            { key: 'itemDescription', label: 'ITEM_DESCRIPTION', type: 'text' },
            { key: 'userId', label: 'User ID', type: 'text' },
            { key: 'userName', label: 'User Name', type: 'text' },
            { key: 'userTypeRole', label: 'User Type/Role', type: 'text' },
            { key: 'email', label: 'Email', type: 'text' },
            { key: 'phone', label: 'Phone', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'latitude', label: 'Latitude', type: 'text' },
            { key: 'longitude', label: 'Longitude', type: 'text' },
            { key: 'address', label: 'Address', type: 'text' },
            { key: 'country', label: 'Country', type: 'text' }
        ]
    },
    {
        id: 'redemption',
        title: '4. Redemption',
        icon: 'fa-exchange-alt',
        sourceCategory: 'redemptions',
        columns: [
            { key: 'redemptionId', label: 'Redemption ID', type: 'text' },
            { key: 'userFullName', label: 'User Full Name', type: 'text' },
            { key: 'userUniqueCode', label: 'User Unique Code', type: 'text' },
            { key: 'userTypeRole', label: 'User Type/Role', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'redeemedPoints', label: 'Redeemed Points', type: 'number' },
            { key: 'status', label: 'Status', type: 'status' },
            { key: 'userMobileNumber', label: 'User Mobile Number', type: 'text' },
            { key: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
            { key: 'totalEarnedPoints', label: 'Total Earned Points', type: 'number' },
            { key: 'redemptionRequestDate', label: 'Redemption Request Date', type: 'date' },
            { key: 'redemptionProcessedDate', label: 'Redemption Processed Date', type: 'date' },
            { key: 'redemptionDetails', label: 'Redemption Details', type: 'text' }
        ]
    },
    {
        id: 'bank-details',
        title: '5. Bank Details',
        icon: 'fa-university',
        sourceCategory: 'bank',
        columns: [
            { key: 'userId', label: 'User ID', type: 'text' },
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'userTypeRole', label: 'User Type/Role', type: 'text' },
            { key: 'bankName', label: 'Bank Name', type: 'text' },
            { key: 'accountNumber', label: 'Account Number', type: 'text' },
            { key: 'ifscCode', label: 'IFSC Code', type: 'text' },
            { key: 'status', label: 'Status', type: 'status' }
        ]
    },
    {
        id: 'otp',
        title: '6. OTP',
        icon: 'fa-key',
        sourceCategory: 'otp',
        columns: [
            { key: 'userId', label: 'User ID', type: 'text' },
            { key: 'userName', label: 'User Name', type: 'text' },
            { key: 'mobileNumber', label: 'Mobile Number', type: 'text' },
            { key: 'otpCode', label: 'OTP Code', type: 'text' },
            { key: 'otpGeneratedAt', label: 'OTP Generated At', type: 'date' },
            { key: 'otpExpiredAt', label: 'OTP Expired At', type: 'date' },
            { key: 'otpType', label: 'OTP Type', type: 'text' },
            { key: 'otpStatus', label: 'OTP Status', type: 'status' }
        ]
    },
    {
        id: 'kyc',
        title: '7. KYC',
        icon: 'fa-id-card',
        sourceCategory: 'compliance',
        columns: [
            { key: 'userId', label: 'User ID', type: 'text' },
            { key: 'uniqueCode', label: 'Unique Code', type: 'text' },
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'userTypeRole', label: 'User Type/Role', type: 'text' },
            { key: 'mobileNumber', label: 'Mobile Number', type: 'text' },
            { key: 'emailId', label: 'Email ID', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'status', label: 'Status', type: 'status' },
            { key: 'kycVerified', label: 'KYC Verified', type: 'status' },
            { key: 'dateOfBirth', label: 'Date of Birth', type: 'text' },
            { key: 'createdAt', label: 'Created At', type: 'date' },
            { key: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text' },
            { key: 'aadhaarFrontImage', label: 'Aadhaar Front Image', type: 'text' },
            { key: 'aadhaarBackImage', label: 'Aadhaar Back Image', type: 'text' },
            { key: 'panFrontImage', label: 'PAN Front Image', type: 'text' },
            { key: 'profileImage', label: 'Profile Image', type: 'text' }
        ]
    },
    {
        id: 'product-wise',
        title: '8. Product Wise',
        icon: 'fa-boxes',
        sourceCategory: 'qr-scans',
        columns: [
            { key: 'userId', label: 'User ID', type: 'text' },
            { key: 'memberName', label: 'Member Name', type: 'text' },
            { key: 'userType', label: 'User Type', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'skuUniqueCode', label: 'SKU_UNIQUE_CODE', type: 'text' },
            { key: 'itemDescription', label: 'ITEM_DESCRIPTION', type: 'text' },
            { key: 'qrPlacement', label: 'QR_PLACEMENT', type: 'text' },
            { key: 'l1Vertical', label: 'L1_VERTICAL', type: 'text' },
            { key: 'l2Range', label: 'L2_RANGE', type: 'text' },
            { key: 'l3Category', label: 'L3_CATEGORY', type: 'text' },
            { key: 'l4Subcategory', label: 'L4_SUBCATEGORY', type: 'text' },
            { key: 'l5RatingType', label: 'L5_RATING_TYPE', type: 'text' },
            { key: 'l6Colour', label: 'L6_COLOUR', type: 'text' },
            { key: 'mrp', label: 'MRP', type: 'currency' },
            { key: 'scanDate', label: 'Scan Date', type: 'date' },
            { key: 'basePoints', label: 'BASE_POINTS', type: 'number' },
            { key: 'bonusPoints', label: 'BONUS_POINTS', type: 'number' },
            { key: 'totalPointsEarned', label: 'TOTAL_POINTS_EARNED', type: 'number' },
            { key: 'commonQr', label: 'COMMON_QR', type: 'text' }
        ]
    },
    {
        id: 'category',
        title: '9. Category',
        icon: 'fa-sitemap',
        sourceCategory: 'sales',
        columns: [
            { key: 'l1Vertical', label: 'L1_VERTICAL', type: 'text' },
            { key: 'l2Range', label: 'L2_RANGE', type: 'text' },
            { key: 'l3Category', label: 'L3_CATEGORY', type: 'text' },
            { key: 'l4Subcategory', label: 'L4_SUBCATEGORY', type: 'text' },
            { key: 'l5RatingType', label: 'L5_RATING_TYPE', type: 'text' },
            { key: 'l6Colour', label: 'L6_COLOUR', type: 'text' },
            { key: 'userType', label: 'User Type', type: 'text' },
            { key: 'productsInThisCategory', label: 'Products in this Category', type: 'text' },
            { key: 'bonusPoints', label: 'Bonus Points', type: 'number' },
            { key: 'bonusPointsActive', label: 'Bonus Points Active', type: 'status' }
        ]
    },
    {
        id: 'error-transaction',
        title: '10. Error Transaction',
        icon: 'fa-exclamation-triangle',
        sourceCategory: 'qr-scans',
        columns: [
            { key: 'userName', label: 'User Name', type: 'text' },
            { key: 'userMobileNumber', label: 'User Mobile Number', type: 'text' },
            { key: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
            { key: 'userTypeRole', label: 'User Type/Role', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'scanDate', label: 'Scan Date', type: 'date' },
            { key: 'skuUniqueCode', label: 'SKU_UNIQUE_CODE', type: 'text' },
            { key: 'itemDescription', label: 'ITEM_DESCRIPTION', type: 'text' },
            { key: 'l1Vertical', label: 'L1_VERTICAL', type: 'text' },
            { key: 'l2Range', label: 'L2_RANGE', type: 'text' },
            { key: 'l3Category', label: 'L3_CATEGORY', type: 'text' },
            { key: 'l4Subcategory', label: 'L4_SUBCATEGORY', type: 'text' },
            { key: 'l5RatingType', label: 'L5_RATING_TYPE', type: 'text' },
            { key: 'l6Colour', label: 'L6_COLOUR', type: 'text' },
            { key: 'qrDetails', label: 'QR Details', type: 'text' },
            { key: 'message', label: 'Message', type: 'text' },
            { key: 'productStatus', label: 'Product Status', type: 'status' },
            { key: 'actionTaken', label: 'Action Taken', type: 'text' }
        ]
    },
    {
        id: 'referrals',
        title: '11. Referrals',
        icon: 'fa-share-alt',
        sourceCategory: 'referrals',
        columns: [
            { key: 'senderUniqueCode', label: 'Sender Unique Code', type: 'text' },
            { key: 'senderMobileNumber', label: 'Sender Mobile Number', type: 'text' },
            { key: 'senderName', label: 'Sender Name', type: 'text' },
            { key: 'senderUserType', label: 'Sender User Type', type: 'text' },
            { key: 'senderZone', label: 'Sender Zone', type: 'text' },
            { key: 'senderState', label: 'Sender State', type: 'text' },
            { key: 'senderDistrict', label: 'Sender District', type: 'text' },
            { key: 'senderCity', label: 'Sender City', type: 'text' },
            { key: 'senderPincode', label: 'Sender Pincode', type: 'text' },
            { key: 'receiverUniqueCode', label: 'Receiver Unique Code', type: 'text' },
            { key: 'receiverMobileNumber', label: 'Receiver Mobile Number', type: 'text' },
            { key: 'receiverName', label: 'Receiver Name', type: 'text' },
            { key: 'receiverUserType', label: 'Receiver User Type', type: 'text' },
            { key: 'receiverZone', label: 'Receiver Zone', type: 'text' },
            { key: 'receiverState', label: 'Receiver State', type: 'text' },
            { key: 'receiverDistrict', label: 'Receiver District', type: 'text' },
            { key: 'receiverCity', label: 'Receiver City', type: 'text' },
            { key: 'receiverPincode', label: 'Receiver Pincode', type: 'text' },
            { key: 'referralCode', label: 'Referral Code', type: 'text' },
            { key: 'pointsEarnedBySender', label: 'Points Earned by Sender', type: 'number' },
            { key: 'pointsEarnedByReceiver', label: 'Points Earned by Receiver', type: 'number' },
            { key: 'dateOfReferral', label: 'Date of Referral', type: 'date' }
        ]
    },
    {
        id: 'notification',
        title: '12. Notification',
        icon: 'fa-bell',
        sourceCategory: 'notifications',
        columns: [
            { key: 'notificationTitle', label: 'Notification Title', type: 'text' },
            { key: 'notificationMessage', label: 'Notification Message', type: 'text' },
            { key: 'userName', label: 'User Name', type: 'text' },
            { key: 'status', label: 'Status', type: 'status' },
            { key: 'sentDate', label: 'Sent Date', type: 'date' }
        ]
    },
    {
        id: 'blocked-member',
        title: '13. Blocked Member',
        icon: 'fa-user-slash',
        sourceCategory: 'registration',
        columns: [
            { key: 'userName', label: 'User Name', type: 'text' },
            { key: 'mobileNumber', label: 'Mobile Number', type: 'text' },
            { key: 'userTypeRole', label: 'User Type/Role', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
            { key: 'totalEarnedPoints', label: 'Total Earned Points', type: 'number' },
            { key: 'redeemedPoints', label: 'Redeemed Points', type: 'number' },
            { key: 'redemptionRequestDate', label: 'Redemption Request Date', type: 'date' },
            { key: 'redemptionProcessedDate', label: 'Redemption Processed Date', type: 'date' },
            { key: 'redemptionDetails', label: 'Redemption Details', type: 'text' },
            { key: 'upiId', label: 'UPI ID', type: 'text' },
            { key: 'accountNumber', label: 'Account Number', type: 'text' },
            { key: 'accountHolderName', label: 'Account Holder Name', type: 'text' },
            { key: 'ifscCode', label: 'IFSC Code', type: 'text' },
            { key: 'bankName', label: 'Bank Name', type: 'text' },
            { key: 'status', label: 'Status', type: 'status' }
        ]
    },
    {
        id: 'blocked-qr-scan',
        title: '14. Blocked QR Scan',
        icon: 'fa-ban',
        sourceCategory: 'qr-scans',
        columns: [
            { key: 'userName', label: 'User Name', type: 'text' },
            { key: 'mobileNumber', label: 'Mobile Number', type: 'text' },
            { key: 'userTypeRole', label: 'User Type/Role', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
            { key: 'scanId', label: 'Scan ID', type: 'text' },
            { key: 'dateOfScan', label: 'Date of Scan', type: 'date' },
            { key: 'skuUniqueCode', label: 'SKU_UNIQUE_CODE', type: 'text' },
            { key: 'itemDescription', label: 'ITEM_DESCRIPTION', type: 'text' },
            { key: 'l1Vertical', label: 'L1_VERTICAL', type: 'text' },
            { key: 'l2Range', label: 'L2_RANGE', type: 'text' },
            { key: 'l3Category', label: 'L3_CATEGORY', type: 'text' },
            { key: 'l4Subcategory', label: 'L4_SUBCATEGORY', type: 'text' },
            { key: 'l5RatingType', label: 'L5_RATING_TYPE', type: 'text' },
            { key: 'l6Colour', label: 'L6_COLOUR', type: 'text' },
            { key: 'qrDetails', label: 'QR Details', type: 'text' },
            { key: 'qrPlacement', label: 'QR_PLACEMENT', type: 'text' },
            { key: 'basePoint', label: 'Base Point', type: 'number' },
            { key: 'extraBonusPoint', label: 'Extra Bonus Point', type: 'number' },
            { key: 'totalPoints', label: 'Total Points', type: 'number' },
            { key: 'scanStatus', label: 'Scan Status', type: 'status' },
            { key: 'commonQr', label: 'COMMON_QR', type: 'text' }
        ]
    },
    {
        id: 'anomaly',
        title: '15. Anomaly',
        icon: 'fa-search',
        sourceCategory: 'qr-scans',
        columns: [
            { key: 'referenceId', label: 'Reference ID', type: 'text' },
            { key: 'zone', label: 'Zone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'district', label: 'District', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'pincode', label: 'Pincode', type: 'text' },
            { key: 'influencerName', label: 'Influencer Name', type: 'text' },
            { key: 'userMobileNumber', label: 'User Mobile Number', type: 'text' },
            { key: 'userTypeRole', label: 'User Type/Role', type: 'text' },
            { key: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
            { key: 'skuUniqueCode', label: 'SKU_UNIQUE_CODE', type: 'text' },
            { key: 'itemDescription', label: 'ITEM_DESCRIPTION', type: 'text' },
            { key: 'l1Vertical', label: 'L1_VERTICAL', type: 'text' },
            { key: 'l2Range', label: 'L2_RANGE', type: 'text' },
            { key: 'l3Category', label: 'L3_CATEGORY', type: 'text' },
            { key: 'l4Subcategory', label: 'L4_SUBCATEGORY', type: 'text' },
            { key: 'l5RatingType', label: 'L5_RATING_TYPE', type: 'text' },
            { key: 'l6Colour', label: 'L6_COLOUR', type: 'text' },
            { key: 'dateOfScan', label: 'Date of Scan', type: 'date' },
            { key: 'frequencyOfAnomaly', label: 'Frequency of Anomaly', type: 'number' },
            { key: 'expectedRewardMech', label: 'Expected Reward (Mech)', type: 'number' },
            { key: 'expectedRewardDealerRet', label: 'Expected Reward (Dealer/Ret)', type: 'number' },
            { key: 'expectedRewardCsb', label: 'Expected Reward (CSB)', type: 'number' },
            { key: 'totalPointsEarned', label: 'Total Points Earned', type: 'number' },
            { key: 'totalPointsRedeemed', label: 'Total Points Redeemed', type: 'number' },
            { key: 'firstScanDate', label: 'First Scan Date', type: 'date' },
            { key: 'lastScanDate', label: 'Last Scan Date', type: 'date' },
            { key: 'lastScanId', label: 'Last Scan ID', type: 'text' },
            { key: 'updatedAt', label: 'Updated At', type: 'date' },
            { key: 'actionTaken', label: 'Action Taken', type: 'text' }
        ]
    },
    {
        id: 'tds-summary',
        title: '16. TDS Summary',
        icon: 'fa-file-invoice-dollar',
        sourceCategory: 'registration',
        columns: [
            { key: 'userNameUserIdMobile', label: 'User Name & UserId/Mobile', type: 'text' },
            { key: 'userType', label: 'User Type', type: 'text' },
            { key: 'age', label: 'Age', type: 'number' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'lifetimeEarnedPoints', label: 'Lifetime Earned Points', type: 'number' },
            { key: 'cfyEarnedPoints', label: 'CFY Earned Points', type: 'number' },
            { key: 'userRedeemablePoints', label: 'User Redeemable Points', type: 'number' },
            { key: 'tdsKitty', label: 'TDS Kitty', type: 'number' },
            { key: 'lifetimeTdsDeducted', label: 'Lifetime TDS Deducted', type: 'number' },
            { key: 'cyTdsDeducted', label: 'CY TDS Deducted', type: 'number' },
            { key: 'lifetimeRedeemedPoints', label: 'Lifetime Redeemed Points', type: 'number' },
            { key: 'currentFyRedeemedPoints', label: 'Current FY Redeemed Points', type: 'number' },
            { key: 'tdsSlab', label: 'TDS Slab', type: 'text' },
            { key: 'closingBalance', label: 'Closing Balance', type: 'number' },
            { key: 'fy', label: 'FY', type: 'text' }
        ]
    }
];

const REPORT_FILTER_LABELS: Record<string, string[]> = {
    'application-login': ['Date Range (Login)', 'User Type', 'Zone', 'State', 'District', 'City', 'Pincode', 'Device', 'Points Range'],
    'registered-users': ['Role', 'Status', 'Zone', 'State', 'District', 'City', 'Pincode', 'Age Group', 'Gender', 'Date Range'],
    'qr-transaction': ['Date Range', 'Payment Status', 'SKU_UNIQUE_CODE', 'User Type', 'Zone', 'State', 'District', 'City', 'Amount Range'],
    'redemption': ['Status', 'User Type', 'Zone', 'State', 'District', 'City', 'Date Range', 'Points Range', 'Redemption Type'],
    'bank-details': ['Role', 'Bank Name', 'Account Type', 'Zone', 'State', 'District', 'City'],
    'otp': ['Date Range', 'OTP Type', 'Purpose', 'Status', 'User Type', 'Zone', 'State'],
    'kyc': ['KYC Status', 'Role', 'Zone', 'State', 'District', 'City', 'Date Range'],
    'product-wise': ['Date Range', 'SKU_UNIQUE_CODE', 'L1-L6 Hierarchy', 'User Type', 'Zone', 'State', 'District', 'City', 'Points Range'],
    'category': ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'User Type', 'Bonus Active'],
    'error-transaction': ['Date Range', 'SKU', 'User Type', 'Zone', 'State', 'District', 'City', 'Message', 'Action Taken'],
    'referrals': ['Date Range', 'Sender/Receiver Mobile', 'Referral Code'],
    'notification': ['Date Range', 'User Type', 'Zone', 'State', 'District', 'City', 'Sent Via'],
    'blocked-member': ['User Type', 'Zone', 'State', 'District', 'City', 'Status', 'Date Range'],
    'blocked-qr-scan': ['Date Range', 'SKU', 'Zone', 'State', 'District', 'City', 'Scan Status', 'User Type'],
    'anomaly': ['Date Range', 'SKU', 'Zone', 'State', 'District', 'City', 'Frequency >1', 'Action Taken'],
    'tds-summary': ['Date Range (FY)', 'User Type', 'State', 'PAN Availability', 'Points Range', 'TDS Slab', 'FY']
};

const buildReportFilterDefs = (reportId: string | null, columns: ReportColumn[]): ReportFilterDef[] => {
    if (!reportId) return [];

    const labels = REPORT_FILTER_LABELS[reportId] || [];
    const numberKeys = columns.filter((c) => c.type === 'number' || c.type === 'currency').map((c) => c.key);
    const dateKeys = columns.filter((c) => c.type === 'date').map((c) => c.key);

    const pickFirst = (...keys: string[]) => keys.filter((k) => columns.some((c) => c.key === k));

    const mapLabelToDef = (label: string): ReportFilterDef => {
        const l = label.toLowerCase();

        if (l.includes('date range (login)')) return { id: label, label, type: 'date-range', keys: pickFirst('firstLoginDateTime', 'lastLoginDateTime') };
        if (l.includes('date range') && !l.includes('(fy)')) return { id: label, label, type: 'date-range', keys: dateKeys };
        if (l.includes('points range')) return { id: label, label, type: 'number-range', keys: numberKeys.filter((k) => k.toLowerCase().includes('point') || k.toLowerCase().includes('tds') || k.toLowerCase().includes('balance')) };
        if (l.includes('amount range')) return { id: label, label, type: 'number-range', keys: pickFirst('amount') };
        if (l.includes('frequency >1')) return { id: label, label, type: 'number-range', keys: pickFirst('frequencyOfAnomaly') };
        if (l.includes('user type') || l === 'role') return { id: label, label, type: 'text', keys: pickFirst('userTypeRole', 'userType', 'senderUserType', 'receiverUserType') };
        if (l.includes('zone')) return { id: label, label, type: 'text', keys: pickFirst('zone', 'senderZone', 'receiverZone') };
        if (l.includes('state')) return { id: label, label, type: 'text', keys: pickFirst('state', 'senderState', 'receiverState') };
        if (l.includes('district')) return { id: label, label, type: 'text', keys: pickFirst('district', 'senderDistrict', 'receiverDistrict') };
        if (l.includes('city')) return { id: label, label, type: 'text', keys: pickFirst('city', 'senderCity', 'receiverCity') };
        if (l.includes('pincode')) return { id: label, label, type: 'text', keys: pickFirst('pincode', 'senderPincode', 'receiverPincode') };
        if (l.includes('device')) return { id: label, label, type: 'text', keys: pickFirst('loginDevice') };
        if (l.includes('payment status')) return { id: label, label, type: 'text', keys: pickFirst('paymentStatus') };
        if (l.includes('scan status')) return { id: label, label, type: 'text', keys: pickFirst('scanStatus') };
        if (l === 'status') return { id: label, label, type: 'text', keys: pickFirst('status', 'otpStatus', 'productStatus') };
        if (l.includes('kyc status')) return { id: label, label, type: 'text', keys: pickFirst('kycVerified', 'aadhaarStatus') };
        if (l.includes('otp type')) return { id: label, label, type: 'text', keys: pickFirst('otpType') };
        if (l === 'purpose') return { id: label, label, type: 'text', keys: pickFirst('otpPurpose', 'purpose') };
        if (l.includes('sku')) return { id: label, label, type: 'text', keys: pickFirst('skuUniqueCode') };
        if (l.includes('message')) return { id: label, label, type: 'text', keys: pickFirst('message', 'notificationMessage') };
        if (l.includes('action taken')) return { id: label, label, type: 'text', keys: pickFirst('actionTaken') };
        if (l.includes('referral code')) return { id: label, label, type: 'text', keys: pickFirst('referralCode') };
        if (l.includes('sender/receiver mobile')) return { id: label, label, type: 'text', keys: pickFirst('senderMobileNumber', 'receiverMobileNumber') };
        if (l.includes('bank name')) return { id: label, label, type: 'text', keys: pickFirst('bankName') };
        if (l.includes('account type')) return { id: label, label, type: 'text', keys: pickFirst('accountType') };
        if (l.includes('redemption type')) return { id: label, label, type: 'text', keys: pickFirst('redemptionDetails') };
        if (l.includes('l1-l6 hierarchy')) return { id: label, label, type: 'text', keys: pickFirst('l1Vertical', 'l2Range', 'l3Category', 'l4Subcategory', 'l5RatingType', 'l6Colour') };
        if (l === 'l1') return { id: label, label, type: 'text', keys: pickFirst('l1Vertical') };
        if (l === 'l2') return { id: label, label, type: 'text', keys: pickFirst('l2Range') };
        if (l === 'l3') return { id: label, label, type: 'text', keys: pickFirst('l3Category') };
        if (l === 'l4') return { id: label, label, type: 'text', keys: pickFirst('l4Subcategory') };
        if (l === 'l5') return { id: label, label, type: 'text', keys: pickFirst('l5RatingType') };
        if (l === 'l6') return { id: label, label, type: 'text', keys: pickFirst('l6Colour') };
        if (l.includes('bonus active')) return { id: label, label, type: 'text', keys: pickFirst('bonusPointsActive') };
        if (l.includes('sent via')) return { id: label, label, type: 'text', keys: pickFirst('sentVia') };
        if (l.includes('tds slab')) return { id: label, label, type: 'text', keys: pickFirst('tdsSlab') };
        if (l === 'fy' || l.includes('date range (fy)')) return { id: label, label, type: 'text', keys: pickFirst('fy') };
        if (l.includes('pan availability')) return { id: label, label, type: 'text', keys: pickFirst('panNumber') };
        if (l.includes('age group')) return { id: label, label, type: 'text', keys: pickFirst('age') };
        if (l.includes('gender')) return { id: label, label, type: 'text', keys: pickFirst('gender') };

        return { id: label, label, type: 'text', keys: [] };
    };

    return labels.map(mapLabelToDef).filter((def) => def.keys.length > 0);
};

function mapRowsForReport(reportId: string, rows: any[]): any[] {
    const fallback = '-';

    switch (reportId) {
        case 'application-login':
            return rows.map((r) => ({
                userNameUserIdMobile: `${r.name || fallback} (${r.id || fallback}/${r.phone || fallback})`,
                userTypeRole: r.role || fallback,
                zone: r.zone || fallback,
                state: r.state || fallback,
                district: r.district || fallback,
                city: r.city || fallback,
                pincode: r.pincode || fallback,
                firstLoginDateTime: r.createdAt,
                lastLoginDateTime: r.lastLoginAt || r.createdAt,
                loginDevice: fallback,
                logoutDateTime: null,
                welcomePointsEarned: 0,
                totalScannedPoints: 0,
                totalRewardPoints: 0,
                totalRedeemedPoints: 0,
                totalBalancePoints: 0
            }));

        case 'registered-users':
            return rows.map((r) => ({
                userId: r.id,
                uniqueCode: `U-${r.id}`,
                userTypeRole: r.role || fallback,
                status: r.status || fallback,
                email: r.email || fallback,
                mobileNumber: r.phone || fallback,
                fullName: r.name || fallback,
                aadhaarNumber: r.aadhaarNumber || fallback,
                panNumber: r.panNumber || fallback,
                aadhaarStatus: r.kycStatus || fallback,
                dateOfBirth: r.dateOfBirth || fallback,
                gender: r.gender || fallback,
                age: r.age,
                country: 'India',
                zone: r.zone || fallback,
                state: r.state || fallback,
                district: r.district || fallback,
                city: r.city || fallback,
                pincode: r.pincode || fallback,
                mappedRetailer1: fallback,
                mappedRetailer2: fallback
            }));

        case 'qr-transaction':
            return rows.map((r) => ({
                transactionId: r.id,
                transactionDate: r.createdAt,
                amount: r.points || 0,
                paymentStatus: r.status || fallback,
                qrCodeId: r.qrCode || fallback,
                purpose: 'Product Purchase',
                qrContent: r.qrCode || fallback,
                skuUniqueCode: r.sku || fallback,
                itemDescription: r.category || fallback,
                userId: r.userId || fallback,
                userName: r.userName || fallback,
                userTypeRole: r.userType || fallback,
                email: r.userEmail || fallback,
                phone: r.userPhone || fallback,
                zone: r.zone || fallback,
                state: r.state || fallback,
                district: r.district || fallback,
                city: r.city || fallback,
                pincode: r.pincode || fallback,
                latitude: fallback,
                longitude: fallback,
                address: fallback,
                country: 'India'
            }));

        case 'redemption':
            return rows.map((r) => ({
                redemptionId: r.id,
                userFullName: r.userName || fallback,
                userUniqueCode: `U-${r.id}`,
                userTypeRole: r.userType || fallback,
                zone: r.zone || fallback,
                state: r.state || fallback,
                district: fallback,
                city: r.city || fallback,
                pincode: fallback,
                redeemedPoints: r.points || 0,
                status: r.status || fallback,
                userMobileNumber: r.userPhone || fallback,
                dateOfJoining: null,
                totalEarnedPoints: null,
                redemptionRequestDate: r.createdAt,
                redemptionProcessedDate: r.createdAt,
                redemptionDetails: r.channel || fallback
            }));

        case 'kyc':
            return rows.map((r) => ({
                userId: r.id,
                uniqueCode: `U-${r.id}`,
                name: r.userName || fallback,
                userTypeRole: r.userType || fallback,
                mobileNumber: r.userPhone || fallback,
                emailId: r.userEmail || fallback,
                zone: r.zone || fallback,
                state: r.state || fallback,
                district: fallback,
                city: r.city || fallback,
                pincode: fallback,
                status: r.status || fallback,
                kycVerified: r.status || fallback,
                dateOfBirth: fallback,
                createdAt: r.uploadedAt,
                aadhaarNumber: fallback,
                aadhaarFrontImage: fallback,
                aadhaarBackImage: fallback,
                panFrontImage: fallback,
                profileImage: fallback
            }));

        case 'bank-details':
            return rows.map((r) => ({
                userId: r.id,
                name: r.name || fallback,
                userTypeRole: r.type || fallback,
                email: r.email || fallback,
                zone: r.zone || fallback,
                state: r.state || fallback,
                district: r.district || fallback,
                city: r.city || fallback,
                pincode: r.pincode || fallback,
                bankName: r.bank || fallback,
                accountNumber: r.account || fallback,
                ifscCode: r.ifsc || fallback,
                status: r.status || fallback
            }));

        case 'product-wise':
            return rows.map((r) => ({
                userId: r.userId || fallback,
                memberName: r.userName || fallback,
                userType: r.userType || fallback,
                zone: fallback,
                state: r.state || fallback,
                district: fallback,
                city: r.city || fallback,
                pincode: fallback,
                skuUniqueCode: r.sku || fallback,
                itemDescription: r.category || fallback,
                qrPlacement: fallback,
                l1Vertical: fallback,
                l2Range: fallback,
                l3Category: r.category || fallback,
                l4Subcategory: fallback,
                l5RatingType: fallback,
                l6Colour: fallback,
                mrp: null,
                scanDate: r.createdAt,
                basePoints: r.points || 0,
                bonusPoints: 0,
                totalPointsEarned: r.points || 0,
                commonQr: fallback
            }));

        case 'error-transaction':
            return rows
                .filter((r) => (r.status || '').toLowerCase() !== 'success')
                .map((r) => ({
                    userName: fallback,
                    userMobileNumber: fallback,
                    dateOfJoining: null,
                    userTypeRole: r.userType || fallback,
                    zone: fallback,
                    state: fallback,
                    district: fallback,
                    city: fallback,
                    pincode: fallback,
                    scanDate: r.createdAt,
                    skuUniqueCode: r.sku || fallback,
                    itemDescription: r.category || fallback,
                    l1Vertical: fallback,
                    l2Range: fallback,
                    l3Category: r.category || fallback,
                    l4Subcategory: fallback,
                    l5RatingType: fallback,
                    l6Colour: fallback,
                    qrDetails: r.qrCode || fallback,
                    message: r.status || fallback,
                    productStatus: r.status || fallback,
                    actionTaken: fallback
                }));

        case 'referrals':
            return rows.map((r) => ({
                senderUniqueCode: fallback,
                senderMobileNumber: r.referrerPhone || fallback,
                senderName: r.referrerName || fallback,
                senderEmail: r.referrerEmail || fallback,
                senderUserType: fallback,
                senderZone: fallback,
                senderState: fallback,
                senderDistrict: fallback,
                senderCity: fallback,
                senderPincode: fallback,
                receiverUniqueCode: fallback,
                receiverMobileNumber: r.referredPhone || fallback,
                receiverName: r.referredName || fallback,
                receiverEmail: r.referredEmail || fallback,
                receiverUserType: fallback,
                receiverZone: fallback,
                receiverState: fallback,
                receiverDistrict: fallback,
                receiverCity: fallback,
                receiverPincode: fallback,
                referralCode: `RC-${r.id}`,
                pointsEarnedBySender: r.bonus || 0,
                pointsEarnedByReceiver: 0,
                dateOfReferral: r.createdAt
            }));

        case 'otp':
            return rows.map((r) => ({
                userId: r.id,
                userName: r.userName || fallback,
                mobileNumber: r.phone || fallback,
                otpCode: r.otp || fallback,
                otpGeneratedAt: r.createdAt,
                otpExpiredAt: r.expiresAt,
                otpType: r.type || fallback,
                otpStatus: r.isUsed || fallback
            }));

        case 'notification':
            return rows.map((r) => ({
                notificationTitle: r.title || fallback,
                notificationMessage: r.message || fallback,
                userName: r.userName || fallback,
                status: r.status || fallback,
                sentDate: r.sentAt || fallback
            }));

        case 'blocked-member':
            return rows
                .filter((r) => (r.status || '').toLowerCase() === 'suspended')
                .map((r) => ({
                    userName: r.name || fallback,
                    mobileNumber: r.phone || fallback,
                    userTypeRole: fallback,
                    zone: fallback,
                    state: fallback,
                    district: fallback,
                    city: fallback,
                    pincode: fallback,
                    dateOfJoining: r.createdAt,
                    totalEarnedPoints: 0,
                    redeemedPoints: 0,
                    redemptionRequestDate: null,
                    redemptionProcessedDate: null,
                    redemptionDetails: fallback,
                    upiId: fallback,
                    accountNumber: fallback,
                    accountHolderName: r.name || fallback,
                    ifscCode: fallback,
                    bankName: fallback,
                    status: r.status || fallback
                }));

        case 'blocked-qr-scan':
            return rows
                .filter((r) => (r.status || '').toLowerCase().includes('blocked') || (r.status || '').toLowerCase().includes('fail'))
                .map((r) => ({
                    userName: r.userName || fallback,
                    mobileNumber: r.userPhone || fallback,
                    userTypeRole: r.userType || fallback,
                    zone: fallback,
                    state: r.state || fallback,
                    district: fallback,
                    city: r.city || fallback,
                    pincode: fallback,
                    dateOfJoining: null,
                    scanId: r.id,
                    dateOfScan: r.createdAt,
                    skuUniqueCode: r.sku || fallback,
                    itemDescription: r.category || fallback,
                    l1Vertical: fallback,
                    l2Range: fallback,
                    l3Category: r.category || fallback,
                    l4Subcategory: fallback,
                    l5RatingType: fallback,
                    l6Colour: fallback,
                    qrDetails: r.qrCode || fallback,
                    qrPlacement: fallback,
                    basePoint: r.points || 0,
                    extraBonusPoint: 0,
                    totalPoints: r.points || 0,
                    scanStatus: r.status || fallback,
                    commonQr: fallback
                }));

        case 'anomaly':
            return rows.map((r) => ({
                referenceId: r.id,
                zone: fallback,
                state: r.state || fallback,
                district: fallback,
                city: r.city || fallback,
                pincode: fallback,
                influencerName: r.userName || fallback,
                userMobileNumber: r.userPhone || fallback,
                userTypeRole: r.userType || fallback,
                dateOfJoining: null,
                skuUniqueCode: r.sku || fallback,
                itemDescription: r.category || fallback,
                l1Vertical: fallback,
                l2Range: fallback,
                l3Category: r.category || fallback,
                l4Subcategory: fallback,
                l5RatingType: fallback,
                l6Colour: fallback,
                dateOfScan: r.createdAt,
                frequencyOfAnomaly: 1,
                expectedRewardMech: r.points || 0,
                expectedRewardDealerRet: r.points || 0,
                expectedRewardCsb: r.points || 0,
                totalPointsEarned: r.points || 0,
                totalPointsRedeemed: 0,
                firstScanDate: r.createdAt,
                lastScanDate: r.createdAt,
                lastScanId: r.id,
                updatedAt: r.createdAt,
                actionTaken: fallback
            }));

        case 'tds-summary':
            return rows.map((r) => ({
                userNameUserIdMobile: `${r.name || fallback} (${r.id || fallback}/${r.phone || fallback})`,
                userType: fallback,
                age: null,
                state: fallback,
                lifetimeEarnedPoints: 0,
                cfyEarnedPoints: 0,
                userRedeemablePoints: 0,
                tdsKitty: 0,
                lifetimeTdsDeducted: 0,
                cyTdsDeducted: 0,
                lifetimeRedeemedPoints: 0,
                currentFyRedeemedPoints: 0,
                tdsSlab: fallback,
                closingBalance: 0,
                fy: fallback
            }));

        default:
            return rows;
    }
}

export default function MisClient() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(4)
    const [activeReportCategory, setActiveReportCategory] = useState<string | null>(REPORT_CONFIGS[0]?.id || null);
    const [isReportMenuCollapsed, setIsReportMenuCollapsed] = useState(false);
    const [isReportFiltersOpen, setIsReportFiltersOpen] = useState(false);
    const [reportFilters, setReportFilters] = useState<Record<string, ReportFilterValue>>({});
    const [reportData, setReportData] = useState<ReportData>({ columns: [], rows: [] });
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [reportPage, setReportPage] = useState(1);
    const [reportPageSize, setReportPageSize] = useState(25);

    useEffect(() => {
        const tabParam = (searchParams.get('tab') || '').toLowerCase();
        const tabMap: Record<string, number> = {
            'executive-dashboard': 0,
            'performance-metrics': 1,
            'member-analytics': 2,
            'campaign-analytics': 3,
            'reports': 4,
        };

        if (tabParam in tabMap) {
            setActiveTab(tabMap[tabParam]);
        }
    }, [searchParams]);

    const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 bg-white"

    useEffect(() => {
        if (activeReportCategory) {
            const fetchReport = async () => {
                setIsReportLoading(true);
                try {
                    const selectedConfig = REPORT_CONFIGS.find((c) => c.id === activeReportCategory);
                    const sourceCategory = selectedConfig?.sourceCategory || activeReportCategory;
                    const data = await getReportDataAction(sourceCategory);

                    if (selectedConfig) {
                        setReportData({
                            columns: selectedConfig.columns,
                            rows: mapRowsForReport(selectedConfig.id, data.rows)
                        });
                    } else {
                        setReportData(data);
                    }
                } catch (err) {
                    console.error("Failed to fetch report", err);
                } finally {
                    setIsReportLoading(false);
                }
            };
            fetchReport();
        } else {
            setReportData({ columns: [], rows: [] });
        }
    }, [activeReportCategory]);

    useEffect(() => {
        setReportPage(1);
        setReportFilters({});
        setIsReportFiltersOpen(false);
    }, [activeReportCategory]);

    const activeReportFilterDefs = buildReportFilterDefs(activeReportCategory, reportData.columns);

    const filteredReportRows = reportData.rows.filter((row) => {
        return activeReportFilterDefs.every((def) => {
            const filter = reportFilters[def.id] || {};

            if (def.type === 'text') {
                const value = (filter.value || '').trim().toLowerCase();
                if (!value) return true;
                return def.keys.some((key) => String(row[key] ?? '').toLowerCase().includes(value));
            }

            if (def.type === 'date-range') {
                const from = filter.from ? new Date(filter.from) : null;
                const to = filter.to ? new Date(filter.to) : null;
                if (!from && !to) return true;

                return def.keys.some((key) => {
                    const dt = row[key] ? new Date(row[key]) : null;
                    if (!dt || Number.isNaN(dt.getTime())) return false;
                    if (from && dt < from) return false;
                    if (to) {
                        const toInclusive = new Date(to);
                        toInclusive.setHours(23, 59, 59, 999);
                        if (dt > toInclusive) return false;
                    }
                    return true;
                });
            }

            if (def.type === 'number-range') {
                const min = filter.min !== undefined && filter.min !== '' ? Number(filter.min) : null;
                const max = filter.max !== undefined && filter.max !== '' ? Number(filter.max) : null;
                if (min === null && max === null) return true;

                return def.keys.some((key) => {
                    const num = Number(row[key]);
                    if (Number.isNaN(num)) return false;
                    if (min !== null && num < min) return false;
                    if (max !== null && num > max) return false;
                    return true;
                });
            }

            return true;
        });
    });

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredReportRows.length / reportPageSize));
        if (reportPage > totalPages) {
            setReportPage(totalPages);
        }
    }, [filteredReportRows.length, reportPage, reportPageSize]);

    const totalReportRows = filteredReportRows.length;
    const totalReportPages = Math.max(1, Math.ceil(totalReportRows / reportPageSize));
    const pageStartIndex = totalReportRows === 0 ? 0 : (reportPage - 1) * reportPageSize + 1;
    const pageEndIndex = Math.min(reportPage * reportPageSize, totalReportRows);
    const paginatedReportRows = filteredReportRows.slice((reportPage - 1) * reportPageSize, reportPage * reportPageSize);

    const formatReportCellValue = (col: ReportColumn, row: any): string => {
        const rawValue = row[col.key];

        if (col.type === 'date') {
            if (!rawValue) return '-';
            const dt = new Date(rawValue);
            return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString();
        }

        if (col.type === 'currency') {
            if (rawValue === '-' || rawValue === null || rawValue === undefined) return '-';
            return `₹${rawValue}`;
        }

        if (rawValue === null || rawValue === undefined || rawValue === '') {
            return '-';
        }

        return String(rawValue);
    };

    const toCsvCell = (value: unknown): string => {
        const str = value === null || value === undefined ? '' : String(value);
        if (/[",\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const handleExportCsv = () => {
        if (!activeReportCategory || reportData.columns.length === 0 || filteredReportRows.length === 0) {
            return;
        }

        const selectedConfig = REPORT_CONFIGS.find((c) => c.id === activeReportCategory);
        const safeReportName = (selectedConfig?.title || 'report')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        const headerRow = reportData.columns.map((col) => toCsvCell(col.label)).join(',');
        const dataRows = filteredReportRows.map((row) =>
            reportData.columns.map((col) => toCsvCell(formatReportCellValue(col, row))).join(',')
        );
        const csvContent = [headerRow, ...dataRows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeReportName || 'report'}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const { data: analyticsData, isLoading, error } = useQuery({
        queryKey: ['mis-analytics'],
        queryFn: () => getMisAnalyticsAction()
    })

    const pointsAllotedData = {
        labels: analyticsData?.executive?.pointsTrend?.labels || [],
        datasets: [{
            label: 'Points Alloted',
            data: analyticsData?.executive?.pointsTrend?.data || [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
        }]
    }

    const memberGrowthData = {
        labels: analyticsData?.executive?.memberGrowth?.labels || [],
        datasets: [{
            label: 'New Members',
            data: analyticsData?.executive?.memberGrowth?.data || [],
            backgroundColor: '#10b981',
            borderRadius: 4
        }]
    }

    const transactionVolumeData = {
        labels: analyticsData?.performance?.txnVolume?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Volume',
            data: analyticsData?.performance?.txnVolume?.data || [150, 230, 180, 320, 290, 140, 190],
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4
        }]
    }

    const categoryPerfData = {
        labels: analyticsData?.performance?.categoryPerf?.labels || ['Wires', 'Switches', 'Lights', 'Fans', 'MCBs'],
        datasets: [{
            label: 'Sales (Lakhs)',
            data: analyticsData?.performance?.categoryPerf?.data || [23.4, 18.7, 15.4, 12.1, 9.8],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'],
            borderRadius: 4
        }]
    }

    const memberSegData = {
        labels: analyticsData?.memberAnalytics?.segmentation?.labels || ['Mechanics', 'Retailers', 'Contractors', 'Builders'],
        datasets: [{
            data: analyticsData?.memberAnalytics?.segmentation?.data || [45, 25, 20, 10],
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
            hoverOffset: 4
        }]
    }

    const campaignTrendData = {
        labels: analyticsData?.campaignAnalytics?.performanceTrend?.labels || ['W1', 'W2', 'W3', 'W4'],
        datasets: analyticsData?.campaignAnalytics?.performanceTrend?.datasets || [
            { label: 'Reach', data: [5000, 12000, 28000, 45000], borderColor: '#3b82f6', tension: 0.4 },
            { label: 'Conversion', data: [100, 350, 980, 1850], borderColor: '#10b981', tension: 0.4 }
        ]
    }

    const channelEffectData = {
        labels: analyticsData?.campaignAnalytics?.channelEffectiveness?.labels || ['SMS', 'WhatsApp', 'Email', 'Push Notif'],
        datasets: [{
            label: 'Conversion Rate %',
            data: analyticsData?.campaignAnalytics?.channelEffectiveness?.data || [12, 28, 5, 8],
            backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
            borderRadius: 4
        }]
    }

    if (isLoading) {
        return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
    }

    if (error) {
        return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">Failed to fetch analytics data</div>
    }

    return (
        <div className="w-full">
            {/* ── Tabs ── */}
            <div className="border-b border-gray-200 mb-6">
                <div className="tabs">
                    {['Reports'].map((label) => (
                        <button key={label} className="tab active">{label}</button>
                    ))}
                </div>
            </div>

            {/* ══════ TAB 0: EXECUTIVE DASHBOARD ══════ */}
            <div role="tabpanel" hidden={activeTab !== 0}>
                {activeTab === 0 && (
                    <div>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <div className="text-white rounded-xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-lg font-semibold">Total Points</h4>
                                    <i className="fas fa-star opacity-50 text-2xl"></i>
                                </div>
                                <h3 className="text-3xl font-bold mb-1">{analyticsData?.executive?.totalPoints?.toLocaleString() ?? 0}</h3>
                                <p className="text-sm opacity-90">This Quarter</p>
                                <div className="mt-2 flex items-center text-sm"><i className="fas fa-arrow-up mr-1"></i> 18.5% from last quarter</div>
                            </div>
                            <div className="text-white rounded-xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-lg font-semibold">Active Members</h4>
                                    <i className="fas fa-users opacity-50 text-2xl"></i>
                                </div>
                                <h3 className="text-3xl font-bold mb-1">{analyticsData?.executive?.activeMembers?.toLocaleString() ?? 0}</h3>
                                <p className="text-sm opacity-90">Total Registered</p>
                                <div className="mt-2 flex items-center text-sm"><i className="fas fa-arrow-up mr-1"></i> 12.3% growth</div>
                            </div>
                            <div className="text-white rounded-xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-lg font-semibold">Engagement</h4>
                                    <i className="fas fa-chart-line opacity-50 text-2xl"></i>
                                </div>
                                <h3 className="text-3xl font-bold mb-1">{analyticsData?.executive?.engagement ?? 0}%</h3>
                                <p className="text-sm opacity-90">Monthly Active</p>
                                <div className="mt-2 flex items-center text-sm"><i className="fas fa-arrow-up mr-1"></i> 5.2% improvement</div>
                            </div>
                            <div className="text-white rounded-xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-lg font-semibold">Redemption</h4>
                                    <i className="fas fa-gift opacity-50 text-2xl"></i>
                                </div>
                                <h3 className="text-3xl font-bold mb-1">{analyticsData?.executive?.redemptionRate ?? 0}%</h3>
                                <p className="text-sm opacity-90">Points Redeemed</p>
                                <div className="mt-2 flex items-center text-sm"><i className="fas fa-arrow-down mr-1"></i> 2.1% from last month</div>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <div className="widget-card p-6 w-full h-full">
                                <h3 className="text-lg font-semibold mb-4">Points Alloted Trend</h3>
                                <div style={{ height: 250 }}><Line data={pointsAllotedData} options={{ maintainAspectRatio: false }} /></div>
                            </div>
                            <div className="widget-card p-6 w-full h-full">
                                <h3 className="text-lg font-semibold mb-4">Member Growth</h3>
                                <div style={{ height: 250 }}><Bar data={memberGrowthData} options={{ maintainAspectRatio: false }} /></div>
                            </div>
                        </div>

                        {/* Lists */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {[
                                { 
                                    title: 'Top Members by Points', 
                                    items: analyticsData?.lists?.topMembers || [],
                                    bg: 'bg-red-100', txt: 'text-red-600'
                                },
                                { 
                                    title: 'Top Performing Products', 
                                    items: analyticsData?.lists?.topProducts || [],
                                    bg: 'bg-green-100', txt: 'text-green-600'
                                },
                                { 
                                    title: 'Regional Performance', 
                                    items: analyticsData?.lists?.topRegions || [],
                                    bg: 'bg-purple-100', txt: 'text-purple-600'
                                },
                            ].map((section, sIdx) => (
                                <div key={`${section.title}-${sIdx}`} className="widget-card p-6 w-full h-full">
                                    <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
                                    {section.items.map((item: any, idx: number) => (
                                        <div key={`${item.name}-${idx}`} className="flex justify-between items-center mb-3">
                                            <div className="flex items-center">
                                                <div className={`w-8 h-8 ${section.bg} rounded-full flex items-center justify-center mr-3`}>
                                                    <span className={`text-xs font-bold ${section.txt}`}>{idx + 1}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{item.name}</p>
                                                    <p className="text-xs text-gray-500">{item.sub}</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-semibold">{item.val}</span>
                                        </div>
                                    ))}
                                    {section.items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data available</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ══════ TAB 1: PERFORMANCE METRICS ══════ */}
            <div role="tabpanel" hidden={activeTab !== 1}>
                {activeTab === 1 && (
                    <div>
                        {/* Filters */}
                        <div className="widget-card p-6 w-full mb-6">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <p className="text-sm font-medium mb-1">Time Period</p>
                                    <select defaultValue="month" className={selectClass}>
                                        <option value="today">Today</option>
                                        <option value="week">This Week</option>
                                        <option value="month">This Month</option>
                                    </select>
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <p className="text-sm font-medium mb-1">Region</p>
                                    <select defaultValue="" className={selectClass}>
                                        <option value="">All Regions</option>
                                        <option value="mh">Maharashtra</option>
                                        <option value="gj">Gujarat</option>
                                    </select>
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <p className="text-sm font-medium mb-1">Member Type</p>
                                    <select defaultValue="" className={selectClass}>
                                        <option value="">All Types</option>
                                        <option value="mechanic">Mechanic</option>
                                        <option value="retailer">Retailer</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium">
                                        <i className="fas fa-filter mr-2"></i> Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            {[
                                { title: 'Avg. Txn Value', val: `₹${analyticsData?.performance?.kpis?.avgTxnValue || 0}`, chg: '+8.5%', icon: 'fa-chart-bar', color: 'text-red-500' },
                                { title: 'Scan Frequency', val: `${analyticsData?.performance?.kpis?.scanFrequency || 0}/day`, chg: '+12.3%', icon: 'fa-qrcode', color: 'text-green-500' },
                                { title: 'Retention Rate', val: `${analyticsData?.performance?.kpis?.retentionRate || 0}%`, chg: '+3.2%', icon: 'fa-user-check', color: 'text-purple-500' },
                                { title: 'Conversion Rate', val: `${analyticsData?.performance?.kpis?.conversionRate || 0}%`, chg: '-1.5%', icon: 'fa-percentage', color: 'text-orange-500', isNeg: true },
                            ].map((k) => (
                                <div key={k.title} className="widget-card p-6 w-full">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-sm text-gray-500">{k.title}</p>
                                        <i className={`fas ${k.icon} ${k.color}`}></i>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-1">{k.val}</h3>
                                    <div className="flex items-center text-xs">
                                        <span className={k.isNeg ? 'text-red-600' : 'text-green-600'} style={{ marginRight: 4 }}>{k.chg}</span>
                                        <span className="text-gray-500">vs last period</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="widget-card p-6 w-full">
                                <h3 className="text-lg font-semibold mb-4">Transaction Volume Trend</h3>
                                <div style={{ height: 250 }}><Line data={transactionVolumeData} options={{ maintainAspectRatio: false }} /></div>
                            </div>
                            <div className="widget-card p-6 w-full">
                                <h3 className="text-lg font-semibold mb-4">Category Performance</h3>
                                <div style={{ height: 250 }}><Bar data={categoryPerfData} options={{ maintainAspectRatio: false }} /></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ══════ TAB 2: MEMBER ANALYTICS ══════ */}
            <div role="tabpanel" hidden={activeTab !== 2}>
                {activeTab === 2 && (
                    <div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            <div className="widget-card p-6 w-full h-full">
                                <h3 className="text-lg font-semibold mb-4">Member Segmentation</h3>
                                <div style={{ height: 250 }} className="flex justify-center">
                                    <Doughnut data={memberSegData} options={{ maintainAspectRatio: false }} />
                                </div>
                            </div>

                            <div className="widget-card p-6 w-full h-full">
                                <h3 className="text-lg font-semibold mb-4">Member Lifecycle</h3>
                                <div className="flex flex-col gap-4">
                                    {[
                                        { label: 'New Members', val: analyticsData?.memberAnalytics?.lifecycle?.new, color: 'bg-red-500' },
                                        { label: 'Active Members', val: analyticsData?.memberAnalytics?.lifecycle?.active, color: 'bg-green-500' },
                                        { label: 'At Risk Members', val: analyticsData?.memberAnalytics?.lifecycle?.atRisk, color: 'bg-yellow-500' },
                                        { label: 'Churned Members', val: analyticsData?.memberAnalytics?.lifecycle?.churned, color: 'bg-red-500' },
                                    ].map((item, i) => {
                                        const total = analyticsData?.memberAnalytics?.lifecycle?.total || 1;
                                        const percentage = Math.min(100, ((Number(item.val) || 0) / total) * 100);
                                        return (
                                            <div key={i}>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm text-gray-500">{item.label}</span>
                                                    <span className="text-sm font-semibold">{item.val?.toLocaleString()}</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full ${item.color}`} style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="widget-card p-6 w-full h-full text-center">
                                <h3 className="text-lg font-semibold mb-4">Member Satisfaction</h3>
                                <h2 className="text-4xl font-bold text-green-600 mb-1">
                                    {analyticsData?.memberAnalytics?.satisfaction?.average}
                                </h2>
                                <div className="flex justify-center mb-2 text-amber-500">
                                    {[1, 2, 3, 4].map(i => <i key={i} className="fas fa-star" />)}
                                    <i className="fas fa-star-half-alt" />
                                </div>
                                <p className="text-sm text-gray-500 mb-4">Average Rating</p>

                                <div className="flex flex-col gap-2">
                                    {analyticsData?.memberAnalytics?.satisfaction?.distribution?.map((pct: number, idx: number) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span>{['Excellent (5★)', 'Good (4★)', 'Average (3★)', 'Poor (2★)', 'Very Poor (1★)'][idx]}</span>
                                            <span className="font-semibold">{pct}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Table */}
                        <div className="widget-card p-6 w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Recent Member Activity</h3>
                                <button className="text-red-600 text-sm hover:underline">View All</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Member ID</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Last Activity</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Points Earned</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analyticsData?.memberAnalytics?.recentActivity?.map((row: any, idx: number) => (
                                            <tr key={`${row.id}-${row.name ?? 'unknown'}-${row.lastActivity ?? 'na'}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-sm font-medium">{row.id}</td>
                                                <td className="py-3 px-4 text-sm">{row.name}</td>
                                                <td className="py-3 px-4 text-sm text-gray-500">{row.type}</td>
                                                <td className="py-3 px-4 text-sm text-gray-500">{row.lastActivity}</td>
                                                <td className="py-3 px-4 text-sm font-semibold">{row.points}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.status === 'Active' ? 'bg-green-100 text-green-800' : row.status === 'At Risk' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ══════ TAB 3: CAMPAIGN ANALYTICS ══════ */}
            <div role="tabpanel" hidden={activeTab !== 3}>
                {activeTab === 3 && (
                    <div>
                        {/* Campaign KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            {[
                                { title: 'Active Campaigns', val: analyticsData?.campaignAnalytics?.kpis?.activeCampaigns, chg: '+3', icon: 'fa-bullhorn', color: 'text-red-500' },
                                { title: 'Total Reach', val: analyticsData?.campaignAnalytics?.kpis?.totalReach, chg: '+25%', icon: 'fa-users', color: 'text-green-500' },
                                { title: 'Conversion Rate', val: `${analyticsData?.campaignAnalytics?.kpis?.conversionRate}%`, chg: '+4.2%', icon: 'fa-chart-line', color: 'text-purple-500' },
                                { title: 'ROI', val: `${analyticsData?.campaignAnalytics?.kpis?.roi}%`, chg: '+32%', icon: 'fa-dollar-sign', color: 'text-orange-500' },
                            ].map((k) => (
                                <div key={k.title} className="widget-card p-6 w-full">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-sm text-gray-500">{k.title}</p>
                                        <i className={`fas ${k.icon} ${k.color}`}></i>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-1">{k.val}</h3>
                                    <div className="flex items-center text-xs">
                                        <span className="text-green-600 mr-1">{k.chg}</span>
                                        <span className="text-gray-500">improvement</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Campaign Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <div className="widget-card p-6 w-full h-full">
                                <h3 className="text-lg font-semibold mb-4">Campaign Performance Trend</h3>
                                <div style={{ height: 250 }}><Line data={campaignTrendData} options={{ maintainAspectRatio: false }} /></div>
                            </div>
                            <div className="widget-card p-6 w-full h-full">
                                <h3 className="text-lg font-semibold mb-4">Channel Effectiveness</h3>
                                <div style={{ height: 250 }}><Bar data={channelEffectData} options={{ maintainAspectRatio: false }} /></div>
                            </div>
                        </div>

                        {/* Top Campaigns Table */}
                        <div className="widget-card p-6 w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Top Performing Campaigns</h3>
                                <button className="text-red-600 text-sm hover:underline">View All</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Campaign Name</th>
                                            <th>Type</th>
                                            <th>Duration</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Reach</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Engagement</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Conversion</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ROI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analyticsData?.campaignAnalytics?.topCampaigns?.map((row: any) => (
                                            <tr key={row.name} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-sm font-medium">{row.name}</td>
                                                <td className="py-3 px-4"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{row.type}</span></td>
                                                <td className="py-3 px-4 text-sm text-gray-500">{row.duration}</td>
                                                <td className="py-3 px-4 text-sm font-medium">{row.reach}</td>
                                                <td className="py-3 px-4 text-sm">{row.engagement}</td>
                                                <td className="py-3 px-4 text-sm">{row.conversion}</td>
                                                <td className="py-3 px-4 text-sm font-semibold text-green-600">{row.roi}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ══════ TAB 4: REPORTS ══════ */}
            <div role="tabpanel" hidden={activeTab !== 4}>
                {activeTab === 4 && (
                    <div className="flex flex-col lg:flex-row gap-6 mt-4">
                        {/* Report Categories Sidebar */}
                        <div className={`w-full flex-shrink-0 transition-all duration-300 ${isReportMenuCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
                            <div className="widget-card rounded-xl shadow p-4 bg-white h-full">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    {!isReportMenuCollapsed && (
                                        <h3 className="text-lg font-semibold text-gray-800">Report Categories</h3>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsReportMenuCollapsed((prev) => !prev)}
                                        className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
                                        title={isReportMenuCollapsed ? 'Expand categories menu' : 'Collapse categories menu'}
                                    >
                                        <i className={`fas ${isReportMenuCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-xs`}></i>
                                    </button>
                                </div>
                                <nav className="space-y-1">
                                    {REPORT_CONFIGS.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveReportCategory(cat.id)}
                                            title={cat.title}
                                            className={`w-full flex items-center py-3 text-sm font-medium rounded-lg transition-colors ${isReportMenuCollapsed ? 'justify-center px-2' : 'px-3'} ${activeReportCategory === cat.id ? 'bg-red-50 text-red-700' : 'text-gray-700 hover:bg-gray-100'}`}
                                        >
                                            <i className={`fas ${cat.icon} ${isReportMenuCollapsed ? '' : 'mr-3'} ${activeReportCategory === cat.id ? 'text-red-500' : 'text-gray-400'}`}></i>
                                            {!isReportMenuCollapsed && <span className="truncate text-left">{cat.title}</span>}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        {/* Report Content */}
                        <div className="flex-1 min-h-[600px]">
                            <div className="widget-card rounded-xl shadow p-6 bg-white h-full flex flex-col">
                                <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-4 mb-4 bg-white/95 backdrop-blur border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-800">
                                            {activeReportCategory ? REPORT_CONFIGS.find(c => c.id === activeReportCategory)?.title : 'Select a Report'}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {activeReportCategory ? 'Detailed analysis and data records' : 'Choose a category from the sidebar'}
                                        </p>
                                    </div>
                                    {activeReportCategory && (
                                        <div className="mt-4 md:mt-0 flex space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsReportFiltersOpen((prev) => !prev)}
                                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition shadow-sm"
                                            >
                                                <i className="fas fa-filter mr-2"></i> Filters
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleExportCsv}
                                                disabled={isReportLoading || reportData.columns.length === 0 || totalReportRows === 0}
                                                className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <i className="fas fa-download mr-2"></i> Export CSV
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {activeReportCategory && isReportFiltersOpen && activeReportFilterDefs.length > 0 && (
                                    <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {activeReportFilterDefs.map((def) => (
                                                <div key={def.id}>
                                                    <label className="text-xs font-medium text-gray-600 mb-1 block">{def.label}</label>
                                                    {def.type === 'text' && (
                                                        <input
                                                            type="text"
                                                            value={reportFilters[def.id]?.value || ''}
                                                            onChange={(e) => {
                                                                setReportFilters((prev) => ({ ...prev, [def.id]: { ...(prev[def.id] || {}), value: e.target.value } }));
                                                                setReportPage(1);
                                                            }}
                                                            placeholder={`Filter ${def.label}`}
                                                            className="w-full h-9 rounded-md border border-gray-300 px-2 text-xs bg-white"
                                                        />
                                                    )}
                                                    {def.type === 'date-range' && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input
                                                                type="date"
                                                                value={reportFilters[def.id]?.from || ''}
                                                                onChange={(e) => {
                                                                    setReportFilters((prev) => ({ ...prev, [def.id]: { ...(prev[def.id] || {}), from: e.target.value } }));
                                                                    setReportPage(1);
                                                                }}
                                                                className="w-full h-9 rounded-md border border-gray-300 px-2 text-xs bg-white"
                                                            />
                                                            <input
                                                                type="date"
                                                                value={reportFilters[def.id]?.to || ''}
                                                                onChange={(e) => {
                                                                    setReportFilters((prev) => ({ ...prev, [def.id]: { ...(prev[def.id] || {}), to: e.target.value } }));
                                                                    setReportPage(1);
                                                                }}
                                                                className="w-full h-9 rounded-md border border-gray-300 px-2 text-xs bg-white"
                                                            />
                                                        </div>
                                                    )}
                                                    {def.type === 'number-range' && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input
                                                                type="number"
                                                                value={reportFilters[def.id]?.min || ''}
                                                                onChange={(e) => {
                                                                    setReportFilters((prev) => ({ ...prev, [def.id]: { ...(prev[def.id] || {}), min: e.target.value } }));
                                                                    setReportPage(1);
                                                                }}
                                                                placeholder="Min"
                                                                className="w-full h-9 rounded-md border border-gray-300 px-2 text-xs bg-white"
                                                            />
                                                            <input
                                                                type="number"
                                                                value={reportFilters[def.id]?.max || ''}
                                                                onChange={(e) => {
                                                                    setReportFilters((prev) => ({ ...prev, [def.id]: { ...(prev[def.id] || {}), max: e.target.value } }));
                                                                    setReportPage(1);
                                                                }}
                                                                placeholder="Max"
                                                                className="w-full h-9 rounded-md border border-gray-300 px-2 text-xs bg-white"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReportFilters({});
                                                    setReportPage(1);
                                                }}
                                                className="px-3 py-1.5 text-xs border border-gray-300 rounded-md text-gray-600 hover:bg-white"
                                            >
                                                Clear Filters
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Report Data Table */}
                                <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden relative">
                                    {activeReportCategory ? (
                                        isReportLoading ? (
                                            <div className="flex justify-center items-center h-full">
                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
                                            </div>
                                        ) : reportData.columns.length > 0 ? (
                                            <div className="h-full flex flex-col">
                                                <div className="overflow-x-auto flex-1">
                                                    <table className="min-w-full">
                                                        <thead className="sticky top-0">
                                                            <tr>
                                                                {reportData.columns.map((col) => (
                                                                    <th key={col.key} className="text-left py-3 px-4 text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200">{col.label}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {totalReportRows > 0 ? (
                                                                paginatedReportRows.map((row, idx) => (
                                                                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                                                        {reportData.columns.map((col) => (
                                                                            <td key={`${idx}-${col.key}`} className="py-3 px-4 text-sm">
                                                                                {col.type === 'status' ? (
                                                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row[col.key] === 'Active' || row[col.key] === 'Success' || row[col.key] === 'Completed' || row[col.key] === 'Verified' ? 'bg-green-100 text-green-800' : row[col.key] === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                                        {row[col.key] ?? '-'}
                                                                                    </span>
                                                                                ) : formatReportCellValue(col, row)}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan={reportData.columns.length} className="py-10 px-4 text-sm text-gray-400 text-center">
                                                                        No records found for this report.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-white">
                                                    <p className="text-xs text-gray-500">
                                                        Showing {pageStartIndex}-{pageEndIndex} of {totalReportRows} records
                                                    </p>
                                                    <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                                                        <div className="inline-flex items-center gap-2 whitespace-nowrap">
                                                            <label className="text-xs text-gray-500 whitespace-nowrap leading-none">Rows per page</label>
                                                            <select
                                                                value={reportPageSize}
                                                                onChange={(e) => {
                                                                    setReportPageSize(Number(e.target.value));
                                                                    setReportPage(1);
                                                                }}
                                                                className="h-8 rounded-md border border-gray-300 px-2 text-xs bg-white leading-none"
                                                            >
                                                                <option value={10}>10</option>
                                                                <option value={25}>25</option>
                                                                <option value={50}>50</option>
                                                                <option value={100}>100</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                                                                disabled={reportPage <= 1}
                                                                className="h-8 px-3 rounded-md border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Prev
                                                            </button>
                                                            <span className="text-xs text-gray-600">Page {reportPage} of {totalReportPages}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setReportPage((p) => Math.min(totalReportPages, p + 1))}
                                                                disabled={reportPage >= totalReportPages}
                                                                className="h-8 px-3 rounded-md border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Next
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                                                <i className="fas fa-inbox text-4xl mb-2 text-gray-300"></i>
                                                <p>No records found</p>
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                <i className="fas fa-chart-bar text-2xl text-gray-300"></i>
                                            </div>
                                            <p>No Report Selected</p>
                                            <p className="text-sm mt-2 text-center max-w-xs">Select a report from the list on the left to view data.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
