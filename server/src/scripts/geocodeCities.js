import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

const CSV_PATH = path.join(ROOT_DIR, 'fuel-prices-for-be-assessment.csv');
const COORDS_PATH = path.join(ROOT_DIR, 'city_coords.json');
const BATCH_SIZE = 25;
const DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidNorthAmerica(lat, lon) {
  return lat >= 18 && lat <= 72 && lon >= -170 && lon <= -50;
}

async function fetchCoords(city, state) {
  const query = encodeURIComponent(`${city}, ${state}, USA`);
  const url = `https://photon.komoot.io/api/?q=${query}&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FuelSaverMERN/2.0' },
    });
    if (!res.ok) return { city, state, lat: null, lon: null };
    const data = await res.json();
    const feature = data?.features?.[0];
    if (feature?.geometry?.coordinates) {
      const [lon, lat] = feature.geometry.coordinates;
      if (isValidNorthAmerica(lat, lon)) {
        return { city, state, lat, lon };
      }
    }
  } catch {
    // Ignore transient network errors for individual cities
  }
  return { city, state, lat: null, lon: null };
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`[Geocode] CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const rawCsv = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(rawCsv, { columns: true, skip_empty_lines: true, trim: true });

  const uniqueMap = new Map();
  for (const row of rows) {
    const city = (row['City'] || '').trim();
    const state = (row['State'] || '').trim();
    if (city && state) {
      uniqueMap.set(`${city},${state}`, { city, state });
    }
  }

  let results = {};
  if (fs.existsSync(COORDS_PATH)) {
    results = JSON.parse(fs.readFileSync(COORDS_PATH, 'utf-8'));
  }

  const toFetch = Array.from(uniqueMap.entries())
    .filter(([key]) => !results[key])
    .map(([, val]) => val);

  console.log(
    `[Geocode] Total unique cities: ${uniqueMap.size}, already cached: ${
      Object.keys(results).length
    }, remaining: ${toFetch.length}`
  );

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(({ city, state }) => fetchCoords(city, state))
    );

    for (const { city, state, lat, lon } of batchResults) {
      if (lat !== null && lon !== null) {
        results[`${city},${state}`] = { lat, lon };
      }
    }

    fs.writeFileSync(COORDS_PATH, JSON.stringify(results));
    console.log(`[Geocode] Progress: ${Object.keys(results).length} / ${uniqueMap.size}`);

    if (i + BATCH_SIZE < toFetch.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`[Geocode] Done! Saved ${Object.keys(results).length} city coordinates.`);
}

main();
