import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data.db');

export function initDb() {
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      commune TEXT,
      type_implantation TEXT
    );

    CREATE TABLE IF NOT EXISTS measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_code TEXT NOT NULL,
      date_start TEXT NOT NULL,
      date_end TEXT NOT NULL,
      pollution_index REAL,
      temperature REAL,
      humidity REAL,
      wind_speed REAL,
      pm25 REAL,
      pm10 REAL,
      no2 REAL,
      o3 REAL,
      raw_data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (station_code) REFERENCES stations(code)
    );

    CREATE INDEX IF NOT EXISTS idx_measurements_station ON measurements(station_code);
    CREATE INDEX IF NOT EXISTS idx_measurements_date ON measurements(date_start);
    CREATE INDEX IF NOT EXISTS idx_measurements_index ON measurements(pollution_index);
  `);

  return db;
}
