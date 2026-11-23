import React, { useState, useRef } from 'react';
import {
  ArrowUpDown,
  Download,
  AlertCircle,
  Loader2,
  Check,
  Clock,
  Truck,
  Navigation,
  Fuel,
  Gauge,
  Route as RouteIcon,
  Pencil,
  ChevronUp,
  ArrowRight,
  Package,
  CarFront,
} from 'lucide-react';
import { api } from '../services/api.js';
import LocationInput from './LocationInput.jsx';

const VEHICLE_PRESETS = [
  {
    id: 'semi',
    label: 'Class 8 Semi',
    sub: '6.5 MPG · 150 gal',
    range: 975,
    mpg: 6.5,
    tank: 150,
    icon: Truck,
  },
  {
    id: 'box',
    label: 'Box Truck',
    sub: '10 MPG · 50 gal',
    range: 500,
    mpg: 10,
    tank: 50,
    icon: Package,
  },
  {
    id: 'van',
    label: 'Cargo Van',
    sub: '18 MPG · 25 gal',
    range: 450,
    mpg: 18,
    tank: 25,
    icon: CarFront,
  },
];

const QUICK_ROUTES = [
  { label: 'NYC → Chicago', origin: 'New York, NY', destination: 'Chicago, IL' },
  { label: 'LA → Dallas', origin: 'Los Angeles, CA', destination: 'Dallas, TX' },
  { label: 'Seattle → Denver', origin: 'Seattle, WA', destination: 'Denver, CO' },
  { label: 'Atlanta → Miami', origin: 'Atlanta, GA', destination: 'Miami, FL' },
];

function formatDuration(minutes) {
  if (!minutes) return '--';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function PlannerPanel({
  routeResult,
  onRouteCalculated,
  onSelectStation,
  selectedStationIndex,
}) {
  const [origin, setOrigin] = useState('New York, NY');
  const [destination, setDestination] = useState('Chicago, IL');
  const [mpg, setMpg] = useState(10);
  const [tankCapacity, setTankCapacity] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [formExpanded, setFormExpanded] = useState(true);
  const scrollContainerRef = useRef(null);

  const maxRange = Math.round((Number(mpg) || 0) * (Number(tankCapacity) || 0));

  const runCalculation = async (
    orig = origin,
    dest = destination,
    vMpg = mpg,
    vTank = tankCapacity
  ) => {
    if (!orig.trim() || !dest.trim()) {
      setError('Enter both origin and destination.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.calculateRoute({
        origin: orig.trim(),
        destination: dest.trim(),
        mpg: Number(vMpg),
        tank_capacity: Number(vTank),
      });
      onRouteCalculated(data);
      setFormExpanded(false);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Could not compute route.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runCalculation();
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleDownloadPdf = async () => {
    if (!routeResult) return;
    setDownloadingPdf(true);
    try {
      await api.downloadRoutePdf(routeResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const stopCount = routeResult?.chosen_stations?.length || 0;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800">
      {/* Prominent Pinned Route Bar when results are shown */}
      {routeResult && !formExpanded && (
        <div className="px-5 py-4 border-b-2 border-orange-500/25 dark:border-orange-500/30 bg-white dark:bg-stone-900 shadow-sm flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-0.5">
              Active Route
            </div>
            <div className="flex items-center gap-2 text-[15px] sm:text-base font-extrabold text-stone-900 dark:text-white truncate">
              <span className="truncate">{routeResult.origin}</span>
              <ArrowRight className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="truncate">{routeResult.destination}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 tabular-nums">
              <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
                {mpg} MPG
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
                {tankCapacity} gal
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-900 dark:bg-stone-800 text-amber-400">
                {maxRange} mi range
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFormExpanded(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-md shadow-orange-600/25 transition-all"
          >
            <Pencil className="w-4 h-4" />
            Edit Route
          </button>
        </div>
      )}

      {/* Scrollable Dispatch Console */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {formExpanded && (
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 space-y-5 bg-stone-50/60 dark:bg-stone-900/30"
        >
          {/* Section Title */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="font-display font-bold text-lg text-stone-900 dark:text-stone-100 tracking-tight">
                Corridor Optimizer
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                Find the lowest-cost diesel stops along your US route.
              </p>
            </div>
            {routeResult && (
              <button
                type="button"
                onClick={() => setFormExpanded(false)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-orange-400 text-xs font-semibold transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                View Plan
              </button>
            )}
          </div>

          {/* Origin & Destination Card with Live Autocomplete */}
          <div className="relative rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 shadow-sm divide-y divide-stone-200 dark:divide-stone-800 focus-within:border-orange-500 transition-colors">
            <LocationInput
              label="Origin"
              value={origin}
              onChange={setOrigin}
              placeholder="Search city or state (e.g. New York, NY)"
              dotClassName="bg-amber-500 ring-4 ring-amber-500/15"
            />
            <LocationInput
              label="Destination"
              value={destination}
              onChange={setDestination}
              placeholder="Search city or state (e.g. Chicago, IL)"
              dotClassName="bg-red-600 ring-4 ring-red-600/15"
              paddingRight="pr-10"
            />

            <button
              type="button"
              onClick={handleSwap}
              title="Swap origin and destination"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-orange-600 hover:border-orange-400 flex items-center justify-center transition-all shadow-sm"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Freight Lanes */}
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_ROUTES.map((qr) => (
              <button
                key={qr.label}
                type="button"
                disabled={loading}
                onClick={() => {
                  setOrigin(qr.origin);
                  setDestination(qr.destination);
                  runCalculation(qr.origin, qr.destination, mpg, tankCapacity);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                {qr.label}
              </button>
            ))}
          </div>

          {/* Equipment Profile + Black Max Range Pill */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                <Truck className="w-4 h-4 text-orange-600" />
                Equipment Profile
              </span>
              <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold bg-stone-900 dark:bg-stone-800 text-white px-3 py-1 rounded-lg shadow-sm tabular-nums">
                <span className="text-[11px] font-sans font-medium text-stone-300">Max Range</span>
                <span className="text-amber-400 font-bold text-sm">{maxRange} mi</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {VEHICLE_PRESETS.map((p) => {
                const Icon = p.icon;
                const active = Number(mpg) === p.mpg && Number(tankCapacity) === p.tank;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setMpg(p.mpg);
                      setTankCapacity(p.tank);
                    }}
                    className={`relative p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-2 ${
                      active
                        ? 'bg-orange-50/80 dark:bg-orange-500/15 border-orange-500 ring-2 ring-orange-500/20 shadow-sm'
                        : 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-stone-700 hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          active
                            ? 'bg-orange-600 text-white'
                            : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      {active && (
                        <span className="w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div
                        className={`text-[13px] font-bold leading-tight ${
                          active
                            ? 'text-orange-800 dark:text-orange-200'
                            : 'text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        {p.label}
                      </div>
                      <div
                        className={`inline-block text-xs font-mono font-bold tabular-nums mt-1.5 px-2 py-0.5 rounded-md ${
                          active
                            ? 'bg-stone-900 text-amber-400'
                            : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        {p.range} mi
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 focus-within:border-orange-500">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400">
                  <Gauge className="w-4 h-4 text-stone-400" />
                  MPG
                </span>
                <input
                  type="number"
                  min="1"
                  max="150"
                  step="0.5"
                  value={mpg}
                  onChange={(e) => setMpg(e.target.value)}
                  className="w-16 text-right text-[15px] font-bold tabular-nums bg-transparent outline-none text-stone-900 dark:text-stone-100"
                />
              </label>
              <label className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 focus-within:border-orange-500">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400">
                  <Fuel className="w-4 h-4 text-stone-400" />
                  Tank (gal)
                </span>
                <input
                  type="number"
                  min="5"
                  max="500"
                  step="1"
                  value={tankCapacity}
                  onChange={(e) => setTankCapacity(e.target.value)}
                  className="w-16 text-right text-[15px] font-bold tabular-nums bg-transparent outline-none text-stone-900 dark:text-stone-100"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-[15px] font-bold shadow-md shadow-orange-600/25 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Optimizing Route &amp; Fuel Stops...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                Calculate Optimal Route
              </>
            )}
          </button>
        </form>
        )}

        {/* Results Section */}
        <div className="p-5 sm:p-6">
          {loading && (
            <div className="py-12 text-center">
              <Loader2 className="w-7 h-7 animate-spin text-orange-600 mx-auto mb-3" />
              <p className="text-base font-semibold text-stone-800 dark:text-stone-200">
                Analyzing highway corridor
              </p>
              <p className="text-sm text-stone-500 mt-1">
                Computing minimum-cost refueling stops from live OPIS data...
              </p>
            </div>
          )}

          {!loading && !routeResult && (
            <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-800 p-5 bg-stone-50/70 dark:bg-stone-900/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <RouteIcon className="w-5 h-5" />
                </div>
                <div className="text-[15px] font-bold text-stone-900 dark:text-stone-100">
                  Ready to Dispatch
                </div>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Pick a US freight lane above or search any origin and destination to generate a
                stop-by-stop fueling plan and PDF itinerary.
              </p>
            </div>
          )}

          {!loading && routeResult && (
            <div className="space-y-5">
              {/* Executive Charcoal Summary Card */}
              <div className="rounded-2xl bg-stone-900 dark:bg-stone-900 text-white p-5 shadow-lg border border-stone-800">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-800">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                      Optimized Fuel Cost
                    </div>
                    <div className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums mt-1">
                      ${Number(routeResult.overall_expense || 0).toFixed(2)}
                    </div>
                    {routeResult.avg_price > 0 && (
                      <div className="text-xs text-stone-300 mt-1 tabular-nums">
                        Effective rate: <strong>${Number(routeResult.avg_price).toFixed(3)}/gal</strong>
                      </div>
                    )}
                  </div>

                  <div className="text-right bg-orange-500/15 border border-orange-500/35 rounded-xl px-3.5 py-2.5 shrink-0">
                    <div className="text-xs font-semibold text-orange-200">Est. Savings</div>
                    <div className="text-xl font-extrabold text-amber-400 tabular-nums mt-0.5">
                      ${Number(routeResult.estimated_savings || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-orange-200/90 tabular-nums">
                      {routeResult.savings_percent || 0}% below avg
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4">
                  <div>
                    <div className="text-xs text-stone-400 font-medium">Distance</div>
                    <div className="text-[15px] font-bold text-white tabular-nums mt-1">
                      {Math.round(routeResult.dist_miles || 0).toLocaleString()} mi
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-400 font-medium">Drive Time</div>
                    <div className="text-[15px] font-bold text-white tabular-nums mt-1 inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {formatDuration(routeResult.duration_minutes)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-400 font-medium">Fuel Stops</div>
                    <div className="text-[15px] font-bold text-white tabular-nums mt-1">
                      {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prominent Download PDF Action Card */}
              <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-orange-50/80 dark:bg-orange-500/10 border border-orange-200/90 dark:border-orange-500/30">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-stone-900 dark:text-stone-100">
                    <Check className="w-4 h-4 text-orange-600 shrink-0" />
                    Driver Fuel Plan Ready
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                    Printable stop-by-stop itinerary &amp; cost sheet
                  </p>
                </div>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-500 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {downloadingPdf ? 'Generating...' : 'Download PDF'}
                </button>
              </div>

              {/* Step-by-Step Route & Refueling Pathway */}
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    Step-by-Step Route Pathway
                  </h3>
                  <span className="text-xs text-stone-500">Click any stop to view on map</span>
                </div>

                <div className="space-y-0">
                  {/* START: Origin Node */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800">
                    <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-extrabold flex items-center justify-center shrink-0 shadow-sm">
                      A
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Start · Mile 0
                      </div>
                      <div className="text-[15px] font-bold text-stone-900 dark:text-stone-100 truncate">
                        {routeResult.origin}
                      </div>
                    </div>
                  </div>

                  {/* Stops with Leg Distance Connectors */}
                  {stopCount === 0 ? (
                    <div className="flex items-center gap-3 pl-3 py-2.5">
                      <div className="w-0.5 h-7 bg-stone-300 dark:bg-stone-700 ml-[13px]" />
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-900 px-2.5 py-1 rounded-full tabular-nums">
                        Direct drive · {Math.round(routeResult.dist_miles || 0).toLocaleString()} mi (no stops needed)
                      </span>
                    </div>
                  ) : (
                    routeResult.chosen_stations.map((station, idx) => {
                      const active = selectedStationIndex === idx;
                      const prevMile =
                        idx === 0 ? 0 : routeResult.chosen_stations[idx - 1].mile_marker || 0;
                      const currMile = station.mile_marker || 0;
                      const legMiles = Math.max(0, Math.round(currMile - prevMile));
                      const fillRatio =
                        Number(tankCapacity) > 0
                          ? Number(station.gallons) / Number(tankCapacity)
                          : 0;
                      const fillLabel = fillRatio >= 0.85 ? 'Full Tank' : 'Top-Up';

                      return (
                        <React.Fragment key={`${station.station_id}-${idx}`}>
                          {/* Leg Connector */}
                          <div className="flex items-center gap-3 pl-3 py-2">
                            <div className="w-0.5 h-6 bg-stone-300 dark:bg-stone-700 ml-[13px]" />
                            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-900 px-2.5 py-0.5 rounded-full tabular-nums">
                              Drive {legMiles.toLocaleString()} mi
                            </span>
                          </div>

                          {/* Fuel Stop Card */}
                          <button
                            type="button"
                            onClick={() => onSelectStation(idx)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${
                              active
                                ? 'bg-orange-50/80 dark:bg-orange-500/10 border-orange-500 shadow-sm'
                                : 'bg-white dark:bg-stone-900/80 border-stone-200 dark:border-stone-800 hover:border-orange-400'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-7 h-7 rounded-full bg-orange-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                    Fuel Stop {idx + 1} · Mile {currMile.toLocaleString()}
                                  </span>
                                  <span
                                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                      fillRatio >= 0.85
                                        ? 'bg-stone-900 dark:bg-stone-800 text-amber-400'
                                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300'
                                    }`}
                                  >
                                    {fillLabel}
                                  </span>
                                </div>

                                <div className="text-[15px] font-bold text-stone-900 dark:text-stone-100 mt-0.5 leading-snug">
                                  {station.name}
                                </div>

                                <div className="text-[13px] text-stone-600 dark:text-stone-400 mt-0.5">
                                  {station.city}, {station.state}
                                  {station.address ? ` — ${station.address}` : ''}
                                </div>

                                {/* Clear 3-Column Fuel Breakdown */}
                                <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
                                  <div>
                                    <div className="text-[11px] text-stone-500 font-medium">
                                      Price / Gal
                                    </div>
                                    <div className="text-sm font-mono font-bold text-amber-800 dark:text-amber-300 tabular-nums mt-0.5">
                                      ${Number(station.price).toFixed(3)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-stone-500 font-medium">
                                      Pump Fuel
                                    </div>
                                    <div className="text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums mt-0.5">
                                      +{Number(station.gallons).toFixed(1)} gal
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[11px] text-stone-500 font-medium">
                                      Stop Cost
                                    </div>
                                    <div className="text-sm font-extrabold text-stone-900 dark:text-white tabular-nums mt-0.5">
                                      ${Number(station.cost).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        </React.Fragment>
                      );
                    })
                  )}

                  {/* Final Leg Connector (only if there were stops) */}
                  {stopCount > 0 && (
                    <div className="flex items-center gap-3 pl-3 py-2">
                      <div className="w-0.5 h-6 bg-stone-300 dark:bg-stone-700 ml-[13px]" />
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-900 px-2.5 py-0.5 rounded-full tabular-nums">
                        Drive{' '}
                        {Math.max(
                          0,
                          Math.round(
                            (routeResult.dist_miles || 0) -
                              (routeResult.chosen_stations[stopCount - 1]?.mile_marker || 0)
                          )
                        ).toLocaleString()}{' '}
                        mi to destination
                      </span>
                    </div>
                  )}

                  {/* FINISH: Destination Node */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800">
                    <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0 shadow-sm">
                      B
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        Arrive · Mile {Math.round(routeResult.dist_miles || 0).toLocaleString()}
                      </div>
                      <div className="text-[15px] font-bold text-stone-900 dark:text-stone-100 truncate">
                        {routeResult.destination}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
