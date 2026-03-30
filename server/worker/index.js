import cron from 'node-cron';
import axios from 'axios';
import dotenv from 'dotenv';
import { initDb } from '../src/db.js';

dotenv.config();

const INTERVAL = process.env.WORKER_INTERVAL_MIN || 5;
const DATA_API_URL = process.env.DATA_API_URL || 'http://localhost:8000/data';

const db = initDb();

// Prepared statements for upsert
const upsertStation = db.prepare(`
  INSERT INTO stations (code, name, latitude, longitude, commune, type_implantation)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(code) DO UPDATE SET
    name = excluded.name,
    latitude = excluded.latitude,
    longitude = excluded.longitude
`);

const insertMeasurement = db.prepare(`
  INSERT INTO measurements (station_code, date_start, date_end, pollution_index, temperature, humidity, wind_speed, pm25, pm10, no2, o3)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const checkDuplicate = db.prepare(`
  SELECT id FROM measurements WHERE station_code = ? AND date_start = ?
`);

const insertBatch = db.transaction((records) => {
  let inserted = 0;
  let skipped = 0;

  for (const r of records) {
    // Upsert station
    upsertStation.run(
      r.station.code, r.station.name, r.station.latitude, r.station.longitude,
      r.station.commune, r.station.type_implantation
    );

    // Skip if measurement already exists for this station + time slot
    const existing = checkDuplicate.get(r.station.code, r.date_start);
    if (existing) {
      skipped++;
      continue;
    }

    insertMeasurement.run(
      r.station.code, r.date_start, r.date_end,
      r.pollution_index, r.temperature, r.humidity, r.wind_speed,
      r.pm25, r.pm10, r.no2, r.o3
    );
    inserted++;
  }

  return { inserted, skipped };
});

async function poll() {
  const start = Date.now();
  console.log(`[Worker] ${new Date().toISOString()} — Polling ${DATA_API_URL}`);

  try {
    const { data } = await axios.get(DATA_API_URL, { timeout: 30000 });

    if (!data.data || !Array.isArray(data.data)) {
      console.error('[Worker] Invalid response format — expected { data: [...] }');
      return;
    }

    const { inserted, skipped } = insertBatch(data.data);
    const duration = Date.now() - start;
    console.log(`[Worker] Done in ${duration}ms — ${inserted} inserted, ${skipped} skipped (duplicates)`);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('[Worker] API unreachable — is the server running?');
    } else {
      console.error(`[Worker] Error: ${err.message}`);
    }
  }
}

// Schedule polling
cron.schedule(`*/${INTERVAL} * * * *`, poll);

// First poll on startup
poll();

console.log(`[Worker] Started — polling every ${INTERVAL} min from ${DATA_API_URL}`);
