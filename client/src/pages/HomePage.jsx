import React, { useEffect, useState } from 'react';
import { Database, Flame, MapPin, Activity, ChevronUp, ChevronDown, SlidersHorizontal, Map } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import PlannerPanel from '../components/PlannerPanel.jsx';
import RouteMap from '../components/RouteMap.jsx';
import { api } from '../services/api.js';

export default function HomePage() {
  const [routeResult, setRouteResult] = useState(null);
  const [selectedStationIndex, setSelectedStationIndex] = useState(null);
  const [stationStats, setStationStats] = useState(null);
  
  // Mobile bottom sheet state: 'preview' (compact ~80px preview) | 'half' (~50vh) | 'expanded' (~88vh)
  const [sheetState, setSheetState] = useState('half');

  useEffect(() => {
    api
      .getStationStats()
      .then(setStationStats)
      .catch(() => {});
  }, []);

  const handleRouteCalculated = (data) => {
    setRouteResult(data);
    setSelectedStationIndex(null);
    // After calculating, keep half open to see summary + map, or user can expand
    setSheetState('half');
  };

  const cycleSheetState = () => {
    setSheetState((prev) => {
      if (prev === 'preview') return 'half';
      if (prev === 'half') return 'expanded';
      return 'preview';
    });
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

      {/* Main Operational Workspace */}
      <div className="flex-1 relative flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* Desktop Side Panel (Visible only on lg and above) */}
        <div className="hidden lg:block w-[460px] xl:w-[490px] shrink-0 h-full overflow-hidden border-r border-stone-200 dark:border-stone-800 z-10">
          <PlannerPanel
            routeResult={routeResult}
            onRouteCalculated={handleRouteCalculated}
            onSelectStation={(idx) => setSelectedStationIndex(idx)}
            selectedStationIndex={selectedStationIndex}
          />
        </div>

        {/* Map Canvas: 100% full screen on mobile, fills remaining width on desktop */}
        <div className="w-full h-full flex-1 relative z-0">
          <RouteMap routeResult={routeResult} focusedStationIndex={selectedStationIndex} />
        </div>

        {/* Mobile / Tablet Bottom Sheet Drawer (Visible only on screens < lg) */}
        <div
          className={`lg:hidden absolute left-0 right-0 bottom-0 z-30 transition-all duration-300 ease-out flex flex-col bg-white dark:bg-stone-950 rounded-t-2xl shadow-2xl border-t border-stone-200 dark:border-stone-800 ${
            sheetState === 'preview'
              ? 'h-16'
              : sheetState === 'half'
              ? 'h-[50vh]'
              : 'h-[86vh]'
          }`}
        >
          {/* Drawer Drag Bar / Header */}
          <div
            onClick={cycleSheetState}
            className="w-full py-2.5 px-4 flex items-center justify-between cursor-pointer select-none bg-stone-50 dark:bg-stone-900/90 rounded-t-2xl border-b border-stone-200/70 dark:border-stone-800 shrink-0 hover:bg-stone-100 dark:hover:bg-stone-800/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-1 rounded-full bg-stone-300 dark:bg-stone-600 block mr-1" />
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 tracking-tight">
                {routeResult
                  ? `Route Plan (${routeResult.fuelStops?.length || 0} stops • $${routeResult.totalCost?.toFixed(2) || '0'})`
                  : 'Trip Planner & Stations'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs font-semibold">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                {sheetState === 'preview' ? 'Tap to open' : sheetState === 'half' ? 'Tap for full' : 'Tap to minimize'}
              </span>
              {sheetState === 'expanded' ? (
                <ChevronDown className="w-4 h-4 text-stone-600 dark:text-stone-300" />
              ) : (
                <ChevronUp className="w-4 h-4 text-stone-600 dark:text-stone-300" />
              )}
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <PlannerPanel
              routeResult={routeResult}
              onRouteCalculated={handleRouteCalculated}
              onSelectStation={(idx) => {
                setSelectedStationIndex(idx);
                // When selecting a station to inspect on map, snap to preview or half so map is visible
                setSheetState('half');
              }}
              selectedStationIndex={selectedStationIndex}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
