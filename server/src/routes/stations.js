import express from 'express';
import { getMemoryStations, loadCityCoords } from '../services/stationData.js';

const router = express.Router();

const MAJOR_CITIES = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
  'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
  'Boston, MA', 'El Paso, TX', 'Nashville, TN', 'Detroit, MI', 'Oklahoma City, OK',
  'Portland, OR', 'Las Vegas, NV', 'Memphis, TN', 'Louisville, KY', 'Baltimore, MD',
  'Milwaukee, WI', 'Albuquerque, NM', 'Tucson, AZ', 'Fresno, CA', 'Sacramento, CA',
  'Kansas City, MO', 'Atlanta, GA', 'Miami, FL', 'Raleigh, NC', 'Omaha, NE',
  'Minneapolis, MN', 'Cleveland, OH', 'New Orleans, LA', 'Tampa, FL', 'Pittsburgh, PA',
  'Cincinnati, OH', 'St. Louis, MO', 'Orlando, FL', 'Salt Lake City, UT', 'Richmond, VA',
  'Savannah, GA', 'Laredo, TX', 'Eloy, AZ', 'Reno, NV', 'Boise, ID',
];

let cachedCityList = null;

function getLocalCityList() {
  if (cachedCityList) return cachedCityList;
  const set = new Set(MAJOR_CITIES);
  const coords = loadCityCoords();
  for (const key of Object.keys(coords)) {
    const parts = key.split(',');
    if (parts.length === 2) {
      const formatted = `${parts[0].trim()}, ${parts[1].trim().toUpperCase()}`;
      set.add(formatted);
    }
  }
  cachedCityList = Array.from(set);
  return cachedCityList;
}

router.get('/cities', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const qLower = q.toLowerCase();

  if (!q) {
    return res.json({
      suggestions: MAJOR_CITIES.slice(0, 8).map((label) => ({ label, source: 'popular' })),
    });
  }

  const allLocal = getLocalCityList();
  const startsWith = [];
  const contains = [];

  for (const city of allLocal) {
    const lower = city.toLowerCase();
    if (lower.startsWith(qLower)) {
      startsWith.push(city);
    } else if (lower.includes(qLower)) {
      contains.push(city);
    }
  }

  const combined = [...startsWith, ...contains].slice(0, 8).map((label) => ({
    label,
    source: 'local',
  }));

  // If fewer than 5 local matches and query >= 3 chars, enrich with Photon live geocoder
  if (combined.length < 5 && q.length >= 3) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&bbox=-170,18,-50,72`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'FuelSaver/2.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        const seen = new Set(combined.map((c) => c.label.toLowerCase()));
        for (const feat of data?.features || []) {
          const p = feat.properties || {};
          const name = p.city || p.name;
          const state = p.state;
          if (!name) continue;
          const label = state ? `${name}, ${state}` : name;
          if (!seen.has(label.toLowerCase())) {
            seen.add(label.toLowerCase());
            combined.push({ label, source: 'live' });
          }
          if (combined.length >= 8) break;
        }
      }
    } catch {
      // Keep local matches if Photon times out
    }
  }

  return res.json({ suggestions: combined.slice(0, 8) });
});

router.get('/stats', (_req, res) => {
  try {
    const mem = getMemoryStations();
    const geocoded = mem.filter((s) => s.lat !== null && s.lon !== null);
    const sorted = [...mem].sort((a, b) => a.retail_price - b.retail_price);
    const avgPrice = mem.length
      ? mem.reduce((s, x) => s + x.retail_price, 0) / mem.length
      : 0;
    const states = Array.from(new Set(mem.map((s) => s.state).filter(Boolean))).sort();

    return res.json({
      source: 'memory',
      totalStations: mem.length,
      geocodedStations: geocoded.length,
      avgPrice: Number(avgPrice.toFixed(3)),
      minPrice: sorted[0] ? Number(sorted[0].retail_price.toFixed(3)) : 0,
      maxPrice: sorted[sorted.length - 1]
        ? Number(sorted[sorted.length - 1].retail_price.toFixed(3))
        : 0,
      cheapestStation: sorted[0]
        ? {
            name: sorted[0].name,
            city: sorted[0].city,
            state: sorted[0].state,
            price: sorted[0].retail_price,
          }
        : null,
      states,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  try {
    const {
      search = '',
      state = '',
      sort = 'price_asc',
      geocodedOnly = 'false',
      page = '1',
      limit = '24',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(60, Math.max(1, parseInt(limit, 10) || 24));
    const skip = (pageNum - 1) * limitNum;

    let list = getMemoryStations();
    if (state.trim()) {
      const st = state.trim().toUpperCase();
      list = list.filter((s) => s.state.toUpperCase() === st);
    }
    if (geocodedOnly === 'true') {
      list = list.filter((s) => s.lat !== null && s.lon !== null);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === 'price_desc') return b.retail_price - a.retail_price;
      if (sort === 'name_asc') return a.name.localeCompare(b.name);
      return a.retail_price - b.retail_price;
    });

    const total = list.length;
    return res.json({
      stations: list.slice(skip, skip + limitNum),
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
