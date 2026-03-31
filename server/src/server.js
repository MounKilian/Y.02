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

// Init database
const db = initDb();

// Routes
app.use('/api/stations', stationsRouter(db));
app.use('/api/mock', mockRouter);
app.use('/api/clusters', clustersRouter(db));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[API] Running on http://localhost:${PORT}`);
});
