import cron from 'node-cron';
import axios from 'axios';
import dotenv from 'dotenv';
import { initDb, pool } from '../src/db.js';

dotenv.config();

const INTERVAL = process.env.WORKER_INTERVAL_MIN || 5;
const DATA_API_URL = process.env.DATA_API_URL || 'http://api:8000/data?limit=5000';

// Init DB
await initDb();

// Insert or update station
async function upsertStation(client, r) {
  await client.query(`
    INSERT INTO stations (code, name, latitude, longitude, commune, type_implantation)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      commune = EXCLUDED.commune,
      type_implantation = EXCLUDED.type_implantation
  `, [
    r.station.code,
    r.station.name,
    r.station.latitude,
    r.station.longitude,
    r.station.commune,
    r.station.type_implantation
  ]);
}

// Check duplicate
async function checkDuplicate(client, stationCode, dateStart) {
  const res = await client.query(`
    SELECT id FROM measurements
    WHERE station_code = $1 AND date_start = $2
    LIMIT 1
  `, [stationCode, dateStart]);

  return res.rows.length > 0;
}

async function insertMeasurement(client, r) {
  await client.query(`
    INSERT INTO measurements (
      station_code, date_start, date_end,
      pollution_index, temperature, humidity,
      wind_speed, pm25, pm10, no2, o3
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (station_code, date_start) DO NOTHING
  `, [
    r.station.code,
    r.date_start,
    r.date_end,
    r.pollution_index,
    r.temperature,
    r.humidity,
    r.wind_speed,
    r.pm25,
    r.pm10,
    r.no2,
    r.o3
  ]);
}

// Batch avec transaction
async function insertBatch(records) {
  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;

  try {
    await client.query('BEGIN');

    for (const r of records) {
      if (!r.station) continue; 

      await upsertStation(client, r);      
      await insertMeasurement(client, r);  

      inserted++;
    }

    await client.query('COMMIT');
    return { inserted, skipped };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function poll() {
  const start = Date.now();
  console.log(`[Worker] ${new Date().toISOString()} — Polling ${DATA_API_URL}`);

  try {
    const { data } = await axios.get(DATA_API_URL, { timeout: 30000 });

    if (!data.data || !Array.isArray(data.data)) {
      console.error('[Worker] Invalid response format — expected { data: [...] }');
      return;
    }

    const { inserted, skipped } = await insertBatch(data.data);

    const duration = Date.now() - start;
    console.log(`[Worker] Done in ${duration}ms — ${inserted} inserted, ${skipped} skipped`);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('[Worker] API unreachable — is the server running?');
    } else {
      console.error(`[Worker] Error: ${err.message}`);
    }
  }
}

// CRON
cron.schedule(`*/${INTERVAL} * * * *`, poll);

// First run
poll();

console.log(`[Worker] Started — polling every ${INTERVAL} min from ${DATA_API_URL}`);