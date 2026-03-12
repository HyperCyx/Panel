import mongoose, { Schema, Document, models, Model } from 'mongoose';

// User Interface and Schema
export interface IUser extends Document {
  email: string;
  password?: string; // Optional because a user might sign up via a social provider that doesn't use a password
  name: string;
  phone?: string;
  photoURL?: string;
  provider?: 'google' | 'facebook' | 'credentials';
  status: 'active' | 'blocked';
  isAdmin: boolean;
  isAgent: boolean;
  agentEmail?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  commissionRate: number;
  agentWalletBalance: number;
  walletBalance: number;
  otpRate: number;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, required: true },
  phone: { type: String },
  photoURL: { type: String },
  provider: { type: String, default: 'credentials' },
  status: { type: String, default: 'active' },
  isAdmin: { type: Boolean, default: false },
  isAgent: { type: Boolean, default: false },
  agentEmail: { type: String },
  approvalStatus: { type: String, default: 'approved', enum: ['pending', 'approved', 'rejected'] },
  approvedBy: { type: String },
  commissionRate: { type: Number, default: 0 },
  agentWalletBalance: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  otpRate: { type: Number, default: 0.50 },
}, { timestamps: true });

export const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);


// Settings Interface and Schema
export interface ISetting extends Document {
  key: string;
  value: any;
}

const SettingSchema: Schema = new Schema({
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
});

export const Setting: Model<ISetting> = models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);


// AllocatedNumber Interface and Schema
export interface IAllocatedNumber extends Document {
  userId: string;
  number: string;
  country: string;
  operator: string;
  transactionId: string;
  status: 'pending' | 'success' | 'expired';
  otp?: string;
  sms?: string;
  otpList: { otp: string; sms: string; receivedAt: Date }[];
  expiresAt: Date;
  allocatedAt: Date;
}

const AllocatedNumberSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  number: { type: String, required: true },
  country: { type: String, default: '' },
  operator: { type: String, default: '' },
  transactionId: { type: String, default: '' },
  status: { type: String, default: 'pending', enum: ['pending', 'success', 'expired'] },
  otp: { type: String },
  sms: { type: String },
  otpList: [{ otp: { type: String }, sms: { type: String }, receivedAt: { type: Date, default: Date.now } }],
  expiresAt: { type: Date, required: true },
  allocatedAt: { type: Date, default: Date.now },
});

// Compound indexes for common queries
AllocatedNumberSchema.index({ status: 1, expiresAt: 1 });       // expireOldNumbers
AllocatedNumberSchema.index({ userId: 1, allocatedAt: -1 });     // findByUserId sorted
AllocatedNumberSchema.index({ allocatedAt: 1 });                 // admin range queries

export const AllocatedNumber: Model<IAllocatedNumber> = models.AllocatedNumber || mongoose.model<IAllocatedNumber>('AllocatedNumber', AllocatedNumberSchema);


// PaymentRequest Interface and Schema
export interface IPaymentRequest extends Document {
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  walletAddress: string;
  network: string;
  status: 'pending' | 'approved' | 'rejected' | 'rejected_deducted';
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRequestSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USDT' },
  walletAddress: { type: String, required: true },
  network: { type: String, default: 'TRC20' },
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected', 'rejected_deducted'], index: true },
  adminNote: { type: String },
}, { timestamps: true });

export const PaymentRequest: Model<IPaymentRequest> = models.PaymentRequest || mongoose.model<IPaymentRequest>('PaymentRequest', PaymentRequestSchema);


// UserWallet Interface and Schema
export interface IUserWallet extends Document {
  userId: string;
  wallets: Map<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const UserWalletSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  wallets: { type: Map, of: String, default: () => new Map() },
}, { timestamps: true });

export const UserWallet: Model<IUserWallet> = models.UserWallet || mongoose.model<IUserWallet>('UserWallet', UserWalletSchema);


// Notification Interface and Schema
export interface INotification extends Document {
  title: string;
  message: string;
  createdBy: string;
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdBy: { type: String, required: true },
  readBy: [{ type: String }],
}, { timestamps: true });

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ readBy: 1 });  // speeds up unread count queries

export const Notification: Model<INotification> = models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
