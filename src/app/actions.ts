'use server';

import { z } from 'zod';
import { format, differenceInDays, startOfDay, endOfDay, subDays, subHours } from 'date-fns';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import jwt from 'jsonwebtoken';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { UserDB, SettingDB, AllocatedNumberDB, PaymentRequestDB, UserWalletDB, NotificationDB } from '@/lib/database';
import { User as UserModel } from '@/lib/models';
import connectDB from '@/lib/mongodb';
import type { FilterFormValues, SmsRecord, UserProfile, ProxySettings, ExtractedInfo, AdminSettings, PublicSettings, AccessListFilterFormValues, AccessListRecord, DashboardStats, AdminDashboardStats, AllocatedNumberInfo, PaymentRequestInfo, UserWalletInfo } from '@/lib/types';
import { allColorKeys } from '@/lib/types';
import { redirect } from 'next/navigation';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-this';

const filterSchema = z.object({
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date({ required_error: 'End date is required' }),
  senderId: z.string().optional(),
  phone: z.string().optional(),
}).superRefine(({ startDate, endDate }, ctx) => {
    if (!startDate || !endDate) {
        return;
    }
    if (endDate < startDate) {
        ctx.addIssue({
            code: 'custom',
            message: 'End date must be after start date.',
            path: ['endDate'],
        });
        return;
    }
    if (differenceInDays(endDate, startDate) > 1) {
        ctx.addIssue({
            code: 'custom',
            message: 'The date range can be a maximum of two days.',
            path: ['endDate'],
        });
    }
});

async function getApiKey(): Promise<string> {
  return await SettingDB.get('apiKey') || '';
}

async function getProxyAgent(): Promise<HttpsProxyAgent<string> | undefined> {
    const proxy = await SettingDB.get('proxySettings') as ProxySettings;
    if (!proxy || !proxy.ip || !proxy.port) {
        return undefined;
    }
    const auth = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
    const proxyUrl = `http://${auth}${proxy.ip}:${proxy.port}`;
    return new HttpsProxyAgent(proxyUrl);
}

async function getErrorMappings(): Promise<Record<string, string>> {
    try {
        const mappings = await SettingDB.get('errorMappings') as { reasonCode: string; customMessage: string }[] || [];
        return mappings.reduce((acc: Record<string, string>, mapping) => {
            if (mapping.reasonCode && mapping.customMessage) {
                acc[mapping.reasonCode] = mapping.customMessage;
            }
            return acc;
        }, {});
    } catch (error) {
        console.error('Error fetching error mappings:', error);
        return {};
    }
}


export async function fetchSmsData(
  filter: FilterFormValues
): Promise<{ data?: SmsRecord[]; error?: string }> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return { error: 'API key is not configured. Please set it in the admin panel.' };
  }
  
  const validation = filterSchema.safeParse(filter);
  if (!validation.success) {
    return { error: validation.error.errors.map((e) => e.message).join(', ') };
  }
  
  const agent = await getProxyAgent();

  const API_URL = 'https://api.iprn-elite.com/v1.0/csv';
  const body = {
    id: null,
    jsonrpc: '2.0',
    method: 'sms.mdr_full:get_list',
    params: {
      filter: {
        start_date: format(filter.startDate!, 'yyyy-MM-dd HH:mm:ss'),
        end_date: format(filter.endDate!, 'yyyy-MM-dd HH:mm:ss'),
        senderid: filter.senderId,
        phone: filter.phone,
      },
      page: 1,
      per_page: 100,
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      // @ts-ignore - agent is not in standard fetch types
      agent,
    });

    if (!response.ok) {
       const errorText = await response.text();
        try {
            const jsonError = JSON.parse(errorText);
            if (jsonError.error) {
                const reasonCode = jsonError.error.reason_code;
                if (reasonCode) {
                    const errorMap = await getErrorMappings();
                    const customMessage = errorMap[reasonCode];
                    if (customMessage) {
                        return { error: customMessage };
                    }
                }
                return { error: `API Error: ${jsonError.error.message}` };
            }
        } catch (e) {
            // Not JSON error
        }
      return { error: `API Error: ${response.status} ${response.statusText}. ${errorText}` };
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim() === '') {
        return { data: [] };
    }
    
    if (csvText.trim().startsWith('{')) {
        try {
            const jsonError = JSON.parse(csvText);
            if (jsonError.error) {
                const reasonCode = jsonError.error.reason_code;
                 if (reasonCode) {
                    const errorMap = await getErrorMappings();
                    const customMessage = errorMap[reasonCode];
                    if (customMessage) {
                        return { error: customMessage };
                    }
                }
                return { error: `API returned an error: ${jsonError.error.message}` };
            }
        } catch (e) {
            // Not JSON error
        }
    }

    // A robust CSV parser that handles newlines and semicolons inside message content.
    const parseCsvWithQuotes = (input: string): string[][] => {
        const rows: string[][] = [];
        let inQuotes = false;
        let row: string[] = [];
        let field = '';
        const text = input.trim();

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (inQuotes) {
                if (char === '"') {
                    if (i + 1 < text.length && text[i + 1] === '"') {
                        field += '"';
                        i++; // Skip the next quote (escaped quote)
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ';') {
                    row.push(field);
                    field = '';
                } else if (char === '\n' || char === '\r') {
                    row.push(field);
                    rows.push(row);
                    row = [];
                    field = '';
                    if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
                        i++; // Handle CRLF
                    }
                } else {
                    field += char;
                }
            }
        }

        // Add the last field and row if the file doesn't end with a newline
        if (field || row.length > 0) {
            row.push(field);
            rows.push(row);
        }

        return rows.filter(r => r.length > 1 || (r.length === 1 && r[0]));
    };
    
    const allRows = parseCsvWithQuotes(csvText);

    if (allRows.length < 2) {
      return { data: [] };
    }

    const headers = allRows[0].map(h => h.trim().toLowerCase());
    const dataRows = allRows.slice(1);
    const records: SmsRecord[] = [];

    const columnMap: { [key in keyof Omit<SmsRecord, 'extractedInfo'>]?: number } = {
        dateTime: headers.indexOf('datetime'),
        senderId: headers.indexOf('senderid'),
        phone: headers.indexOf('b-number'),
        mccMnc: headers.indexOf('mcc/mnc'),
        destination: headers.indexOf('destination'),
        range: headers.indexOf('range'),
        rate: headers.indexOf('rate'),
        currency: headers.indexOf('currency'),
        message: headers.indexOf('message'),
    };
    
    if (columnMap.dateTime === -1 || columnMap.message === -1) {
        return { error: "CSV response is missing required columns ('datetime', 'message')." };
    }
    
    for (const parts of dataRows) {
        if (parts.length <= columnMap.message!) {
            continue; // Skip malformed rows
        }

        const message = parts[columnMap.message!];
        const extractedInfo = extractInfoWithoutAI(message);

        records.push({
            dateTime: parts[columnMap.dateTime!] || '',
            senderId: parts[columnMap.senderId!] || '',
            phone: parts[columnMap.phone!] || '',
            mccMnc: parts[columnMap.mccMnc!] || '',
            destination: parts[columnMap.destination!] || '',
            range: parts[columnMap.range!] || '',
            rate: parts[columnMap.rate!] || '',
            currency: parts[columnMap.currency!] || '',
            message: message,
            extractedInfo,
        });
    }
    
    // Filter out records from blocked apps
    const publicSettings = await getPublicSettings();
    const blockedApps: string[] = publicSettings.blockedApps || [];
    const filteredRecords = blockedApps.length > 0
        ? records.filter(r => {
            const senderLower = (r.senderId || '').toLowerCase();
            const messageLower = (r.message || '').toLowerCase();
            return !blockedApps.some(app => {
                const appLower = app.toLowerCase();
                return senderLower.includes(appLower) || messageLower.includes(appLower);
            });
        })
        : records;
    
    return { data: filteredRecords };
  } catch (err) {
    const error = err as Error;
    console.error('Failed to fetch SMS data:', error);
    return { error: error.message || 'An unknown error occurred.' };
  }
}

function extractInfoWithoutAI(message: string): ExtractedInfo {
    // Regex for confirmation codes: looks for 4-8 consecutive digits, or a 123-456 pattern.
    const codeRegex = /\b(\d{4,8}|\d{3}-\d{3})\b/g;
    const codes = message.match(codeRegex);
    let confirmationCode = codes ? codes[0] : undefined;

    if (confirmationCode) {
        // Remove any hyphens from the found code.
        confirmationCode = confirmationCode.replace(/-/g, '');
    }

    // Regex for links: finds URLs starting with http or https.
    const linkRegex = /(https?:\/\/[^\s"']+)/g;
    const links = message.match(linkRegex);
    const link = links ? links[0] : undefined;
    
    return { confirmationCode, link };
}

export async function fetchAccessListData(
  formValues: AccessListFilterFormValues
): Promise<{ data?: AccessListRecord[]; error?: string }> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return { error: 'API key is not configured. Please set it in the admin panel.' };
  }
  
  const agent = await getProxyAgent();

  const API_URL = 'https://api.iprn-elite.com/v1.0/csv';
  const body = {
    id: null,
    jsonrpc: '2.0',
    method: 'sms.access_list__get_list:account_price',
    params: {
      filter: {
        cur_key: 1,
        destination: formValues.destination,
        message: formValues.message,
        origin: formValues.origin,
        sp_key_list: null
      },
      page: 1,
      per_page: 100,
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      // @ts-ignore - agent is not in standard fetch types
      agent,
    });

    if (!response.ok) {
       const errorText = await response.text();
        try {
            const jsonError = JSON.parse(errorText);
            if (jsonError.error) {
                const reasonCode = jsonError.error.reason_code;
                if (reasonCode) {
                    const errorMap = await getErrorMappings();
                    const customMessage = errorMap[reasonCode];
                    if (customMessage) {
                        return { error: customMessage };
                    }
                }
                return { error: `API Error: ${jsonError.error.message}` };
            }
        } catch (e) {
            // Not JSON error
        }
      return { error: `API Error: ${response.status} ${response.statusText}. ${errorText}` };
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim() === '') {
        return { data: [] };
    }
    
    if (csvText.trim().startsWith('{')) {
        try {
            const jsonError = JSON.parse(csvText);
            if (jsonError.error) {
                const reasonCode = jsonError.error.reason_code;
                 if (reasonCode) {
                    const errorMap = await getErrorMappings();
                    const customMessage = errorMap[reasonCode];
                    if (customMessage) {
                        return { error: customMessage };
                    }
                }
                return { error: `API returned an error: ${jsonError.error.message}` };
            }
        } catch (e) {
            // Not JSON error
        }
    }

    const parseCsvWithQuotes = (input: string): string[][] => {
        const rows: string[][] = [];
        let inQuotes = false;
        let row: string[] = [];
        let field = '';
        const text = input.trim();

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuotes) {
                if (char === '"') {
                    if (i + 1 < text.length && text[i + 1] === '"') {
                        field += '"';
                        i++; 
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ';') {
                    row.push(field);
                    field = '';
                } else if (char === '\n' || char === '\r') {
                    row.push(field);
                    rows.push(row);
                    row = [];
                    field = '';
                    if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
                        i++;
                    }
                } else {
                    field += char;
                }
            }
        }

        if (field || row.length > 0) {
            row.push(field);
            rows.push(row);
        }

        return rows.filter(r => r.length > 1 || (r.length === 1 && r[0]));
    };
    
    const allRows = parseCsvWithQuotes(csvText);

    if (allRows.length < 2) {
      return { data: [] };
    }

    const headers = allRows[0].map(h => h.trim().toLowerCase());
    const dataRows = allRows.slice(1);
    const records: AccessListRecord[] = [];

    const columnMap = {
        price: headers.indexOf('price'),
        accessOrigin: headers.indexOf('access origin'),
        accessDestination: headers.indexOf('access destination'),
        testNumber: headers.indexOf('test number'),
        rate: headers.indexOf('rate'),
        currency: headers.indexOf('currency'),
        comment: headers.indexOf('comment'),
        message: headers.indexOf('message'),
        limitHour: headers.indexOf('limit hour'),
        limitDay: headers.indexOf('limit day'),
        datetime: headers.indexOf('datetime'),
    };
    
    if (columnMap.accessOrigin === -1) {
        return { error: "CSV response is missing required column ('access origin')." };
    }
    
    for (const parts of dataRows) {
        records.push({
            price: parts[columnMap.price] || '',
            accessOrigin: parts[columnMap.accessOrigin] || '',
            accessDestination: parts[columnMap.accessDestination] || '',
            testNumber: parts[columnMap.testNumber] || '',
            rate: parts[columnMap.rate] || '',
            currency: parts[columnMap.currency] || '',
            comment: parts[columnMap.comment] || '',
            message: parts[columnMap.message] || '',
            limitHour: parts[columnMap.limitHour] || '',
            limitDay: parts[columnMap.limitDay] || '',
            datetime: parts[columnMap.datetime] || '',
        });
    }
    
    // Filter out records from blocked apps
    const publicSettings = await getPublicSettings();
    const blockedApps: string[] = publicSettings.blockedApps || [];
    const filteredRecords = blockedApps.length > 0
        ? records.filter(r => {
            const originLower = (r.accessOrigin || '').toLowerCase();
            return !blockedApps.some(app => originLower.includes(app.toLowerCase()));
        })
        : records;
    
    return { data: filteredRecords };
  } catch (err) {
    const error = err as Error;
    console.error('Failed to fetch access list data:', error);
    return { error: error.message || 'An unknown error occurred.' };
  }
}

// --- Auth Actions ---

export async function getSignupStatus() {
    const signupEnabled = await SettingDB.get('signupEnabled');
    return { signupEnabled: signupEnabled !== false };
}

const signupSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email(),
  password: z.string().min(8),
  agentEmail: z.string().email(),
});

export async function signup(values: z.infer<typeof signupSchema>) {
    try {
        const { signupEnabled } = await getSignupStatus();
        if (!signupEnabled) {
            return { error: 'User registration is currently disabled by the administrator.' };
        }

        const existingUser = await UserDB.findByEmail(values.email);
        if (existingUser) {
            return { error: 'User with this email already exists.' };
        }

        // Validate agent email exists and is an agent
        const agent = await UserDB.findByEmail(values.agentEmail);
        if (!agent || !agent.isAgent) {
            return { error: 'Invalid agent email. Please provide a valid agent email ID.' };
        }
        
        await UserDB.create({
            name: values.name,
            phone: values.phone,
            email: values.email,
            password: values.password,
            agentEmail: values.agentEmail,
            approvalStatus: 'pending',
            status: 'active',
            isAdmin: false,
        });

        return { success: true };
    } catch (error) {
        console.error("Signup error:", error);
        return { error: 'An unexpected error occurred.' };
    }
}


const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(values: z.infer<typeof loginSchema>) {
  try {
        const user = await UserDB.findByEmail(values.email);

    if (!user || !user.password) {
      return { error: 'Invalid email or password.' };
    }

    const isPasswordValid = await UserDB.comparePassword(user, values.password);
    if (!isPasswordValid) {
      return { error: 'Invalid email or password.' };
    }

    if (user.approvalStatus === 'pending') {
      return { error: 'Your account is pending approval. Please wait for your agent or admin to approve.' };
    }

    if (user.approvalStatus === 'rejected') {
      return { error: 'Your account has been rejected. Please contact support.' };
    }

    const token = jwt.sign(
            { userId: user.id.toString(), isAdmin: user.isAdmin, isAgent: user.isAgent, status: user.status },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    cookies().set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTP !== 'true',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return { success: true, isAgent: user.isAgent };
  } catch (error) {
    console.error("Login error:", error);
    return { error: 'An unexpected error occurred.' };
  }
}

export async function logout() {
    cookies().delete('token');
    cookies().delete('admin_session');
    redirect('/');
}

export async function getCurrentUser(): Promise<UserProfile | null> {
    const token = cookies().get('token')?.value;
    if (!token) return null;

    try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await UserDB.findById(String(decoded.userId));
        if (!user) return null;

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            photoURL: user.photoURL,
            status: user.status,
            isAdmin: user.isAdmin,
            isAgent: user.isAgent,
            agentEmail: user.agentEmail,
            approvalStatus: user.approvalStatus,
            approvedBy: user.approvedBy,
            commissionRate: user.commissionRate ?? 0,
            agentWalletBalance: user.agentWalletBalance ?? 0,
            walletBalance: user.walletBalance ?? 0,
            otpRate: user.otpRate ?? 0.50,
        };
    } catch (error) {
        return null;
    }
}


// --- User Profile Actions ---
const userProfileSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export async function updateUserProfile(userId: string, values: z.infer<typeof userProfileSchema>) {
    try {
        const validation = userProfileSchema.safeParse(values);
        if (!validation.success) {
            return { error: 'Invalid data provided.' };
        }

        const user = await UserDB.findById(userId);
        if (!user) {
            return { error: 'User not found.' };
        }

        const emailChangeEnabled = await SettingDB.get('emailChangeEnabled') !== false;

        if (user.email !== values.email && !emailChangeEnabled) {
            return { error: 'Email address cannot be changed at this time.' };
        }
        
        if (user.email !== values.email) {
            const existingUserWithEmail = await UserDB.findByEmail(values.email);
            if (existingUserWithEmail && existingUserWithEmail.id !== user.id) {
                return { error: 'This email is already in use by another account.' };
            }
        }

        const updatedUser = await UserDB.updateById(userId, { name: values.name, email: values.email });
        
        if (!updatedUser) {
            return { error: 'User not found.' };
        }

        // Re-issue a new token with updated information
        const token = jwt.sign(
          { userId: updatedUser.id.toString(), isAdmin: updatedUser.isAdmin, status: updatedUser.status },
          JWT_SECRET,
          { expiresIn: '1d' }
        );

        cookies().set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTP !== 'true',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return { success: true };
    } catch (error) {
        console.error('Update profile error:', error);
        return { error: 'An unexpected error occurred while updating your profile.' };
    }
}


// --- Public Site Settings ---
export async function getPublicSettings(): Promise<PublicSettings> {
    const defaultSettings: PublicSettings = {
        siteName: 'SMS Inspector 2.0',
        siteVersion: '3.0.1',
        signupEnabled: true,
        emailChangeEnabled: true,
        footerText: '© {YEAR} {SITENAME}. All rights reserved.',
        currency: '৳',
        paymentWalletAddress: '',
        paymentNetwork: 'TRC20',
        minimumWithdrawal: 10,
        otpCheckInterval: 5,
        consoleRefreshInterval: 60,
        defaultOrigins: ['Telegram', 'WhatsApp', 'Bitget', 'Binance', 'Google'],
        blockedApps: [],
        paymentMethods: [],
        colorPrimary: '217.2 91.2% 59.8%',
        colorPrimaryForeground: '210 20% 98%',
        colorBackground: '0 0% 100%',
        colorForeground: '224 71.4% 4.1%',
        colorCard: '0 0% 100%',
        colorCardForeground: '224 71.4% 4.1%',
        colorPopover: '0 0% 100%',
        colorPopoverForeground: '224 71.4% 4.1%',
        colorSecondary: '215 27.9% 95.1%',
        colorSecondaryForeground: '224 71.4% 4.1%',
        colorMuted: '215 27.9% 95.1%',
        colorMutedForeground: '215 20.2% 65.1%',
        colorAccent: '215 27.9% 95.1%',
        colorAccentForeground: '224 71.4% 4.1%',
        colorDestructive: '0 84.2% 60.2%',
        colorDestructiveForeground: '210 20% 98%',
        colorBorder: '215 20.2% 90.1%',
        colorInput: '215 20.2% 90.1%',
        colorRing: '217.2 91.2% 59.8%',
        colorSidebarBackground: '217.2 91.2% 59.8%',
        colorSidebarForeground: '210 20% 98%',
        colorSidebarAccent: '222.1 71.1% 50.4%',
        colorSidebarAccentForeground: '210 20% 98%',
        colorSidebarBorder: '222.1 71.1% 50.4%',
    };

    try {
           const settings = await SettingDB.getAll();

        return {
            siteName: settings.siteName ?? defaultSettings.siteName,
            siteVersion: settings.siteVersion ?? defaultSettings.siteVersion,
            signupEnabled: settings.signupEnabled ?? defaultSettings.signupEnabled,
            emailChangeEnabled: settings.emailChangeEnabled ?? defaultSettings.emailChangeEnabled,
            footerText: settings.footerText ?? defaultSettings.footerText,
            currency: settings.currency ?? defaultSettings.currency,
            paymentWalletAddress: settings.paymentWalletAddress ?? defaultSettings.paymentWalletAddress,
            paymentNetwork: settings.paymentNetwork ?? defaultSettings.paymentNetwork,
            minimumWithdrawal: settings.minimumWithdrawal ?? defaultSettings.minimumWithdrawal,
            otpCheckInterval: settings.otpCheckInterval ?? defaultSettings.otpCheckInterval,
            consoleRefreshInterval: settings.consoleRefreshInterval ?? defaultSettings.consoleRefreshInterval,
            defaultOrigins: settings.defaultOrigins ?? defaultSettings.defaultOrigins,
            blockedApps: settings.blockedApps ?? defaultSettings.blockedApps,
            paymentMethods: settings.paymentMethods ?? defaultSettings.paymentMethods,
            colorPrimary: settings.colorPrimary ?? defaultSettings.colorPrimary,
            colorBackground: settings.colorBackground ?? defaultSettings.colorBackground,
            colorForeground: settings.colorForeground ?? defaultSettings.colorForeground,
            colorCard: settings.colorCard ?? defaultSettings.colorCard,
            colorCardForeground: settings.colorCardForeground ?? defaultSettings.colorCardForeground,
            colorPopover: settings.colorPopover ?? defaultSettings.colorPopover,
            colorPopoverForeground: settings.colorPopoverForeground ?? defaultSettings.colorPopoverForeground,
            colorPrimaryForeground: settings.colorPrimaryForeground ?? defaultSettings.colorPrimaryForeground,
            colorSecondary: settings.colorSecondary ?? defaultSettings.colorSecondary,
            colorSecondaryForeground: settings.colorSecondaryForeground ?? defaultSettings.colorSecondaryForeground,
            colorMuted: settings.colorMuted ?? defaultSettings.colorMuted,
            colorMutedForeground: settings.colorMutedForeground ?? defaultSettings.colorMutedForeground,
            colorAccent: settings.colorAccent ?? defaultSettings.colorAccent,
            colorAccentForeground: settings.colorAccentForeground ?? defaultSettings.colorAccentForeground,
            colorDestructive: settings.colorDestructive ?? defaultSettings.colorDestructive,
            colorDestructiveForeground: settings.colorDestructiveForeground ?? defaultSettings.colorDestructiveForeground,
            colorBorder: settings.colorBorder ?? defaultSettings.colorBorder,
            colorInput: settings.colorInput ?? defaultSettings.colorInput,
            colorRing: settings.colorRing ?? defaultSettings.colorRing,
            colorSidebarBackground: settings.colorSidebarBackground ?? defaultSettings.colorSidebarBackground,
            colorSidebarForeground: settings.colorSidebarForeground ?? defaultSettings.colorSidebarForeground,
            colorSidebarAccent: settings.colorSidebarAccent ?? defaultSettings.colorSidebarAccent,
            colorSidebarAccentForeground: settings.colorSidebarAccentForeground ?? defaultSettings.colorSidebarAccentForeground,
            colorSidebarBorder: settings.colorSidebarBorder ?? defaultSettings.colorSidebarBorder,
        };
    } catch (error) {
        console.error("Error fetching public settings:", error);
        return defaultSettings;
    }
}


// --- Admin Actions ---
async function testProxy(proxy: ProxySettings): Promise<boolean> {
  if (!proxy.ip || !proxy.port) {
    return true; // No proxy to test, so we can save this "empty" configuration.
  }
  try {
    const auth = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
    const proxyUrl = `http://${auth}${proxy.ip}:${proxy.port}`;
    const agent = new HttpsProxyAgent(proxyUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://httpbin.org/get', { 
        // @ts-ignore - agent is not in standard fetch types
        agent,
        signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Proxy test failed:', error);
    return false;
  }
}

export async function getAdminSettings(): Promise<Partial<AdminSettings> & { error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };

    const settings = await SettingDB.getAll();

        const defaultProxy = { ip: '', port: '', username: '', password: '' };
        const rawProxy = settings.proxySettings;
        const safeProxySettings = (typeof rawProxy === 'object' && rawProxy !== null && !Array.isArray(rawProxy))
            ? rawProxy
            : defaultProxy;

        const allSettings: Partial<AdminSettings> = {
            apiKey: settings.apiKey ?? '',
            proxySettings: {
                ip: safeProxySettings.ip || '',
                port: safeProxySettings.port || '',
                username: safeProxySettings.username || '',
                password: safeProxySettings.password || '',
            },
            signupEnabled: settings.signupEnabled ?? true,
            siteName: settings.siteName ?? 'SMS Inspector 2.0',
            siteVersion: settings.siteVersion ?? '3.0.1',
            footerText: settings.footerText ?? '© {YEAR} {SITENAME}. All rights reserved.',
            emailChangeEnabled: settings.emailChangeEnabled ?? true,
            errorMappings: settings.errorMappings ?? [],
            numberExpiryMinutes: settings.numberExpiryMinutes ?? 5,
            otpCheckInterval: settings.otpCheckInterval ?? 5,
            consoleRefreshInterval: settings.consoleRefreshInterval ?? 60,
            currency: settings.currency ?? '৳',
            paymentWalletAddress: settings.paymentWalletAddress ?? '',
            paymentNetwork: settings.paymentNetwork ?? 'TRC20',
            minimumWithdrawal: settings.minimumWithdrawal ?? 10,
            defaultOrigins: settings.defaultOrigins ?? ['Telegram', 'WhatsApp', 'Bitget', 'Binance', 'Google'],
            blockedApps: settings.blockedApps ?? [],
            paymentMethods: settings.paymentMethods ?? [],
            
            // Color settings with defaults
            colorPrimary: settings.colorPrimary ?? '217.2 91.2% 59.8%',
            colorPrimaryForeground: settings.colorPrimaryForeground ?? '210 20% 98%',
            colorBackground: settings.colorBackground ?? '0 0% 100%',
            colorForeground: settings.colorForeground ?? '224 71.4% 4.1%',
            colorCard: settings.colorCard ?? '0 0% 100%',
            colorCardForeground: settings.colorCardForeground ?? '224 71.4% 4.1%',
            colorPopover: settings.colorPopover ?? '0 0% 100%',
            colorPopoverForeground: settings.colorPopoverForeground ?? '224 71.4% 4.1%',
            colorSecondary: settings.colorSecondary ?? '215 27.9% 95.1%',
            colorSecondaryForeground: settings.colorSecondaryForeground ?? '224 71.4% 4.1%',
            colorMuted: settings.colorMuted ?? '215 27.9% 95.1%',
            colorMutedForeground: settings.colorMutedForeground ?? '215 20.2% 65.1%',
            colorAccent: settings.colorAccent ?? '215 27.9% 95.1%',
            colorAccentForeground: settings.colorAccentForeground ?? '224 71.4% 4.1%',
            colorDestructive: settings.colorDestructive ?? '0 84.2% 60.2%',
            colorDestructiveForeground: settings.colorDestructiveForeground ?? '210 20% 98%',
            colorBorder: settings.colorBorder ?? '215 20.2% 90.1%',
            colorInput: settings.colorInput ?? '215 20.2% 90.1%',
            colorRing: settings.colorRing ?? '217.2 91.2% 59.8%',
            colorSidebarBackground: settings.colorSidebarBackground ?? '217.2 91.2% 59.8%',
            colorSidebarForeground: settings.colorSidebarForeground ?? '210 20% 98%',
            colorSidebarAccent: settings.colorSidebarAccent ?? '222.1 71.1% 50.4%',
            colorSidebarAccentForeground: settings.colorSidebarAccentForeground ?? '210 20% 98%',
            colorSidebarBorder: settings.colorSidebarBorder ?? '222.1 71.1% 50.4%',
        };

        return allSettings;

    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function updateAdminSettings(settings: Partial<AdminSettings>) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };

        if (settings.proxySettings !== undefined) {
            const isProxyValid = await testProxy(settings.proxySettings);
            if (!isProxyValid) {
                return { error: 'Proxy test failed. Please check the details and ensure the proxy is active.' };
            }
        }
        
        const settingsToSave: Record<string, any> = {};
        for (const [key, value] of Object.entries(settings)) {
            if (value !== undefined) {
                settingsToSave[key] = value;
            }
        }

            await SettingDB.setMany(settingsToSave);
        return { success: true };
    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function getAllUsers(): Promise<{ users?: UserProfile[], error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };

        const users = await UserDB.findAll();
        return { users };
    } catch (error) {
        return { error: (error as Error).message };
    }
}


export async function toggleUserStatus(id: string, status: 'active' | 'blocked') {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };

        await UserDB.updateById(id, { status });
        return { success: true };
    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function updateUserWallet(
    userId: string,
    walletBalance: number,
    otpRate: number
): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };

        const parsed_balance = parseFloat(String(walletBalance));
        const parsed_rate = parseFloat(String(otpRate));
        if (isNaN(parsed_balance) || isNaN(parsed_rate)) return { error: 'Invalid values.' };

        // Only admins can update user balances
        if (!currentUser.isAdmin) return { error: 'Unauthorized' };

        await UserDB.updateById(userId, { walletBalance: parsed_balance, otpRate: parsed_rate });
        return { success: true };
    } catch (error) {
        return { error: (error as Error).message };
    }
}

// Internal helper: fetch SMS records for a date range, with automatic pagination.
async function fetchRawSmsRecords(startDate: Date, endDate: Date): Promise<SmsRecord[]> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return [];
        const agent = await getProxyAgent();
        const API_URL = 'https://api.iprn-elite.com/v1.0/csv';
        const PER_PAGE = 1000;

        const parseCsvToRecords = (csvText: string): SmsRecord[] => {
            const parseCsvWithQuotes = (input: string): string[][] => {
                const rows: string[][] = [];
                let inQuotes = false;
                let row: string[] = [];
                let field = '';
                const text = input.trim();
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    if (inQuotes) {
                        if (char === '"') {
                            if (i + 1 < text.length && text[i + 1] === '"') { field += '"'; i++; }
                            else { inQuotes = false; }
                        } else { field += char; }
                    } else {
                        if (char === '"') { inQuotes = true; }
                        else if (char === ';') { row.push(field); field = ''; }
                        else if (char === '\n' || char === '\r') {
                            row.push(field); rows.push(row); row = []; field = '';
                            if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
                        } else { field += char; }
                    }
                }
                if (field || row.length > 0) { row.push(field); rows.push(row); }
                return rows.filter(r => r.length > 1 || (r.length === 1 && r[0]));
            };

            const allRows = parseCsvWithQuotes(csvText);
            if (allRows.length < 2) return [];
            const headers = allRows[0].map(h => h.trim().toLowerCase());
            const dataRows = allRows.slice(1);
            const columnMap: Record<string, number> = {
                dateTime: headers.indexOf('datetime'),
                senderId: headers.indexOf('senderid'),
                phone: headers.indexOf('b-number'),
                mccMnc: headers.indexOf('mcc/mnc'),
                destination: headers.indexOf('destination'),
                range: headers.indexOf('range'),
                rate: headers.indexOf('rate'),
                currency: headers.indexOf('currency'),
                message: headers.indexOf('message'),
            };
            if (columnMap.dateTime === -1 || columnMap.message === -1) return [];
            const records: SmsRecord[] = [];
            for (const parts of dataRows) {
                if (parts.length <= columnMap.message) continue;
                const message = parts[columnMap.message];
                records.push({
                    dateTime: parts[columnMap.dateTime] || '',
                    senderId: parts[columnMap.senderId] || '',
                    phone: parts[columnMap.phone] || '',
                    mccMnc: parts[columnMap.mccMnc] || '',
                    destination: parts[columnMap.destination] || '',
                    range: parts[columnMap.range] || '',
                    rate: parts[columnMap.rate] || '',
                    currency: parts[columnMap.currency] || '',
                    message,
                    extractedInfo: extractInfoWithoutAI(message),
                });
            }
            return records;
        };

        const allRecords: SmsRecord[] = [];
        let page = 1;
        while (true) {
            const body = {
                id: null,
                jsonrpc: '2.0',
                method: 'sms.mdr_full:get_list',
                params: {
                    filter: {
                        start_date: format(startDate, 'yyyy-MM-dd HH:mm:ss'),
                        end_date: format(endDate, 'yyyy-MM-dd HH:mm:ss'),
                    },
                    page,
                    per_page: PER_PAGE,
                },
            };
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey },
                body: JSON.stringify(body),
                // @ts-ignore
                agent,
            });
            if (!response.ok) break;
            const csvText = await response.text();
            if (!csvText || csvText.trim() === '' || csvText.trim().startsWith('{')) break;

            const pageRecords = parseCsvToRecords(csvText);
            allRecords.push(...pageRecords);

            // If fewer records than PER_PAGE were returned, we've reached the last page
            if (pageRecords.length < PER_PAGE) break;
            page++;
            if (page > 20) break; // safety cap: max 20,000 records per query
        }
        return allRecords;
    } catch {
        return [];
    }
}

export async function getUserAllocatedNumbers(): Promise<{ data?: AllocatedNumberInfo[]; error?: string }> {
    const user = await getCurrentUser();
    if (!user) return { error: 'Not authenticated' };
    try {
        // Expire old numbers first
        await AllocatedNumberDB.expireOldNumbers();
        const records = await AllocatedNumberDB.findByUserId(user.id);
        return {
            data: records.map(r => ({
                id: r.id,
                number: r.number,
                country: r.country,
                operator: r.operator,
                status: r.status,
                otp: r.otp,
                sms: r.sms,
                otpList: r.otpList,
                expiresAt: r.expiresAt,
                allocatedAt: r.allocatedAt,
            })),
        };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

export async function checkNumberOtp(numberId: string): Promise<{ otp?: string; sms?: string; status?: string; otpList?: { otp: string; sms: string; receivedAt: string }[]; error?: string }> {
    const user = await getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    try {
        // Fetch the allocated number record
        const records = await AllocatedNumberDB.findByUserId(user.id);
        const record = records.find(r => r.id === numberId);
        if (!record) return { error: 'Number not found' };
        if (record.status === 'expired') return { status: 'expired', otpList: record.otpList };

        // Check if expired
        if (record.status === 'pending' && new Date(record.expiresAt).getTime() <= Date.now()) {
            return { status: 'expired' };
        }

        // Query iprn-elite API to check if OTP/SMS arrived for this number
        const apiKey = await getApiKey();
        if (!apiKey) return { error: 'API key not configured' };

        const agent = await getProxyAgent();
        const API_URL = 'https://api.iprn-elite.com/v1.0';

        const body = {
            id: 1,
            jsonrpc: '2.0',
            method: 'sms.mdr_full:get_message_by_phone',
            params: {
                phone: record.number,
            },
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': apiKey,
            },
            body: JSON.stringify(body),
            cache: 'no-store',
            // @ts-ignore
            agent,
        });

        if (!response.ok) return { status: record.status, otp: record.otp, sms: record.sms, otpList: record.otpList };

        const jsonResponse = await response.json();

        // If there's an error or no result, OTP hasn't arrived yet
        if (jsonResponse.error || !jsonResponse.result) {
            return { status: record.status, otp: record.otp, sms: record.sms, otpList: record.otpList };
        }

        const result = jsonResponse.result;
        const smsMessage = result.message;

        if (!smsMessage) return { status: record.status, otp: record.otp, sms: record.sms, otpList: record.otpList };

        // Check if the sender is in the blocked apps list
        const senderId = result.senderid || '';
        const publicSettings = await getPublicSettings();
        const blockedApps: string[] = publicSettings.blockedApps || [];
        if (blockedApps.length > 0 && senderId) {
            const senderLower = senderId.toLowerCase();
            const messageLower = smsMessage.toLowerCase();
            const isBlocked = blockedApps.some(app => {
                const appLower = app.toLowerCase();
                return senderLower.includes(appLower) || messageLower.includes(appLower);
            });
            if (isBlocked) {
                return { status: record.status, otp: record.otp, sms: record.sms, otpList: record.otpList };
            }
        }

        // Extract OTP/confirmation code from the message
        const extracted = extractInfoWithoutAI(smsMessage);
        const otp = extracted.confirmationCode || smsMessage.substring(0, 50);

        // Check if this exact SMS is already stored (avoid duplicates)
        const alreadyStored = (record.otpList || []).some(item => item.sms === smsMessage);
        if (alreadyStored) {
            return { status: record.status, otp: record.otp, sms: record.sms, otpList: record.otpList };
        }

        if (record.status === 'pending') {
            // First OTP — transition pending→success and charge
            const updated = await AllocatedNumberDB.updateOtp(numberId, user.id, otp, smsMessage);
            if (updated) {
                await creditAllocationEarnings(user.id);
                return { status: 'success', otp, sms: smsMessage, otpList: updated.otpList };
            }
        } else if (record.status === 'success') {
            // Subsequent OTP — append without charging
            const updated = await AllocatedNumberDB.appendOtp(numberId, user.id, otp, smsMessage);
            if (updated) {
                return { status: 'success', otp, sms: smsMessage, otpList: updated.otpList };
            }
        }

        return { status: record.status, otp: record.otp, sms: record.sms, otpList: record.otpList };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

export async function getNumberExpiryMinutes(): Promise<number> {
    return (await SettingDB.get('numberExpiryMinutes')) ?? 5;
}

export async function getDashboardStats(): Promise<{ data?: DashboardStats; error?: string }> {
    const user = await getCurrentUser();
    if (!user) return { error: 'Not authenticated' };
    try {
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const yesterdayStart = startOfDay(subDays(now, 1));
        const yesterdayEnd = endOfDay(subDays(now, 1));
        const weekStart = startOfDay(subDays(now, 6));

        // All counts come from the user's allocated numbers in the database
        const [
            todayOtpCount,
            yesterdayOtpCount,
            todayNumbers,
            yesterdayNumbers,
            totalAllocatedNumbers,
            todayAllocatedNumbers,
            weekDailyCounts,
        ] = await Promise.all([
            AllocatedNumberDB.countByUserIdInRange(user.id, todayStart, todayEnd, 'success'),
            AllocatedNumberDB.countByUserIdInRange(user.id, yesterdayStart, yesterdayEnd, 'success'),
            AllocatedNumberDB.countByUserIdInRange(user.id, todayStart, todayEnd),
            AllocatedNumberDB.countByUserIdInRange(user.id, yesterdayStart, yesterdayEnd),
            AllocatedNumberDB.countByUserId(user.id),
            AllocatedNumberDB.countByUserIdToday(user.id),
            AllocatedNumberDB.getDailyCounts(user.id, weekStart, todayEnd),
        ]);

        // Build 7-day trend map (oldest→newest)
        const weekTrendMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
            weekTrendMap[format(subDays(now, i), 'MM/dd')] = 0;
        }
        for (const entry of weekDailyCounts) {
            if (entry.date in weekTrendMap) {
                weekTrendMap[entry.date] = entry.count;
            }
        }
        const weekTrend = Object.entries(weekTrendMap).map(([date, count]) => ({ date, count }));

        return {
            data: {
                walletBalance: user.walletBalance ?? 0,
                otpRate: user.otpRate ?? 0.50,
                todayOtpCount,
                yesterdayOtpCount,
                todayNumbers,
                yesterdayNumbers,
                todaySuccess: todayOtpCount,
                yesterdaySuccess: yesterdayOtpCount,
                weekTrend,
                totalAllocatedNumbers,
                todayAllocatedNumbers,
            },
        };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

export async function getAdminDashboardStats(): Promise<{ data?: AdminDashboardStats; error?: string }> {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return { error: 'Not authorized' };
    try {
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const yesterdayStart = startOfDay(subDays(now, 1));
        const yesterdayEnd = endOfDay(subDays(now, 1));
        const weekStart = startOfDay(subDays(now, 6));

        const [
            totalUsers,
            activeUsers,
            blockedUsers,
            todayNumbersAll,
            todaySuccessAll,
            yesterdayNumbersAll,
            yesterdaySuccessAll,
            totalNumbersAll,
            pendingPaymentsAmount,
            pendingPaymentsCount,
            approvedPaymentsAmount,
            approvedPaymentsCount,
            totalUserBalances,
            weekDailyCounts,
        ] = await Promise.all([
            UserDB.countAll(),
            UserDB.countActive(),
            UserDB.countBlocked(),
            AllocatedNumberDB.countAllInRange(todayStart, todayEnd),
            AllocatedNumberDB.countAllInRange(todayStart, todayEnd, 'success'),
            AllocatedNumberDB.countAllInRange(yesterdayStart, yesterdayEnd),
            AllocatedNumberDB.countAllInRange(yesterdayStart, yesterdayEnd, 'success'),
            AllocatedNumberDB.countAll(),
            PaymentRequestDB.sumByStatus('pending'),
            PaymentRequestDB.countByStatus('pending'),
            PaymentRequestDB.sumByStatus('approved'),
            PaymentRequestDB.countByStatus('approved'),
            UserDB.sumWalletBalances(),
            AllocatedNumberDB.getDailyCountsAll(weekStart, todayEnd),
        ]);

        const weekTrendMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
            weekTrendMap[format(subDays(now, i), 'MM/dd')] = 0;
        }
        for (const entry of weekDailyCounts) {
            if (entry.date in weekTrendMap) {
                weekTrendMap[entry.date] = entry.count;
            }
        }
        const weekTrend = Object.entries(weekTrendMap).map(([date, count]) => ({ date, count }));

        return {
            data: {
                totalUsers,
                activeUsers,
                blockedUsers,
                todayNumbersAll,
                todaySuccessAll,
                yesterdayNumbersAll,
                yesterdaySuccessAll,
                totalNumbersAll,
                pendingPaymentsAmount,
                pendingPaymentsCount,
                approvedPaymentsAmount,
                approvedPaymentsCount,
                totalUserBalances,
                weekTrend,
            },
        };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

// --- Admin Auth Actions ---

const adminLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function adminLogin(values: z.infer<typeof adminLoginSchema>) {
  if (values.username === 'admin' && values.password === 'admin') {
    cookies().set('admin_session', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTP !== 'true',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours (matches JWT token expiry)
      path: '/',
    });

    // Also issue a JWT token so the admin page can verify isAdmin via getCurrentUser
        const adminUser = await UserDB.findByEmail('admin@example.com');
    if (adminUser) {
      const token = jwt.sign(
                { userId: adminUser.id.toString(), isAdmin: adminUser.isAdmin, status: adminUser.status },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      cookies().set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTP !== 'true',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
      });
    }

    return { success: true };
  }
  return { error: 'Invalid admin credentials.' };
}

export async function adminLogout() {
  cookies().delete('admin_session');
  cookies().delete('token');
  redirect('/');
}

// Helper: credit user wallet and agent commission on number allocation
async function creditAllocationEarnings(userId: string) {
    try {
        const fullUser = await UserDB.findById(userId);
        if (!fullUser) return;

        const otpRate = fullUser.otpRate ?? 0;
        if (otpRate <= 0) return;

        // Atomic increment — safe under concurrent access
        await UserDB.incrementBalance(userId, 'walletBalance', otpRate);

        // Credit agent commission if user has an agent
        if (fullUser.agentEmail) {
            const agent = await UserDB.findByEmail(fullUser.agentEmail);
            if (agent && agent.isAgent && (agent.commissionRate ?? 0) > 0) {
                const commission = (otpRate * (agent.commissionRate ?? 0)) / 100;
                await UserDB.incrementBalance(agent.id, 'agentWalletBalance', commission);
            }
        }
    } catch (e) {
        console.error('Error crediting allocation earnings:', e);
    }
}

export async function allocateNumber(template: string): Promise<{ success?: boolean; number?: string; uniqueId?: string; country?: string; operator?: string; expiresAt?: string; error?: string }> {
    const user = await getCurrentUser();
    if (!user) {
        return { error: 'User not authenticated.' };
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
        return { error: 'API key is not configured. Please set it in the admin panel.' };
    }

    if (!template || template.trim().length === 0) {
        return { error: 'Please enter a valid range template.' };
    }

    const agent = await getProxyAgent();
    const API_URL = 'https://api.iprn-elite.com/v1.0';

    // Get expiry minutes from admin settings (default 5)
    const expiryMinutes = (await SettingDB.get('numberExpiryMinutes')) ?? 5;

    const body = {
        id: null,
        jsonrpc: '2.0',
        method: 'sms.allocation:template_by_account_user',
        params: {
            numbers: 1,
            random_number: true,
            target: {
                'sms.trunk_id': 'coVdIbG2SpCVBi-74unhKA',
            },
            template: template.trim(),
        },
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': apiKey,
            },
            body: JSON.stringify(body),
            // @ts-ignore - agent is not in standard fetch types
            agent,
        });

        const responseText = await response.text();
        let jsonResponse;
        try {
            jsonResponse = JSON.parse(responseText);
        } catch {
            return { error: 'Invalid response from API.' };
        }

        if (jsonResponse.error) {
            const reasonCode = jsonResponse.error.reason_code;
            if (reasonCode) {
                const errorMap = await getErrorMappings();
                const customMessage = errorMap[reasonCode];
                if (customMessage) {
                    return { error: customMessage };
                }
            }
            return { error: jsonResponse.error.message || 'API returned an error.' };
        }

        if (jsonResponse.result) {
            const result = jsonResponse.result;

            // Check if the response contains a trunk_number_transaction with an ID
            // If so, we need a second API call to get the actual number
            const transactionId = result.trunk_number_transaction?.id;
            if (transactionId) {
                // Second API call: fetch the allocated number using the transaction ID
                const numberListBody = {
                    id: null,
                    jsonrpc: '2.0',
                    method: 'sms.trunk_number:get_list',
                    params: {
                        target: {
                            'sms.trunk_number_transaction_id': transactionId,
                        },
                    },
                };

                const numberResponse = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Api-Key': apiKey,
                    },
                    body: JSON.stringify(numberListBody),
                    // @ts-ignore
                    agent,
                });

                const numberResponseText = await numberResponse.text();
                let numberJson;
                try {
                    numberJson = JSON.parse(numberResponseText);
                } catch {
                    return { error: 'Invalid response from number lookup API.' };
                }

                if (numberJson.error) {
                    const reasonCode = numberJson.error.reason_code;
                    if (reasonCode) {
                        const errorMap = await getErrorMappings();
                        const customMessage = errorMap[reasonCode];
                        if (customMessage) {
                            return { error: customMessage };
                        }
                    }
                    return { error: numberJson.error.message || 'Failed to retrieve allocated number.' };
                }

                const numberList = numberJson.result?.['sms.trunk_number_list'];
                if (Array.isArray(numberList) && numberList.length > 0) {
                    const allocatedEntry = numberList[0];
                    const number = allocatedEntry.number || '';
                    const country = allocatedEntry.worldzone_name || allocatedEntry.sde_name || '';
                    const operator = allocatedEntry.sde_name || '';

                    // Save to database
                    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
                    const saved = await AllocatedNumberDB.create({
                        userId: user.id,
                        number,
                        country,
                        operator,
                        transactionId,
                        expiresAt,
                    });

                    revalidatePath('/dashboard');
                    return {
                        success: true,
                        number,
                        uniqueId: saved.id,
                        country,
                        operator,
                        expiresAt: expiresAt.toISOString(),
                    };
                }

                return { error: 'Number allocation succeeded but no number was returned.' };
            }

            // Direct number in result (legacy/alternative response format)
            if (Array.isArray(result) && result.length > 0) {
                const allocation = result[0];
                const number = allocation.number || allocation.phone || allocation.b_number || '';
                const country = allocation.worldzone_name || allocation.destination || '';
                const operator = allocation.sde_name || allocation.range || '';

                const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
                const saved = await AllocatedNumberDB.create({
                    userId: user.id,
                    number,
                    country,
                    operator,
                    transactionId: allocation.id || '',
                    expiresAt,
                });

                revalidatePath('/dashboard');
                return {
                    success: true,
                    number,
                    uniqueId: saved.id,
                    country,
                    operator,
                    expiresAt: expiresAt.toISOString(),
                };
            } else if (typeof result === 'object') {
                // Check if there's a direct number field
                if (result.number || result.phone || result.b_number) {
                    const number = result.number || result.phone || result.b_number || '';
                    const country = result.worldzone_name || result.destination || '';
                    const operator = result.sde_name || result.range || '';

                    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
                    const saved = await AllocatedNumberDB.create({
                        userId: user.id,
                        number,
                        country,
                        operator,
                        transactionId: result.id || '',
                        expiresAt,
                    });

                    revalidatePath('/dashboard');
                    return {
                        success: true,
                        number,
                        uniqueId: saved.id,
                        country,
                        operator,
                        expiresAt: expiresAt.toISOString(),
                    };
                }
            }
        }

        return { error: 'Unexpected API response format.' };
    } catch (err) {
        const error = err as Error;
        console.error('Failed to allocate number:', error);
        return { error: error.message || 'An unknown error occurred.' };
    }
}

// --- Payment Actions ---

export async function createPaymentRequest(data: {
    amount: number;
    walletAddress: string;
    walletType: string;
}): Promise<{ success?: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    if (!data.walletAddress || data.walletAddress.trim().length === 0) {
        return { error: 'Wallet address is required.' };
    }
    if (!data.walletType || data.walletType.trim().length === 0) {
        return { error: 'Please select a wallet.' };
    }
    if (!data.amount || data.amount <= 0) {
        return { error: 'Amount must be greater than 0.' };
    }

    const settings = await SettingDB.getAll();
    const minWithdrawal = settings.minimumWithdrawal ?? 10;
    if (data.amount < minWithdrawal) {
        return { error: `Minimum withdrawal amount is ${minWithdrawal}.` };
    }

    const walletBalance = user.walletBalance ?? 0;
    if (data.amount > walletBalance) {
        return { error: 'Insufficient balance.' };
    }

    try {
        // Atomic deduct first — fails if balance dropped below amount since validation
        const updated = await UserDB.deductBalance(user.id, 'walletBalance', data.amount);
        if (!updated) {
            return { error: 'Insufficient balance.' };
        }

        await PaymentRequestDB.create({
            userId: user.id,
            userName: user.name || 'Unknown',
            userEmail: user.email || '',
            amount: data.amount,
            currency: settings.currency ?? '৳',
            walletAddress: data.walletAddress.trim(),
            network: data.walletType.trim(),
        });

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/payment');
        return { success: true };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

export async function getUserPaymentRequests(): Promise<{ data?: PaymentRequestInfo[]; error?: string }> {
    const user = await getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    try {
        const records = await PaymentRequestDB.findByUserId(user.id);
        return { data: records };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

export async function getAllPaymentRequests(): Promise<{ data?: PaymentRequestInfo[]; error?: string }> {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return { error: 'Unauthorized' };

    try {
        const records = await PaymentRequestDB.findAll();
        return { data: records };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

export async function updatePaymentStatus(
    paymentId: string,
    status: 'approved' | 'rejected' | 'rejected_deducted',
    adminNote?: string
): Promise<{ success?: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return { error: 'Unauthorized' };

    try {
        const payment = await PaymentRequestDB.updateStatus(paymentId, status, adminNote);
        if (!payment) return { error: 'Payment request not found.' };

        // If rejected (refund), return the amount to the correct balance
        if (status === 'rejected') {
            const targetUser = await UserDB.findById(payment.userId);
            if (targetUser) {
                const isAgentWithdrawal = payment.userName?.endsWith('(Agent)');
                if (isAgentWithdrawal) {
                    await UserDB.incrementBalance(payment.userId, 'agentWalletBalance', payment.amount);
                } else {
                    await UserDB.incrementBalance(payment.userId, 'walletBalance', payment.amount);
                }
            }
        }
        // If rejected_deducted, balance stays deducted (no refund)

        revalidatePath('/admin');
        revalidatePath('/dashboard/payment');
        return { success: true };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

// --- User Wallet Actions ---

export async function getUserWallets(): Promise<{ data?: UserWalletInfo; error?: string }> {
    const user = await getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    try {
        const wallets = await UserWalletDB.findByUserId(user.id);
        return { data: wallets || {} };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

export async function saveUserWallets(wallets: UserWalletInfo): Promise<{ success?: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    try {
        const sanitized: Record<string, string> = {};
        for (const [key, value] of Object.entries(wallets)) {
            sanitized[key] = (value || '').trim();
        }
        await UserWalletDB.upsert(user.id, sanitized);
        return { success: true };
    } catch (err) {
        return { error: (err as Error).message };
    }
}


// --- Agent Management Actions ---

const createAgentSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    commissionRate: z.coerce.number().min(0).max(100),
});

export async function createAgent(values: z.infer<typeof createAgentSchema>): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };

        // Validate and coerce input
        const parsed = createAgentSchema.safeParse(values);
        if (!parsed.success) return { error: 'Invalid agent data.' };
        const { name, email, password, commissionRate } = parsed.data;

        const existingUser = await UserDB.findByEmail(email);
        if (existingUser) {
            return { error: 'A user with this email already exists.' };
        }

        await UserDB.create({
            name,
            email,
            password,
            isAgent: true,
            approvalStatus: 'approved',
            status: 'active',
        });

        // Set commission rate after creation
        const agent = await UserDB.findByEmail(email);
        if (agent) {
            await UserDB.updateById(agent.id, { commissionRate: Number(commissionRate) });
        }

        return { success: true };
    } catch (error) {
        console.error('Create agent error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function getAllAgents(): Promise<{ agents?: UserProfile[]; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };

        await connectDB();
        const agents = await UserModel.find({ isAgent: true }).select('-password');
        return { agents: agents.map((a: any) => UserDB.parseUserProfile(a)) };
    } catch (error) {
        console.error('Get agents error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function deleteAgent(agentId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };

        await connectDB();
        const agent = await UserModel.findById(agentId);
        if (!agent || !agent.isAgent) {
            return { error: 'Agent not found.' };
        }

        await UserModel.findByIdAndDelete(agentId);
        return { success: true };
    } catch (error) {
        console.error('Delete agent error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

// --- Approval Actions (for agents and admin) ---

export async function getPendingUsers(): Promise<{ users?: UserProfile[]; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };

        await connectDB();

        if (currentUser.isAdmin) {
            // Admin sees all pending users
            const users = await UserModel.find({ approvalStatus: 'pending' }).select('-password');
            return { users: users.map((u: any) => UserDB.parseUserProfile(u)) };
        } else if (currentUser.isAgent) {
            // Agent sees only users who signed up with their email
            const users = await UserModel.find({ agentEmail: currentUser.email, approvalStatus: 'pending' }).select('-password');
            return { users: users.map((u: any) => UserDB.parseUserProfile(u)) };
        }

        return { error: 'Unauthorized' };
    } catch (error) {
        console.error('Get pending users error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function getAgentAllUsers(): Promise<{ users?: UserProfile[]; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };
        if (!currentUser.isAgent && !currentUser.isAdmin) return { error: 'Unauthorized' };

        await connectDB();

        if (currentUser.isAdmin) {
            const users = await UserModel.find({ approvalStatus: { $ne: undefined } }).select('-password');
            return { users: users.map((u: any) => UserDB.parseUserProfile(u)) };
        } else {
            // Agent sees only their referred users
            const users = await UserModel.find({ agentEmail: currentUser.email }).select('-password');
            return { users: users.map((u: any) => UserDB.parseUserProfile(u)) };
        }
    } catch (error) {
        console.error('Get agent users error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function approveUser(userId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };

        await connectDB();
        const targetUser = await UserModel.findById(userId);
        if (!targetUser) return { error: 'User not found.' };

        // Check authorization
        if (currentUser.isAdmin) {
            // Admin can approve anyone
        } else if (currentUser.isAgent && targetUser.agentEmail === currentUser.email) {
            // Agent can approve users who signed up with their email
        } else {
            return { error: 'Unauthorized' };
        }

        await UserDB.updateById(userId, {
            approvalStatus: 'approved',
            approvedBy: currentUser.email || currentUser.id,
        } as any);

        return { success: true };
    } catch (error) {
        console.error('Approve user error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function rejectUser(userId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };

        await connectDB();
        const targetUser = await UserModel.findById(userId);
        if (!targetUser) return { error: 'User not found.' };

        // Check authorization
        if (currentUser.isAdmin) {
            // Admin can reject anyone
        } else if (currentUser.isAgent && targetUser.agentEmail === currentUser.email) {
            // Agent can reject users who signed up with their email
        } else {
            return { error: 'Unauthorized' };
        }

        await UserDB.updateById(userId, {
            approvalStatus: 'rejected',
            approvedBy: currentUser.email || currentUser.id,
        } as any);

        return { success: true };
    } catch (error) {
        console.error('Reject user error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

// --- Agent Earnings & Withdrawal ---

export async function getAgentStats(): Promise<{
    data?: {
        commissionRate: number;
        agentWalletBalance: number;
        totalUsersEarnings: number;
        totalCommissionEarned: number;
        totalUsers: number;
        approvedUsers: number;
        pendingUsers: number;
    };
    error?: string;
}> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };
        if (!currentUser.isAgent && !currentUser.isAdmin) return { error: 'Unauthorized' };

        await connectDB();
        const users = await UserModel.find({ agentEmail: currentUser.email }).select('-password');

        const totalUsersEarnings = users.reduce((sum, u) => sum + (u.walletBalance ?? 0), 0);
        const approvedUsers = users.filter(u => u.approvalStatus === 'approved').length;
        const pendingUsers = users.filter(u => u.approvalStatus === 'pending').length;

        // Get fresh agent data
        const agent = await UserDB.findById(currentUser.id);

        return {
            data: {
                commissionRate: agent?.commissionRate ?? 0,
                agentWalletBalance: agent?.agentWalletBalance ?? 0,
                totalUsersEarnings,
                totalCommissionEarned: agent?.agentWalletBalance ?? 0,
                totalUsers: users.length,
                approvedUsers,
                pendingUsers,
            },
        };
    } catch (error) {
        console.error('Get agent stats error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function createAgentWithdrawal(amount: number, walletAddress: string, walletType: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };
        if (!currentUser.isAgent) return { error: 'Unauthorized' };

        if (!walletAddress || !walletAddress.trim()) return { error: 'Wallet address is required.' };
        if (!walletType || !walletType.trim()) return { error: 'Please select a wallet.' };

        const agent = await UserDB.findById(currentUser.id);
        if (!agent) return { error: 'Agent not found.' };

        if (amount <= 0) return { error: 'Amount must be greater than 0.' };
        if (amount > (agent.agentWalletBalance ?? 0)) return { error: 'Insufficient commission balance.' };

        const settings = await SettingDB.getAll();

        // Atomic deduct first — fails if balance dropped below amount since validation
        const updated = await UserDB.deductBalance(agent.id, 'agentWalletBalance', amount);
        if (!updated) {
            return { error: 'Insufficient commission balance.' };
        }

        // Create payment request for agent
        await PaymentRequestDB.create({
            userId: agent.id,
            userName: agent.name + ' (Agent)',
            userEmail: agent.email,
            amount,
            currency: settings.currency ?? '৳',
            walletAddress: walletAddress.trim(),
            network: walletType.trim(),
        });

        revalidatePath('/agent');
        return { success: true };
    } catch (error) {
        console.error('Agent withdrawal error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function updateAgentCommissionRate(agentId: string, commissionRate: number): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };

        const rate = Number(commissionRate);
        if (isNaN(rate) || rate < 0 || rate > 100) return { error: 'Commission rate must be between 0 and 100.' };

        await UserDB.updateById(agentId, { commissionRate: rate });
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        console.error('Update agent commission error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}


// --- Notification Actions ---

export async function createNotification(title: string, message: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };

        const trimmedTitle = title.trim();
        const trimmedMessage = message.trim();
        if (!trimmedTitle || !trimmedMessage) return { error: 'Title and message are required.' };

        await NotificationDB.create({
            title: trimmedTitle,
            message: trimmedMessage,
            createdBy: currentUser.email || currentUser.id,
        });

        revalidatePath('/dashboard/notifications');
        return { success: true };
    } catch (error) {
        console.error('Create notification error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function getNotifications(): Promise<{ data?: { id: string; title: string; message: string; createdBy: string; isRead: boolean; createdAt: string }[]; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };

        const notifications = await NotificationDB.getAll(100);
        const data = notifications.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            createdBy: n.createdBy,
            isRead: n.readBy.includes(currentUser.id),
            createdAt: n.createdAt.toISOString(),
        }));

        return { data };
    } catch (error) {
        console.error('Get notifications error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function getUnreadNotificationCount(): Promise<{ count: number }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { count: 0 };
        const count = await NotificationDB.getUnreadCount(currentUser.id);
        return { count };
    } catch {
        return { count: 0 };
    }
}

export async function markNotificationAsRead(notificationId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };
        await NotificationDB.markAsRead(notificationId, currentUser.id);
        return { success: true };
    } catch (error) {
        console.error('Mark notification read error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function markAllNotificationsAsRead(): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };
        await NotificationDB.markAllAsRead(currentUser.id);
        return { success: true };
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function deleteNotification(notificationId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };
        await NotificationDB.deleteById(notificationId);
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        console.error('Delete notification error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function getAdminNotifications(): Promise<{ data?: { id: string; title: string; message: string; createdBy: string; readCount: number; createdAt: string }[]; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return { error: 'Unauthorized' };

        const notifications = await NotificationDB.getAll(100);
        const data = notifications.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            createdBy: n.createdBy,
            readCount: n.readBy.length,
            createdAt: n.createdAt.toISOString(),
        }));

        return { data };
    } catch (error) {
        console.error('Get admin notifications error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

