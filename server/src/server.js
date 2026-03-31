import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import stationsRouter from './routes/stations.js';
import mockRouter from './routes/mock.js';
import clustersRouter from './routes/clusters.js';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 4000;

app.use(cors());
app.use(express.json());

async function start() {
  const db = await initDb();

  app.use('/api/stations', stationsRouter(db));
  app.use('/api/mock', mockRouter);
  app.use('/api/clusters', clustersRouter(db));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`[API] Running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[API] Failed to start:', err);
  process.exit(1);
});