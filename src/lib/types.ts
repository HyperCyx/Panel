import { z } from 'zod';

export interface ExtractedInfo {
  confirmationCode?: string;
  link?: string;
}

export interface SmsRecord {
  dateTime: string;
  senderId: string;
  phone: string;
  mccMnc: string;
  destination: string;
  range: string;
  rate: number | string;
  currency: string;
  message: string;
  extractedInfo: ExtractedInfo;
}

export const filterFormSchema = z.object({
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date({ required_error: 'End date is required' }),
  senderId: z.string().optional(),
  phone: z.string().optional(),
});

export type FilterFormValues = z.infer<typeof filterFormSchema>;

export interface UserProfile {
  id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  status?: 'active' | 'blocked';
  isAdmin?: boolean;
  isAgent?: boolean;
  agentEmail?: string | null;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string | null;
  commissionRate?: number;
  agentWalletBalance?: number;
  walletBalance?: number;
  otpRate?: number;
}

export interface ProxySettings {
  ip?: string;
  port?: string;
  username?: string;
  password?: string;
}

export const allColorKeys = [
  'colorPrimary', 'colorPrimaryForeground', 'colorBackground', 'colorForeground',
  'colorCard', 'colorCardForeground', 'colorPopover', 'colorPopoverForeground',
  'colorSecondary', 'colorSecondaryForeground', 'colorMuted', 'colorMutedForeground',
  'colorAccent', 'colorAccentForeground', 'colorDestructive', 'colorDestructiveForeground',
  'colorBorder', 'colorInput', 'colorRing', 'colorSidebarBackground', 'colorSidebarForeground',
  'colorSidebarAccent', 'colorSidebarAccentForeground', 'colorSidebarBorder'
] as const;

export type ColorKey = typeof allColorKeys[number];

export type ColorSettings = {
  [K in ColorKey]?: string;
}

export interface AdminSettings extends ColorSettings {
  apiKey: string;
  proxySettings: ProxySettings;
  signupEnabled: boolean;
  siteName: string;
  siteVersion: string;
  footerText: string;
  emailChangeEnabled: boolean;
  errorMappings: { reasonCode: string, customMessage: string }[];
  numberExpiryMinutes: number;
  otpCheckInterval: number;
  consoleRefreshInterval: number;
  currency: string;
  paymentWalletAddress: string;
  paymentNetwork: string;
  minimumWithdrawal: number;
  defaultOrigins: string[];
  blockedApps: string[];
  paymentMethods: PaymentMethod[];
}

export interface PublicSettings extends ColorSettings {
    siteName: string;
    siteVersion: string;
    signupEnabled: boolean;
    emailChangeEnabled: boolean;
    footerText: string;
    currency: string;
    paymentWalletAddress: string;
    paymentNetwork: string;
    minimumWithdrawal: number;
    otpCheckInterval: number;
    consoleRefreshInterval: number;
    defaultOrigins: string[];
    blockedApps: string[];
    paymentMethods: PaymentMethod[];
    [key: string]: any;
}

export interface DashboardStats {
  walletBalance: number;
  otpRate: number;
  todayOtpCount: number;
  yesterdayOtpCount: number;
  todayNumbers: number;
  yesterdayNumbers: number;
  todaySuccess: number;
  yesterdaySuccess: number;
  weekTrend: { date: string; count: number }[];
  totalAllocatedNumbers: number;
  todayAllocatedNumbers: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  todayNumbersAll: number;
  todaySuccessAll: number;
  yesterdayNumbersAll: number;
  yesterdaySuccessAll: number;
  totalNumbersAll: number;
  pendingPaymentsAmount: number;
  pendingPaymentsCount: number;
  approvedPaymentsAmount: number;
  approvedPaymentsCount: number;
  totalUserBalances: number;
  weekTrend: { date: string; count: number }[];
}

export interface AllocatedNumberInfo {
  id: string;
  number: string;
  country: string;
  operator: string;
  status: 'pending' | 'success' | 'expired';
  otp?: string;
  sms?: string;
  otpList?: { otp: string; sms: string; receivedAt: string }[];
  expiresAt: string;
  allocatedAt: string;
}

export interface AccessListRecord {
  price: string;
  accessOrigin: string;
  accessDestination: string;
  testNumber: string;
  rate: string;
  currency: string;
  comment: string;
  message: string;
  limitHour: string;
  limitDay: string;
  datetime: string;
}

export const accessListFilterFormSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  message: z.string().optional(),
});

export type AccessListFilterFormValues = z.infer<typeof accessListFilterFormSchema>;

export interface PaymentRequestInfo {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  walletAddress: string;
  network: string;
  status: 'pending' | 'approved' | 'rejected' | 'rejected_deducted';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  placeholder: string;
  fieldType: 'number' | 'text';
  enabled: boolean;
}

export type UserWalletInfo = Record<string, string>;
