import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Run migrations
const runMigrations = async () => {
  const migrationsDir = path.join(__dirname, '../migrations');
  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir).sort();
    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        const migrationPath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        try {
          await pool.query(sql);
          console.log(`Ran migration: ${file}`);
        } catch (error) {
          console.error(`Failed to run migration ${file}:`, error);
        }
      }
    }
  }
};

runMigrations();

export default pool;