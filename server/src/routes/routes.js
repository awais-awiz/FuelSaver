import express from 'express';
import { computeOptimalFuelRoute } from '../services/routeOptimizer.js';
import { streamRoutePdf } from '../services/pdfGenerator.js';

const router = express.Router();

export async function handleCalculateRoute(req, res) {
  try {
    const { origin, destination, mpg = 10, tank_capacity = 50 } = req.body || {};
    const result = await computeOptimalFuelRoute({
      origin,
      destination,
      mpg,
      tankCapacity: tank_capacity,
    });

    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Failed to compute route.' });
  }
}

router.post('/calculate', handleCalculateRoute);

router.post('/export-pdf', (req, res) => {
  const payload = req.body;
  if (!payload || !payload.origin || !payload.destination) {
    return res.status(400).json({ error: 'Route origin and destination are required to export PDF.' });
  }
  return streamRoutePdf({ ...payload, created_at: new Date() }, res);
});

export default router;
