import React, { useEffect, useState } from 'react';
import { Database, Flame, MapPin, Activity } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import PlannerPanel from '../components/PlannerPanel.jsx';
import RouteMap from '../components/RouteMap.jsx';
import { api } from '../services/api.js';

export default function HomePage() {
  const [routeResult, setRouteResult] = useState(null);
  const [selectedStationIndex, setSelectedStationIndex] = useState(null);
  const [stationStats, setStationStats] = useState(null);

  useEffect(() => {
    api
      .getStationStats()
      .then(setStationStats)
      .catch(() => {});
  }, []);

  const handleRouteCalculated = (data) => {
    setRouteResult(data);
    setSelectedStationIndex(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-stone-50 dark:bg-stone-950">
      <Navbar />

      {/* Live Network Telemetry Strip */}
      <div className="hidden sm:flex items-center justify-between px-6 py-2 bg-stone-900 dark:bg-stone-900/90 text-stone-300 border-b border-stone-800 text-xs shrink-0">
        <div className="flex items-center gap-6 overflow-x-auto">
          <span className="inline-flex items-center gap-1.5 font-medium text-white whitespace-nowrap">
            <Activity className="w-3.5 h-3.5 text-orange-500" />
            OPIS Live Pricing Feed
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
            <Database className="w-3.5 h-3.5 text-stone-400" />
            <strong className="text-white">
              {stationStats ? stationStats.totalStations.toLocaleString() : '6,738'}
            </strong>{' '}
            truck stops
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            <strong className="text-white">
              {stationStats ? stationStats.geocodedStations.toLocaleString() : '1,567'}
            </strong>{' '}
            GPS corridors
          </span>
          {stationStats?.avgPrice ? (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              US Avg <strong className="text-amber-300">${stationStats.avgPrice.toFixed(3)}/gal</strong>
              <span className="text-stone-500">|</span>
              Lowest{' '}
              <strong className="text-orange-400">${stationStats.minPrice.toFixed(3)}/gal</strong>
              {stationStats.cheapestStation && (
                <span className="text-stone-400">
                  ({stationStats.cheapestStation.city}, {stationStats.cheapestStation.state})
                </span>
              )}
            </span>
          ) : null}
        </div>
        <div className="hidden xl:flex items-center gap-2 text-[11px] text-stone-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Engine: OSRM + Lookahead Cost Minimization
        </div>
      </div>

      {/* Main Split Operational Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className="w-full lg:w-[460px] xl:w-[490px] shrink-0 h-[52vh] lg:h-full overflow-hidden">
          <PlannerPanel
            routeResult={routeResult}
            onRouteCalculated={handleRouteCalculated}
            onSelectStation={(idx) => setSelectedStationIndex(idx)}
            selectedStationIndex={selectedStationIndex}
          />
        </div>
        <div className="flex-1 min-h-[320px] lg:h-full relative">
          <RouteMap routeResult={routeResult} focusedStationIndex={selectedStationIndex} />
        </div>
      </div>
    </div>
  );
}
