import connectDB from './mongodb';
import { User as UserModel, Setting as SettingModel, AllocatedNumber as AllocatedNumberModel, PaymentRequest as PaymentRequestModel, UserWallet as UserWalletModel, Notification as NotificationModel } from './models';
import bcrypt from 'bcryptjs';

// User types
export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  phone?: string;
  photoURL?: string;
  provider: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  photoURL?: string;
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

// User Database Operations
export const UserDB = {
  // Find user by ID
  async findById(id: string): Promise<User | null> {
    await connectDB();
    const user = await UserModel.findById(id);
    return user ? this.parseUser(user) : null;
  },

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    await connectDB();
    const user = await UserModel.findOne({ email });
    return user ? this.parseUser(user) : null;
  },

  // Find all users (excluding password)
  async findAll(): Promise<UserProfile[]> {
    await connectDB();
    const users = await UserModel.find({}).select('-password');
    return users.map(u => this.parseUserProfile(u));
  },

  async countAll(): Promise<number> {
    await connectDB();
    return UserModel.countDocuments({});
  },

  async countActive(): Promise<number> {
    await connectDB();
    return UserModel.countDocuments({ status: 'active' });
  },

  async countBlocked(): Promise<number> {
    await connectDB();
    return UserModel.countDocuments({ status: 'blocked' });
  },

  async sumWalletBalances(): Promise<number> {
    await connectDB();
    const result = await UserModel.aggregate([
      { $group: { _id: null, total: { $sum: '$walletBalance' } } },
    ]);
    return result.length > 0 ? result[0].total : 0;
  },

  // Update OTP rate for ALL non-admin users at once
  async updateAllOtpRate(rate: number): Promise<number> {
    await connectDB();
    const result = await UserModel.updateMany(
      { isAdmin: { $ne: true } },
      { $set: { otpRate: rate } }
    );
    return result.modifiedCount;
  },

  // Create new user
  async create(userData: { email: string; password?: string; name: string; phone?: string; isAdmin?: boolean; isAgent?: boolean; agentEmail?: string; approvalStatus?: string; status?: string; otpRate?: number }): Promise<User> {
    await connectDB();
    
    let hashedPassword = userData.password;
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, 10);
    }

    const user = await UserModel.create({
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      phone: userData.phone,
      isAdmin: userData.isAdmin || false,
      isAgent: userData.isAgent || false,
      agentEmail: userData.agentEmail,
      approvalStatus: userData.approvalStatus || 'approved',
      status: userData.status || 'active',
      provider: 'credentials',
      ...(userData.otpRate !== undefined && { otpRate: userData.otpRate }),
    });

    return this.parseUser(user);
  },

  // Update user
  async updateById(id: string, updates: Partial<User>): Promise<User | null> {
    await connectDB();
    
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.photoURL !== undefined) updateData.photoURL = updates.photoURL;
    if (updates.walletBalance !== undefined) updateData.walletBalance = updates.walletBalance;
    if (updates.otpRate !== undefined) updateData.otpRate = updates.otpRate;
    if (updates.isAgent !== undefined) updateData.isAgent = updates.isAgent;
    if (updates.agentEmail !== undefined) updateData.agentEmail = updates.agentEmail;
    if (updates.approvalStatus !== undefined) updateData.approvalStatus = updates.approvalStatus;
    if (updates.approvedBy !== undefined) updateData.approvedBy = updates.approvedBy;
    if (updates.commissionRate !== undefined) updateData.commissionRate = updates.commissionRate;
    if (updates.agentWalletBalance !== undefined) updateData.agentWalletBalance = updates.agentWalletBalance;

    const user = await UserModel.findByIdAndUpdate(id, updateData, { new: true });
    return user ? this.parseUser(user) : null;
  },

  // Atomic increment for wallet balances — safe under concurrent access
  async incrementBalance(id: string, field: 'walletBalance' | 'agentWalletBalance', amount: number): Promise<User | null> {
    await connectDB();
    const user = await UserModel.findByIdAndUpdate(
      id,
      { $inc: { [field]: amount } },
      { new: true }
    );
    return user ? this.parseUser(user) : null;
  },

  // Atomic deduct with minimum-balance guard — returns null if insufficient funds
  async deductBalance(id: string, field: 'walletBalance' | 'agentWalletBalance', amount: number): Promise<User | null> {
    await connectDB();
    const user = await UserModel.findOneAndUpdate(
      { _id: id, [field]: { $gte: amount } },
      { $inc: { [field]: -amount } },
      { new: true }
    );
    return user ? this.parseUser(user) : null;
  },

  // Compare password
  async comparePassword(user: User, password: string): Promise<boolean> {
    if (!user.password) return false;
    return bcrypt.compare(password, user.password);
  },

  // Parse user from DB
  parseUser(doc: any): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      password: doc.password,
      name: doc.name,
      phone: doc.phone,
      photoURL: doc.photoURL,
      provider: doc.provider || 'credentials',
      status: doc.status || 'active',
      isAdmin: doc.isAdmin || false,
      isAgent: doc.isAgent || false,
      agentEmail: doc.agentEmail,
      approvalStatus: doc.approvalStatus || 'approved',
      approvedBy: doc.approvedBy,
      commissionRate: doc.commissionRate ?? 0,
      agentWalletBalance: doc.agentWalletBalance ?? 0,
      walletBalance: doc.walletBalance ?? 0,
      otpRate: doc.otpRate ?? 0.50,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
    };
  },

  // Parse user profile (without sensitive data)
  parseUserProfile(doc: any): UserProfile {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      phone: doc.phone,
      photoURL: doc.photoURL,
      status: doc.status || 'active',
      isAdmin: doc.isAdmin || false,
      isAgent: doc.isAgent || false,
      agentEmail: doc.agentEmail,
      approvalStatus: doc.approvalStatus || 'approved',
      approvedBy: doc.approvedBy,
      commissionRate: doc.commissionRate ?? 0,
      agentWalletBalance: doc.agentWalletBalance ?? 0,
      walletBalance: doc.walletBalance ?? 0,
      otpRate: doc.otpRate ?? 0.50,
    };
  },
};

// Settings Database Operations
export const SettingDB = {
  // Get setting by key
  async get(key: string): Promise<any> {
    await connectDB();
    const setting = await SettingModel.findOne({ key });
    return setting ? setting.value : undefined;
  },

  // Get all settings
  async getAll(): Promise<Record<string, any>> {
    await connectDB();
    const settings = await SettingModel.find({});
    const result: Record<string, any> = {};
    
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    
    return result;
  },

  // Set setting
  async set(key: string, value: any): Promise<void> {
    await connectDB();
    await SettingModel.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );
  },

  // Set multiple settings
  async setMany(settings: Record<string, any>): Promise<void> {
    await connectDB();
    
    const operations = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { key, value },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await SettingModel.bulkWrite(operations);
    }
  },
};

// AllocatedNumber types
export interface AllocatedNumberRecord {
  id: string;
  userId: string;
  number: string;
  country: string;
  operator: string;
  transactionId: string;
  status: 'pending' | 'success' | 'expired';
  otp?: string;
  sms?: string;
  otpList: { otp: string; sms: string; receivedAt: string }[];
  expiresAt: string;
  allocatedAt: string;
}

// AllocatedNumber Database Operations
export const AllocatedNumberDB = {
  async create(data: {
    userId: string;
    number: string;
    country: string;
    operator: string;
    transactionId: string;
    expiresAt: Date;
  }): Promise<AllocatedNumberRecord> {
    await connectDB();
    const doc = await AllocatedNumberModel.create({
      ...data,
      status: 'pending',
      allocatedAt: new Date(),
    });
    return this.parse(doc);
  },

  async findByUserId(userId: string): Promise<AllocatedNumberRecord[]> {
    await connectDB();
    const docs = await AllocatedNumberModel.find({ userId }).sort({ allocatedAt: -1 });
    return docs.map(d => this.parse(d));
  },

  async findByNumber(number: string): Promise<AllocatedNumberRecord | null> {
    await connectDB();
    const doc = await AllocatedNumberModel.findOne({ number }).sort({ allocatedAt: -1 });
    return doc ? this.parse(doc) : null;
  },

  async countByUserId(userId: string): Promise<number> {
    await connectDB();
    return AllocatedNumberModel.countDocuments({ userId, status: { $ne: 'expired' } });
  },

  async countByUserIdToday(userId: string): Promise<number> {
    await connectDB();
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    return AllocatedNumberModel.countDocuments({ userId, allocatedAt: { $gte: startOfDay } });
  },

  async expireOldNumbers(): Promise<void> {
    await connectDB();
    await AllocatedNumberModel.updateMany(
      { status: 'pending', expiresAt: { $lte: new Date() } },
      { $set: { status: 'expired' } }
    );
  },

  async isNumberAllocatedToUser(number: string, userId: string): Promise<boolean> {
    await connectDB();
    const doc = await AllocatedNumberModel.findOne({ number, userId });
    return !!doc;
  },

  async updateOtp(id: string, userId: string, otp: string, sms: string): Promise<AllocatedNumberRecord | null> {
    await connectDB();
    const doc = await AllocatedNumberModel.findOneAndUpdate(
      { _id: id, userId, status: 'pending' },
      { $set: { otp, sms, status: 'success' }, $push: { otpList: { otp, sms, receivedAt: new Date() } } },
      { new: true }
    );
    return doc ? this.parse(doc) : null;
  },

  async appendOtp(id: string, userId: string, otp: string, sms: string): Promise<AllocatedNumberRecord | null> {
    await connectDB();
    const doc = await AllocatedNumberModel.findOneAndUpdate(
      { _id: id, userId, status: 'success' },
      { $set: { otp, sms }, $push: { otpList: { otp, sms, receivedAt: new Date() } } },
      { new: true }
    );
    return doc ? this.parse(doc) : null;
  },

  async countByUserIdInRange(userId: string, startDate: Date, endDate: Date, status?: string): Promise<number> {
    await connectDB();
    const query: any = { userId, allocatedAt: { $gte: startDate, $lte: endDate } };
    if (status) query.status = status;
    return AllocatedNumberModel.countDocuments(query);
  },

  async getDailyCounts(userId: string, startDate: Date, endDate: Date): Promise<{ date: string; count: number }[]> {
    await connectDB();
    const results = await AllocatedNumberModel.aggregate([
      { $match: { userId, allocatedAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $dateToString: { format: '%m/%d', date: '$allocatedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return results.map((r: any) => ({ date: r._id, count: r.count }));
  },

  parse(doc: any): AllocatedNumberRecord {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      number: doc.number,
      country: doc.country || '',
      operator: doc.operator || '',
      transactionId: doc.transactionId || '',
      status: doc.status || 'pending',
      otp: doc.otp,
      sms: doc.sms,
      otpList: (doc.otpList || []).map((item: any) => ({
        otp: item.otp,
        sms: item.sms,
        receivedAt: item.receivedAt ? item.receivedAt.toISOString() : new Date().toISOString(),
      })),
      expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : new Date().toISOString(),
      allocatedAt: doc.allocatedAt ? doc.allocatedAt.toISOString() : new Date().toISOString(),
    };
  },

  // --- Admin-level aggregate queries ---

  async countAllInRange(startDate: Date, endDate: Date, status?: string): Promise<number> {
    await connectDB();
    const query: any = { allocatedAt: { $gte: startDate, $lte: endDate } };
    if (status) query.status = status;
    return AllocatedNumberModel.countDocuments(query);
  },

  async countAll(): Promise<number> {
    await connectDB();
    return AllocatedNumberModel.countDocuments({});
  },

  async getDailyCountsAll(startDate: Date, endDate: Date): Promise<{ date: string; count: number }[]> {
    await connectDB();
    const results = await AllocatedNumberModel.aggregate([
      { $match: { allocatedAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $dateToString: { format: '%m/%d', date: '$allocatedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return results.map((r: any) => ({ date: r._id, count: r.count }));
  },
};

// PaymentRequest types
export interface PaymentRequestRecord {
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

// PaymentRequest Database Operations
export const PaymentRequestDB = {
  async create(data: {
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    currency: string;
    walletAddress: string;
    network: string;
  }): Promise<PaymentRequestRecord> {
    await connectDB();
    const doc = await PaymentRequestModel.create(data);
    return this.parse(doc);
  },

  async findByUserId(userId: string): Promise<PaymentRequestRecord[]> {
    await connectDB();
    const docs = await PaymentRequestModel.find({ userId }).sort({ createdAt: -1 });
    return docs.map(d => this.parse(d));
  },

  async findAll(): Promise<PaymentRequestRecord[]> {
    await connectDB();
    const docs = await PaymentRequestModel.find({}).sort({ createdAt: -1 });
    return docs.map(d => this.parse(d));
  },

  async findPending(): Promise<PaymentRequestRecord[]> {
    await connectDB();
    const docs = await PaymentRequestModel.find({ status: 'pending' }).sort({ createdAt: -1 });
    return docs.map(d => this.parse(d));
  },

  async updateStatus(id: string, status: 'approved' | 'rejected' | 'rejected_deducted', adminNote?: string): Promise<PaymentRequestRecord | null> {
    await connectDB();
    const update: any = { status };
    if (adminNote !== undefined) update.adminNote = adminNote;
    const doc = await PaymentRequestModel.findByIdAndUpdate(id, update, { new: true });
    return doc ? this.parse(doc) : null;
  },

  parse(doc: any): PaymentRequestRecord {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      userName: doc.userName || '',
      userEmail: doc.userEmail || '',
      amount: doc.amount || 0,
      currency: doc.currency || 'USDT',
      walletAddress: doc.walletAddress || '',
      network: doc.network || 'TRC20',
      status: doc.status || 'pending',
      adminNote: doc.adminNote,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
    };
  },

  async sumByStatus(status: string): Promise<number> {
    await connectDB();
    const result = await PaymentRequestModel.aggregate([
      { $match: { status } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result.length > 0 ? result[0].total : 0;
  },

  async countByStatus(status: string): Promise<number> {
    await connectDB();
    return PaymentRequestModel.countDocuments({ status });
  },
};

// UserWallet Database Operations
export const UserWalletDB = {
  async findByUserId(userId: string): Promise<Record<string, string> | null> {
    await connectDB();
    const doc = await UserWalletModel.findOne({ userId });
    if (!doc) return null;
    const wallets: Record<string, string> = {};
    if (doc.wallets instanceof Map) {
      doc.wallets.forEach((value: string, key: string) => {
        wallets[key] = value || '';
      });
    } else if (doc.wallets && typeof doc.wallets === 'object') {
      // Handle legacy plain object format
      for (const [key, value] of Object.entries(doc.wallets)) {
        wallets[key] = (value as string) || '';
      }
    }
    return wallets;
  },

  async upsert(userId: string, wallets: Record<string, string>): Promise<void> {
    await connectDB();
    await UserWalletModel.findOneAndUpdate(
      { userId },
      { userId, wallets },
      { upsert: true, new: true }
    );
  },
};

export const NotificationDB = {
  async create(data: { title: string; message: string; createdBy: string }): Promise<string> {
    await connectDB();
    const doc = await NotificationModel.create(data);
    return doc._id.toString();
  },

  async getAll(limit = 50): Promise<{ id: string; title: string; message: string; createdBy: string; readBy: string[]; createdAt: Date }[]> {
    await connectDB();
    const docs = await NotificationModel.find().sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map((d: any) => ({
      id: d._id.toString(),
      title: d.title,
      message: d.message,
      createdBy: d.createdBy,
      readBy: d.readBy || [],
      createdAt: d.createdAt,
    }));
  },

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await connectDB();
    await NotificationModel.updateOne(
      { _id: notificationId },
      { $addToSet: { readBy: userId } }
    );
  },

  async markAllAsRead(userId: string): Promise<void> {
    await connectDB();
    await NotificationModel.updateMany(
      { readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
  },

  async getUnreadCount(userId: string): Promise<number> {
    await connectDB();
    return NotificationModel.countDocuments({ readBy: { $ne: userId } });
  },

  async deleteById(id: string): Promise<void> {
    await connectDB();
    await NotificationModel.deleteOne({ _id: id });
  },
};
