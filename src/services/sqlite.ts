
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { type WebDAVClient, createClient } from 'webdav';
import { webdavConfig } from '@/config/webdav';
import { ImageFile } from '@/types';

// Define types for the database records
export type UserRole = 'admin' | 'trusted' | 'user' | 'banned';

export interface StoredUser {
  username: string;
  passwordHash: string;
  role: UserRole;
}

// --- Database Initialization ---
const dbFilePath = path.join(process.cwd(), 'data', 'hubqueue.db');
fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

export const db = new Database(dbFilePath);
console.log(`SQLite database connected at ${dbFilePath}`);

// --- Schema Definition ---
function initializeDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'trusted', 'user', 'banned'))
    );

    CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        webdavPath TEXT NOT NULL,
        url TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('queued', 'in-progress', 'uploaded', 'error', 'completed')),
        uploadedBy TEXT NOT NULL,
        claimedBy TEXT,
        completedBy TEXT,
        isUploading BOOLEAN,
        createdAt INTEGER,
        completedAt INTEGER,
        completionNotes TEXT,
        FOREIGN KEY (uploadedBy) REFERENCES users(username),
        FOREIGN KEY (claimedBy) REFERENCES users(username),
        FOREIGN KEY (completedBy) REFERENCES users(username)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
    CREATE INDEX IF NOT EXISTS idx_images_completedAt ON images(completedAt);
  `;
  db.exec(schema);
  console.log('Database schema verified/initialized.');
  
  // Initialize default settings if they don't exist
  const stmt = db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('maintenanceMode', 'false')");
  stmt.run();
}


// --- Data Migration (One-time) ---
async function migrateFromWebdav() {
    console.log("Checking if data migration from WebDAV is needed...");
    const userCountStmt = db.prepare('SELECT count(*) as count FROM users');
    const userCount = (userCountStmt.get() as { count: number }).count;

    if (userCount > 0) {
        console.log("Database already contains data. Skipping migration.");
        return;
    }

    if (!webdavConfig.url) {
        console.log("WebDAV not configured. Skipping migration.");
        return;
    }

    console.log("Database is empty. Attempting to migrate data from WebDAV JSON files.");
    
    let webdavClient: WebDAVClient;
    try {
        webdavClient = createClient(webdavConfig.url, {
            username: webdavConfig.username,
            password: webdavConfig.password
        });
        await webdavClient.stat("/"); // Test connection
    } catch (error) {
        console.warn("Could not connect to WebDAV for migration. Skipping.", error);
        return;
    }

    // Transaction for migration
    const migrateTx = db.transaction(async () => {
        // Migrate Users
        try {
            if (await webdavClient.exists('/users.json')) {
                const usersJson = await webdavClient.getFileContents('/users.json', { format: "text" }) as string;
                const users: StoredUser[] = JSON.parse(usersJson);
                const userStmt = db.prepare('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)');
                for (const user of users) {
                    // Simple validation
                    if(user.username && user.passwordHash && user.role) {
                       userStmt.run(user.username, user.passwordHash, user.role);
                    }
                }
                console.log(`Migrated ${users.length} users.`);
            }
        } catch(e) { console.error("Failed to migrate users.json", e); }

        // Migrate Images & History
        try {
            let allImages: ImageFile[] = [];
            if (await webdavClient.exists('/images.json')) {
                const imagesJson = await webdavClient.getFileContents('/images.json', { format: "text" }) as string;
                allImages = [...allImages, ...JSON.parse(imagesJson)];
            }
            if (await webdavClient.exists('/history.json')) {
                const historyJson = await webdavClient.getFileContents('/history.json', { format: "text" }) as string;
                allImages = [...allImages, ...JSON.parse(historyJson)];
            }
            
            const imageStmt = db.prepare(`
                INSERT INTO images (id, name, webdavPath, url, status, uploadedBy, createdAt, claimedBy, completedBy, completedAt, completionNotes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const img of allImages) {
                if(img.id && img.name && img.webdavPath && img.status && img.uploadedBy && img.createdAt) {
                    imageStmt.run(img.id, img.name, img.webdavPath, img.url, img.status, img.uploadedBy, img.createdAt, img.claimedBy, img.completedBy, img.completedAt, img.completionNotes);
                }
            }
            console.log(`Migrated ${allImages.length} image/history records.`);

        } catch(e) { console.error("Failed to migrate images.json/history.json", e); }

        // Migrate Maintenance Status
        try {
            if (await webdavClient.exists('/maintenance.json')) {
                const maintJson = await webdavClient.getFileContents('/maintenance.json', { format: "text" }) as string;
                const status = JSON.parse(maintJson);
                const maintStmt = db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('maintenanceMode', ?)");
                maintStmt.run(status.isMaintenance.toString());
                console.log("Migrated maintenance status.");
            }
        } catch(e) { console.error("Failed to migrate maintenance.json", e); }
    });
    
    try {
        await migrateTx();
        console.log("Data migration completed successfully.");
    } catch(err) {
        console.error("A critical error occurred during data migration transaction. The database might be in an inconsistent state.", err);
    }
}


// --- Run Initialization ---
initializeDatabase();
migrateFromWebdav().catch(err => {
    console.error("Migration process failed:", err);
});
