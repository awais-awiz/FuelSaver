import { findStationsInBounds, loadCityCoords } from './stationData.js';

const geocodeCache = new Map();

// Fast local fallback for major US cities if Nominatim rate-limits
const MAJOR_US_CITIES = {
  'new york, ny': { lat: 40.7128, lon: -74.006, displayName: 'New York, NY' },
  'los angeles, ca': { lat: 34.0522, lon: -118.2437, displayName: 'Los Angeles, CA' },
  'chicago, il': { lat: 41.8781, lon: -87.6298, displayName: 'Chicago, IL' },
  'houston, tx': { lat: 29.7604, lon: -95.3698, displayName: 'Houston, TX' },
  'phoenix, az': { lat: 33.4484, lon: -112.074, displayName: 'Phoenix, AZ' },
  'philadelphia, pa': { lat: 39.9526, lon: -75.1652, displayName: 'Philadelphia, PA' },
  'san antonio, tx': { lat: 29.4241, lon: -98.4936, displayName: 'San Antonio, TX' },
  'dallas, tx': { lat: 32.7767, lon: -96.797, displayName: 'Dallas, TX' },
  'austin, tx': { lat: 30.2672, lon: -97.7431, displayName: 'Austin, TX' },
  'miami, fl': { lat: 25.7617, lon: -80.1918, displayName: 'Miami, FL' },
  'atlanta, ga': { lat: 33.749, lon: -84.388, displayName: 'Atlanta, GA' },
  'denver, co': { lat: 39.7392, lon: -104.9903, displayName: 'Denver, CO' },
  'seattle, wa': { lat: 47.6062, lon: -122.3321, displayName: 'Seattle, WA' },
  'boston, ma': { lat: 42.3601, lon: -71.0589, displayName: 'Boston, MA' },
  'detroit, mi': { lat: 42.3314, lon: -83.0458, displayName: 'Detroit, MI' },
  'nashville, tn': { lat: 36.1627, lon: -86.7816, displayName: 'Nashville, TN' },
  'las vegas, nv': { lat: 36.1699, lon: -115.1398, displayName: 'Las Vegas, NV' },
  'portland, or': { lat: 45.5152, lon: -122.6784, displayName: 'Portland, OR' },
  'san francisco, ca': { lat: 37.7749, lon: -122.4194, displayName: 'San Francisco, CA' },
  'minneapolis, mn': { lat: 44.9778, lon: -93.265, displayName: 'Minneapolis, MN' },
  'kansas city, mo': { lat: 39.0997, lon: -94.5786, displayName: 'Kansas City, MO' },
  'indianapolis, in': { lat: 39.7684, lon: -86.1581, displayName: 'Indianapolis, IN' },
  'memphis, tn': { lat: 35.1495, lon: -90.049, displayName: 'Memphis, TN' },
  'charlotte, nc': { lat: 35.2271, lon: -80.8431, displayName: 'Charlotte, NC' },
  'salt lake city, ut': { lat: 40.7608, lon: -111.891, displayName: 'Salt Lake City, UT' },
  'st. louis, mo': { lat: 38.627, lon: -90.1994, displayName: 'St. Louis, MO' },
};

export async function geocodeLocation(location) {
  const normalized = location.trim().toLowerCase().replace(/\s+/g, ' ');
  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized);
  }

  // Check instant major city lookup first
  if (MAJOR_US_CITIES[normalized]) {
    geocodeCache.set(normalized, MAJOR_US_CITIES[normalized]);
    return MAJOR_US_CITIES[normalized];
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      location
    )}&format=json&limit=1&countrycodes=us,ca`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'FuelSaverMERN/2.0 (fuel-routing-optimizer)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const result = {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          displayName: data[0].display_name || location,
        };
        geocodeCache.set(normalized, result);
        return result;
      }
    }
  } catch {
    // Fall through to local city_coords lookup
  }

  // Fallback to local city_coords.json
  const cityCoords = loadCityCoords();
  const compact = location.replace(/,\s+/, ',').trim();
  for (const [key, val] of Object.entries(cityCoords)) {
    if (key.toLowerCase() === compact.toLowerCase()) {
      const result = { lat: val.lat, lon: val.lon, displayName: location };
      geocodeCache.set(normalized, result);
      return result;
    }
  }

  return null;
}

/**
 * Computes the minimum Euclidean distance (in degrees, matching Shapely LineString.distance)
 * and the normalized projection [0..1] of point (px, py) onto a GeoJSON LineString coordinates array.
 */
function projectPointToPolyline(coords, px, py, cumLengths, totalLength) {
  let minDistSq = Infinity;
  let bestProjLen = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const ax = coords[i][0];
    const ay = coords[i][1];
    const bx = coords[i + 1][0];
    const by = coords[i + 1][1];

    // Fast bounding-box reject against current best distance
    const segMinX = ax < bx ? ax : bx;
    const segMaxX = ax > bx ? ax : bx;
    const segMinY = ay < by ? ay : by;
    const segMaxY = ay > by ? ay : by;

    const dxBox = px < segMinX ? segMinX - px : px > segMaxX ? px - segMaxX : 0;
    const dyBox = py < segMinY ? segMinY - py : py > segMaxY ? py - segMaxY : 0;
    if (dxBox * dxBox + dyBox * dyBox >= minDistSq) continue;

    const vx = bx - ax;
    const vy = by - ay;
    const segLenSq = vx * vx + vy * vy;

    let t = 0;
    if (segLenSq > 0) {
      t = ((px - ax) * vx + (py - ay) * vy) / segLenSq;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }

    const projX = ax + t * vx;
    const projY = ay + t * vy;
    const dx = px - projX;
    const dy = py - projY;
    const distSq = dx * dx + dy * dy;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      const segLen = cumLengths[i + 1] - cumLengths[i];
      bestProjLen = cumLengths[i] + t * segLen;
    }
  }

  return {
    distance: Math.sqrt(minDistSq),
    normalizedProj: totalLength > 0 ? bestProjLen / totalLength : 0,
  };
}

async function fetchOsrmRoute(coordPairs) {
  const waypointsStr = coordPairs.map(([lon, lat]) => `${lon},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FuelSaverMERN/2.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`Routing service responded with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`Could not connect to OSRM routing engine: ${err.message}`);
  }
}

export async function computeOptimalFuelRoute({
  origin,
  destination,
  mpg = 10,
  tankCapacity = 50,
}) {
  const numericMpg = Number(mpg);
  const numericTank = Number(tankCapacity);

  if (!origin || !destination) {
    throw Object.assign(new Error('Origin and destination locations are required.'), { status: 400 });
  }
  if (!Number.isFinite(numericMpg) || numericMpg <= 0 || !Number.isFinite(numericTank) || numericTank <= 0) {
    throw Object.assign(new Error('MPG and tank capacity must be positive numbers.'), { status: 400 });
  }

  const maxRange = numericMpg * numericTank;

  // Geocode origin & destination concurrently
  const [originGeo, destGeo] = await Promise.all([
    geocodeLocation(origin),
    geocodeLocation(destination),
  ]);

  if (!originGeo || !destGeo) {
    const missing = !originGeo && !destGeo ? 'both locations' : !originGeo ? `"${origin}"` : `"${destination}"`;
    throw Object.assign(new Error(`Could not geocode ${missing}. Try "City, ST" format (e.g. "Chicago, IL").`), {
      status: 400,
    });
  }

  // Primary OSRM route
  const routingRes = await fetchOsrmRoute([
    [originGeo.lon, originGeo.lat],
    [destGeo.lon, destGeo.lat],
  ]);

  if (routingRes.code !== 'Ok' || !routingRes.routes?.length) {
    throw Object.assign(new Error('Could not generate a drivable route between these locations.'), {
      status: 400,
    });
  }

  const pathData = routingRes.routes[0];
  let pathGeometry = pathData.geometry;
  let distMiles = pathData.distance * 0.000621371;
  let durationMinutes = Math.round((pathData.duration || 0) / 60);

  const coords = pathGeometry.coordinates;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  const cumLengths = new Float64Array(coords.length);
  for (let i = 0; i < coords.length; i++) {
    const [lon, lat] = coords[i];
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (i > 0) {
      const dx = lon - coords[i - 1][0];
      const dy = lat - coords[i - 1][1];
      cumLengths[i] = cumLengths[i - 1] + Math.sqrt(dx * dx + dy * dy);
    }
  }
  const totalGeomLength = cumLengths[coords.length - 1];

  // Query candidate stations within padded route bounding box
  const stationsInBounds = await findStationsInBounds({
    minLat: minLat - 0.15,
    maxLat: maxLat + 0.15,
    minLon: minLon - 0.15,
    maxLon: maxLon + 0.15,
  });

  // Match stations near the route corridor (try 0.025 deg ~ 1.5mi, widen to 0.12 deg if sparse)
  const buildPotentialStations = (thresholdDeg) => {
    const matches = [];
    for (const st of stationsInBounds) {
      const { distance, normalizedProj } = projectPointToPolyline(
        coords,
        st.lon,
        st.lat,
        cumLengths,
        totalGeomLength
      );
      if (distance < thresholdDeg) {
        matches.push({
          id: st.opis_id,
          name: st.name,
          address: st.address,
          city: st.city,
          state: st.state,
          price: st.retail_price,
          lat: st.lat,
          lon: st.lon,
          dist: normalizedProj * distMiles,
        });
      }
    }
    matches.sort((a, b) => a.dist - b.dist);
    return matches;
  };

  let potentialStations = buildPotentialStations(0.025);

  const checkReachable = (stops) => {
    for (let i = 1; i < stops.length; i++) {
      if (stops[i].dist - stops[i - 1].dist > maxRange) return false;
    }
    return true;
  };

  const buildPathStations = (potentials) => [
    {
      dist: 0,
      price: potentials.length > 0 ? potentials[0].price : 0,
      id: 'origin',
      name: 'Origin',
    },
    ...potentials,
    { dist: distMiles, price: 0, id: 'destination', name: 'Destination' },
  ];

  let pathStations = buildPathStations(potentialStations);
  if (!checkReachable(pathStations)) {
    // Gracefully widen corridor search to ~6 miles off-highway before declaring unreachable
    potentialStations = buildPotentialStations(0.1);
    pathStations = buildPathStations(potentialStations);
  }

  if (!checkReachable(pathStations)) {
    throw Object.assign(
      new Error(
        `Destination is unreachable with ${Math.round(maxRange)} miles range (insufficient geocoded stations along corridor). Try increasing tank capacity or MPG.`
      ),
      { status: 400 }
    );
  }

  // Exact Optimal Greedy Lookahead Fuel Algorithm
  let overallExpense = 0;
  let currIndex = 0;
  let remainingFuelRange = 0;
  const chosenStations = [];

  while (currIndex < pathStations.length - 1) {
    const currStop = pathStations[currIndex];
    let nextCheaperIndex = null;

    for (let k = currIndex + 1; k < pathStations.length; k++) {
      if (pathStations[k].dist - currStop.dist > maxRange) break;
      if (pathStations[k].price < currStop.price) {
        nextCheaperIndex = k;
        break;
      }
    }

    if (nextCheaperIndex !== null) {
      const distToCover = pathStations[nextCheaperIndex].dist - currStop.dist;
      if (remainingFuelRange < distToCover) {
        const gallonsReq = (distToCover - remainingFuelRange) / numericMpg;
        const expense = gallonsReq * currStop.price;
        overallExpense += expense;
        remainingFuelRange = distToCover;
        if (currStop.id !== 'origin' && gallonsReq > 0.01) {
          chosenStations.push({
            station_id: currStop.id,
            name: currStop.name,
            address: currStop.address,
            city: currStop.city,
            state: currStop.state,
            lat: currStop.lat,
            lon: currStop.lon,
            gallons: Number(gallonsReq.toFixed(2)),
            price: Number(currStop.price.toFixed(3)),
            cost: Number(expense.toFixed(2)),
            mile_marker: Math.round(currStop.dist),
          });
        }
      }
      remainingFuelRange -= distToCover;
      currIndex = nextCheaperIndex;
    } else {
      const maxFuelReq = Math.min(maxRange, distMiles - currStop.dist);
      if (remainingFuelRange < maxFuelReq) {
        const gallonsReq = (maxFuelReq - remainingFuelRange) / numericMpg;
        const expense = gallonsReq * currStop.price;
        overallExpense += expense;
        remainingFuelRange = maxFuelReq;
        if (currStop.id !== 'origin' && gallonsReq > 0.01) {
          chosenStations.push({
            station_id: currStop.id,
            name: currStop.name,
            address: currStop.address,
            city: currStop.city,
            state: currStop.state,
            lat: currStop.lat,
            lon: currStop.lon,
            gallons: Number(gallonsReq.toFixed(2)),
            price: Number(currStop.price.toFixed(3)),
            cost: Number(expense.toFixed(2)),
            mile_marker: Math.round(currStop.dist),
          });
        }
      }
      const distToNext = pathStations[currIndex + 1].dist - currStop.dist;
      remainingFuelRange -= distToNext;
      currIndex += 1;
    }
  }

  // Waypoint re-routing through chosen stations for exact detour geometry & mileage
  if (chosenStations.length > 0 && chosenStations.length <= 20) {
    try {
      const waypointCoords = [
        [originGeo.lon, originGeo.lat],
        ...chosenStations.map((s) => [s.lon, s.lat]),
        [destGeo.lon, destGeo.lat],
      ];
      const finalRes = await fetchOsrmRoute(waypointCoords);
      if (finalRes.code === 'Ok' && finalRes.routes?.length) {
        const finalPath = finalRes.routes[0];
        pathGeometry = finalPath.geometry;
        const newDistMiles = finalPath.distance * 0.000621371;
        durationMinutes = Math.round((finalPath.duration || 0) / 60);
        const extraMiles = newDistMiles - distMiles;
        if (extraMiles > 0) {
          const extraGallons = extraMiles / numericMpg;
          const avgChosenPrice =
            chosenStations.reduce((sum, s) => sum + s.price, 0) / chosenStations.length;
          overallExpense += extraGallons * avgChosenPrice;
        }
        distMiles = newDistMiles;
      }
    } catch {
      // Keep original primary route if waypoint re-routing times out
    }
  }

  // Calculate savings benchmark vs route corridor average / 75th-percentile price
  const corridorPrices = potentialStations.map((s) => s.price).sort((a, b) => a - b);
  const corridorAvgPrice =
    corridorPrices.length > 0
      ? corridorPrices.reduce((sum, p) => sum + p, 0) / corridorPrices.length
      : chosenStations.length > 0
      ? chosenStations.reduce((sum, s) => sum + s.price, 0) / chosenStations.length
      : 3.5;

  const p75Price =
    corridorPrices.length > 0
      ? corridorPrices[Math.min(corridorPrices.length - 1, Math.floor(corridorPrices.length * 0.75))]
      : corridorAvgPrice;

  const totalGallons = distMiles / numericMpg;
  const baselineExpense = Math.max(overallExpense, totalGallons * Math.max(corridorAvgPrice, p75Price));
  const estimatedSavings = Math.max(0, baselineExpense - overallExpense);
  const effectiveAvgPrice = totalGallons > 0 ? overallExpense / totalGallons : 0;

  return {
    route: pathGeometry,
    dist_miles: Number(distMiles.toFixed(2)),
    duration_minutes: durationMinutes,
    overall_expense: Number(overallExpense.toFixed(2)),
    baseline_expense: Number(baselineExpense.toFixed(2)),
    estimated_savings: Number(estimatedSavings.toFixed(2)),
    savings_percent:
      baselineExpense > 0 ? Number(((estimatedSavings / baselineExpense) * 100).toFixed(1)) : 0,
    avg_price: Number(effectiveAvgPrice.toFixed(3)),
    corridor_avg_price: Number(corridorAvgPrice.toFixed(3)),
    stations_analyzed: potentialStations.length,
    chosen_stations: chosenStations,
    origin,
    destination,
    originCoords: { lat: originGeo.lat, lon: originGeo.lon },
    destinationCoords: { lat: destGeo.lat, lon: destGeo.lon },
    mpg: numericMpg,
    tank_capacity: numericTank,
  };
}
