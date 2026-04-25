export interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  lastLogin?: string
  status: 'active' | 'inactive' | 'pending'
}

export interface Transaction {
  id: string
  memberId: string
  memberName: string
  type: 'credit' | 'debit' | 'refund'
  amount: number
  points: number
  date: string
  status: 'completed' | 'pending' | 'failed'
  description: string
}

export interface Campaign {
  id: string
  name: string
  type: 'booster' | 'slab-based' | 'cross-sell' | 'promo-schemes'
  startDate: string
  endDate: string
  participants: number
  status: 'active' | 'inactive' | 'scheduled'
  pointsDistributed: number
}

export interface StakeholderType {
  id: string
  name: string
  description: string
  pointsMultiplier: number
  status: 'active' | 'inactive'
}

export interface QRBatch {
  id: string
  name: string
  category: string
  type: 'mono' | 'sub-mono'
  quantity: number
  generatedDate: string
  status: 'generated' | 'printing' | 'printed'
}

export interface FraudAlert {
  id: string
  memberId: string
  memberName: string
  type: string
  riskScore: number
  status: 'critical' | 'high' | 'medium' | 'low'
  timestamp: string
  description: string
}

export interface NavigationItem {
  text: string
  icon: React.ReactNode
  path: string
  badge?: number
}

export class CustomError extends Error {
  statusCode: Number;
  responseCode: Number;
  responseMessage: string;
  constructor(data: Partial<CustomError>) {
    super(data?.responseMessage);
    this.statusCode = data?.statusCode || 200;
    this.responseCode = data?.responseCode || 500;
    this.responseMessage =
      data?.responseMessage || "Something went wrong, please try again";
  }
}

export interface Sku {
  skuId: number,
  skuCode: string,
  skuDescription: string,
  skuPoints: number,
  isSkuActive: boolean,
  createdAt: Date
}

export interface AwsConfig {
  region: string;
  accessKey: string;
  secrectKey: string;
  bucketName: string;
}

export interface CustomMulterFilesField {
  name: string;
  maxCount: number;
}

