import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { getMemoryStations } from './services/stationData.js';
import routeRoutes, { handleCalculateRoute } from './routes/routes.js';
import stationRoutes from './routes/stations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5174',
      'http://localhost:5173',
      'http://127.0.0.1:5174',
    ],
  })
);
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: 'none',
    stationsLoaded: getMemoryStations().length,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/routes', routeRoutes);
app.use('/api/stations', stationRoutes);

// Backwards-compatible alias from original endpoint
app.post('/api/calculate-path', handleCalculateRoute);
app.post('/api/calculate-path/', handleCalculateRoute);

// Serve built React frontend in production if present
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

function start() {
  const stations = getMemoryStations();
  console.log(`[Stations] Loaded ${stations.length} stops into memory`);

  app.listen(PORT, () => {
    console.log(`[Server] Fuel Saver API running on http://localhost:${PORT} (zero-database mode)`);
  });
}

start();
