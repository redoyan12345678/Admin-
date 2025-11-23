export interface User {
  id: string;
  name: string;
  email: string; 
  phone: string; 
  avatar: string;
  balance: number;
  isActive: boolean;
  referralCode: string;
  referrerId?: string; 
  role: 'user' | 'admin';
  salaryEligible?: boolean;
  joinedAt: number;
  password?: string; // Stores the 12-word phrase or legacy password
}

export interface ReferralTier {
  level: number;
  amount: number;
  description: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'activation' | 'withdrawal' | 'admin_add';
  amount: number;
  method: 'bkash' | 'nagad' | 'admin';
  mobileNumber: string;
  trxId?: string; 
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
  referralCodeUsed?: string; // Used during activation
}

export enum ViewState {
  AUTH = 'AUTH',
  HOME = 'HOME',
  WALLET = 'WALLET',
  REFERRALS = 'REFERRALS',
  PROFILE = 'PROFILE',
  STRUCTURE = 'STRUCTURE',
  ADMIN = 'ADMIN'
}
