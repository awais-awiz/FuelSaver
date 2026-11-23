# FuelSaver — Optimal US Fuel Routing System

Full-stack JavaScript **React + Express + Node.js** application for calculating minimum-cost refueling routes across US interstate corridors, with zero database setup required.

## Features
- **Zero-Database Express API (`server/`)**:
  - **In-Memory OPIS Fuel Station Engine**: Parses `fuel-prices-for-be-assessment.csv` and `city_coords.json` into memory on startup (`6,738` deduplicated OPIS truck stops, instant lookups).
  - **Optimal Fuel Routing Engine** (`POST /api/routes/calculate` & `/api/calculate-path`): Lookahead greedy cost-minimization algorithm in pure JavaScript with polyline projection, OSRM detour routing, and savings estimation.
  - **Live City Autocomplete** (`GET /api/stations/cities?q=...`): Instant search over US hubs + local coordinates enriched with Photon geocoding.
  - **Stateless PDF Fuel Plan Export** (`POST /api/routes/export-pdf`): Generates a formatted driver dispatch PDF (`pdfkit`) directly from the calculated route payload.
- **Interactive React Workspace (`client/`)**:
  - **Corridor Optimizer**: Live city autocomplete, origin/destination swap, equipment presets (Class 8 Semi, Box Truck, Cargo Van), collapsible form bar with prominent `Edit Route`, cost/savings summary, and step-by-step refueling pathway.
  - **Auto-Synced Esri Map (`Leaflet`)**: Automatically switches between `Streets` (light) and `Dark` (dark) with manual `Streets / Clean / Dark / Satellite` overrides, numbered fuel stop markers, and click-to-zoom.

## Setup & Running Locally

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Start development servers** (Express on `http://localhost:4000`, React Vite on `http://localhost:5174`):
   ```bash
   npm run dev
   ```

## Single-Service Production Deployment

Express serves the built React app (`client/dist`) automatically, so you can deploy the entire app as one Node.js service (Render, Railway, Fly.io) with no external database:

- **Build command:** `npm run install:all && npm run build`
- **Start command:** `npm start`
