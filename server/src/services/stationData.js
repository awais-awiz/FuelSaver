import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

let memoryStations = null;
let coordsCache = null;

function isValidNorthAmericaCoord(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    lat >= 18 &&
    lat <= 72 &&
    lon >= -170 &&
    lon <= -50
  );
}

export function loadCityCoords() {
  if (coordsCache) return coordsCache;
  const jsonPath = path.join(ROOT_DIR, 'city_coords.json');
  if (fs.existsSync(jsonPath)) {
    coordsCache = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } else {
    coordsCache = {};
  }
  return coordsCache;
}

export function parseStationsFromDisk() {
  const csvPath = path.join(ROOT_DIR, 'fuel-prices-for-be-assessment.csv');
  const coords = loadCityCoords();

  if (!fs.existsSync(csvPath)) {
    console.warn(`[Stations] CSV file not found at ${csvPath}`);
    return [];
  }

  const rawCsv = fs.readFileSync(csvPath, 'utf-8');
  const rows = parse(rawCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Deduplicate by OPIS Truckstop ID, keeping lowest retail price
  const byId = new Map();
  for (const row of rows) {
    const opisId = parseInt(row['OPIS Truckstop ID'], 10);
    const price = parseFloat(row['Retail Price']);
    if (Number.isNaN(opisId) || Number.isNaN(price) || price <= 0) continue;

    const city = (row['City'] || '').trim();
    const state = (row['State'] || '').trim();
    const key = `${city},${state}`;
    const coord = coords[key];
    let lat = null;
    let lon = null;
    if (coord && isValidNorthAmericaCoord(coord.lat, coord.lon)) {
      lat = coord.lat;
      lon = coord.lon;
    }

    const existing = byId.get(opisId);
    if (!existing || price < existing.retail_price) {
      byId.set(opisId, {
        opis_id: opisId,
        name: (row['Truckstop Name'] || '').trim(),
        address: (row['Address'] || '').trim(),
        city,
        state,
        rack_id: parseInt(row['Rack ID'], 10) || 0,
        retail_price: price,
        lat,
        lon,
      });
    }
  }

  return Array.from(byId.values());
}

export function getMemoryStations() {
  if (!memoryStations) {
    memoryStations = parseStationsFromDisk();
  }
  return memoryStations;
}

export async function findStationsInBounds({ minLat, maxLat, minLon, maxLon }) {
  return getMemoryStations().filter(
    (s) =>
      s.lat !== null &&
      s.lon !== null &&
      s.lat >= minLat &&
      s.lat <= maxLat &&
      s.lon >= minLon &&
      s.lon <= maxLon
  );
}
