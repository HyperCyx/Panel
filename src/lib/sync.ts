import { AccessListDB, AccessListRecordInfo } from './database';
import { Setting } from './models';
import { ProxyAgent } from 'undici';

async function getApiKey(): Promise<string> {
    const setting = await Setting.findOne({ key: 'apiKey' });
    return setting ? setting.value : '';
}

async function getProxyDispatcher(): Promise<ProxyAgent | undefined> {
    const setting = await Setting.findOne({ key: 'proxySettings' });
    if (setting && setting.value && setting.value.ip && setting.value.port) {
        let proxyUrl = `http://${setting.value.ip}:${setting.value.port}`;
        if (setting.value.username && setting.value.password) {
            proxyUrl = `http://${setting.value.username}:${setting.value.password}@${setting.value.ip}:${setting.value.port}`;
        }
        return new ProxyAgent(proxyUrl);
    }
    return undefined;
}

let syncIntervalId: NodeJS.Timeout | null = null;
let currentIntervalMinutes = 0;

export async function startBackgroundSync() {
    console.log('[SYNC] Initializing background Access List sync manager...');
    
    // Initial sync
    await syncAccessListFromApi();

    // Polling loop to check if the user changed the interval setting
    setInterval(async () => {
        try {
            const setting = await Setting.findOne({ key: 'accessListSyncInterval' });
            const minutes = setting && setting.value ? parseInt(setting.value, 10) : 1;
            
            if (minutes !== currentIntervalMinutes) {
                console.log(`[SYNC] Sync interval changed from ${currentIntervalMinutes} to ${minutes} minutes. Rescheduling...`);
                currentIntervalMinutes = minutes;
                
                if (syncIntervalId) clearInterval(syncIntervalId);
                
                syncIntervalId = setInterval(() => {
                    syncAccessListFromApi();
                }, minutes * 60 * 1000);
            }
        } catch (err) {
            console.error('[SYNC] Error checking sync interval:', err);
        }
    }, 15000); // Check for settings changes every 15 seconds
}

export async function syncAccessListFromApi() {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return;

        const API_URL = 'https://api.iprn-elite.com/v1.0/csv';
        const body = {
            id: null,
            jsonrpc: '2.0',
            method: 'sms.access_list__get_list:account_price',
            params: {
                filter: {
                    cur_key: 1,
                    sp_key_list: null
                },
                page: 1,
                per_page: 5000, // Very large number to capture all origins
            },
        };

        const dispatcher = await getProxyDispatcher();
        let csvText = '';

        if (dispatcher) {
            const { fetch: undiciFetch } = await import('undici');
            const response = await undiciFetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': apiKey,
                },
                body: JSON.stringify(body),
                dispatcher,
            });
            if (!response.ok) throw new Error('API failed');
            csvText = await response.text();
        } else {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': apiKey,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error('API failed');
            csvText = await response.text();
        }

        if (!csvText || csvText.trim() === '' || csvText.trim().startsWith('{')) {
            return; // Error or empty response
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
        if (allRows.length < 2) return;

        const headers = allRows[0].map(h => h.trim().toLowerCase());
        const dataRows = allRows.slice(1);
        const records: AccessListRecordInfo[] = [];

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

        if (columnMap.accessOrigin === -1) return;

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

        // Wipe old DB and insert new
        await AccessListDB.bulkReplace(records);
        console.log(`[SYNC] Access List synced successfully. Replaced with ${records.length} records.`);

    } catch (err) {
        console.error('[SYNC] Error syncing access list:', err);
    }
}
