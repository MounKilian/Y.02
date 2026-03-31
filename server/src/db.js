import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'y02',
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || 'admin',
  max: 10, 
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stations (
      id                SERIAL PRIMARY KEY,
      code              TEXT UNIQUE NOT NULL,
      name              TEXT NOT NULL,
      latitude          REAL NOT NULL,
      longitude         REAL NOT NULL,
      commune           TEXT,
      type_implantation TEXT
    );

    CREATE TABLE IF NOT EXISTS measurements (
      id              SERIAL PRIMARY KEY,
      station_code    TEXT NOT NULL REFERENCES stations(code),
      date_start      TEXT NOT NULL,
      date_end        TEXT NOT NULL,
      pollution_index REAL,
      temperature     REAL,
      humidity        REAL,
      wind_speed      REAL,
      pm25            REAL,
      pm10            REAL,
      no2             REAL,
      o3              REAL,
      raw_data        TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_measurements_station ON measurements(station_code);
    CREATE INDEX IF NOT EXISTS idx_measurements_date    ON measurements(date_start);
    CREATE INDEX IF NOT EXISTS idx_measurements_index   ON measurements(pollution_index);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_unique
    ON measurements(station_code, date_start);
  `);

  return pool;
}

export { pool };