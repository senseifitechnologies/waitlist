import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, '../database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Run migrations
const migrationsDir = path.join(__dirname, '../migrations');
if (fs.existsSync(migrationsDir)) {
  const migrationFiles = fs.readdirSync(migrationsDir).sort();
  for (const file of migrationFiles) {
    if (file.endsWith('.sql')) {
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      db.exec(sql);
      console.log(`Ran migration: ${file}`);
    }
  }
}

export default db;