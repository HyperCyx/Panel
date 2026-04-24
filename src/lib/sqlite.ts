import Database from 'better-sqlite3';
import path from 'path';

let db: ReturnType<typeof Database>;

export function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'access_list.db');
    db = new Database(dbPath);
    
    // Create the table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS access_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        price TEXT,
        accessOrigin TEXT,
        accessDestination TEXT,
        testNumber TEXT,
        rate TEXT,
        currency TEXT,
        comment TEXT,
        message TEXT,
        limitHour TEXT,
        limitDay TEXT,
        datetime TEXT
      );
      
      -- We will recreate the indexes to ensure fast search
      CREATE INDEX IF NOT EXISTS idx_accessOrigin ON access_records (accessOrigin);
      CREATE INDEX IF NOT EXISTS idx_accessDestination ON access_records (accessDestination);
      CREATE INDEX IF NOT EXISTS idx_message ON access_records (message);
      CREATE INDEX IF NOT EXISTS idx_datetime ON access_records (datetime DESC);
    `);
  }
  return db;
}
