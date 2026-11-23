import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Maximize2, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const MAP_STYLES = {
  streets: {
    label: 'Streets',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri',
        maxZoom: 19,
      },
    ],
  },
  clean: {
    label: 'Clean',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri',
        maxZoom: 16,
      },
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        attribution: '',
        maxZoom: 16,
      },
    ],
  },
  dark: {
    label: 'Dark',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri',
        maxZoom: 16,
      },
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        attribution: '',
        maxZoom: 16,
      },
    ],
  },
  satellite: {
    label: 'Satellite',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri',
        maxZoom: 19,
      },
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        attribution: '',
        maxZoom: 19,
      },
    ],
  },
};

export default function RouteMap({ routeResult, focusedStationIndex }) {
  const { isDark } = useTheme();
  const [mapStyle, setMapStyle] = useState(null);
  const activeStyleKey = mapStyle || (isDark ? 'dark' : 'streets');

  // Automatically sync map style whenever user toggles app Light/Dark mode
  useEffect(() => {
    setMapStyle(null);
  }, [isDark]);

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileGroupRef = useRef(null);
  const routeGroupRef = useRef(null);
  const stationMarkersRef = useRef([]);
  const routeBoundsRef = useRef(null);

  // Initialize Leaflet map once (StrictMode-safe)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      preferCanvas: true,
    }).setView([39.5, -96.5], 4);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    tileGroupRef.current = L.layerGroup().addTo(map);
    routeGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      tileGroupRef.current = null;
      routeGroupRef.current = null;
    };
  }, []);

  // Load Esri tiles for active style
  useEffect(() => {
    const tileGroup = tileGroupRef.current;
    if (!tileGroup) return;

    tileGroup.clearLayers();
    const styleDef = MAP_STYLES[activeStyleKey] || MAP_STYLES.streets;
    styleDef.layers.forEach((layerCfg) => {
      L.tileLayer(layerCfg.url, {
        attribution: layerCfg.attribution,
        maxZoom: layerCfg.maxZoom,
      }).addTo(tileGroup);
    });
  }, [activeStyleKey]);

  // Render route polyline & non-overlapping markers
  useEffect(() => {
    const map = mapRef.current;
    const group = routeGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    stationMarkersRef.current = [];
    routeBoundsRef.current = null;

    if (!routeResult?.route) return;

    const isDarkMap = activeStyleKey === 'dark' || activeStyleKey === 'satellite';

    // Crisp outer casing for high contrast
    L.geoJSON(routeResult.route, {
      style: {
        color: isDarkMap ? '#1C1917' : '#FFFFFF',
        weight: 9,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      },
    }).addTo(group);

    // Signal-Orange primary corridor line
    const mainLine = L.geoJSON(routeResult.route, {
      style: {
        color: isDarkMap ? '#FB923C' : '#EA580C',
        weight: 5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      },
    }).addTo(group);

    const coords = routeResult.route.coordinates || [];
    const originLatLng = routeResult.originCoords
      ? [routeResult.originCoords.lat, routeResult.originCoords.lon]
      : coords.length
      ? [coords[0][1], coords[0][0]]
      : null;

    const destLatLng = routeResult.destinationCoords
      ? [routeResult.destinationCoords.lat, routeResult.destinationCoords.lon]
      : coords.length
      ? [coords[coords.length - 1][1], coords[coords.length - 1][0]]
      : null;

    if (originLatLng) {
      const originIcon = L.divIcon({
        className: 'fs-pin-origin',
        html: `<div style="width:15px;height:15px;border-radius:9999px;background:#F59E0B;border:2.5px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
        iconSize: [15, 15],
        iconAnchor: [7, 7],
      });
      L.marker(originLatLng, { icon: originIcon })
        .bindPopup(
          `<div style="padding:10px 12px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#D97706;margin-bottom:2px;">Origin</div>
            <div style="font-size:13px;font-weight:700;">${routeResult.origin}</div>
          </div>`
        )
        .addTo(group);
    }

    if (destLatLng) {
      const destIcon = L.divIcon({
        className: 'fs-pin-dest',
        html: `<div style="width:15px;height:15px;border-radius:9999px;background:#DC2626;border:2.5px solid #FFFFFF;box-shadow:0 2px 6px rgba(220,38,38,0.45);"></div>`,
        iconSize: [15, 15],
        iconAnchor: [7, 7],
      });
      L.marker(destLatLng, { icon: destIcon })
        .bindPopup(
          `<div style="padding:10px 12px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#DC2626;margin-bottom:2px;">Destination</div>
            <div style="font-size:13px;font-weight:700;">${routeResult.destination}</div>
          </div>`
        )
        .addTo(group);
    }

    // Crisp numbered Charcoal + Orange fuel stop pins
    const stations = routeResult.chosen_stations || [];
    stations.forEach((station, idx) => {
      if (station.lat == null || station.lon == null) return;

      const pinIcon = L.divIcon({
        className: 'fs-pin-stop',
        html: `<div style="width:26px;height:26px;border-radius:9999px;background:#1C1917;color:#FFFFFF;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2.5px solid #F97316;box-shadow:0 3px 10px rgba(0,0,0,0.38);">${
          idx + 1
        }</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([station.lat, station.lon], { icon: pinIcon }).addTo(group);
      marker.bindTooltip(`$${Number(station.price).toFixed(3)}/gal · ${station.city}`, {
        direction: 'top',
        offset: [0, -13],
      });

      const popupHtml = `
        <div style="padding:12px 14px;min-width:215px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#EA580C;">Stop #${
              idx + 1
            }${station.mile_marker ? ` · Mile ${station.mile_marker}` : ''}</span>
            <span style="font-size:11px;font-weight:800;color:#B45309;background:#FEF3C7;padding:1px 6px;border-radius:4px;">$${Number(
              station.price
            ).toFixed(3)}/gal</span>
          </div>
          <div style="font-size:13px;font-weight:700;margin-bottom:2px;">${station.name}</div>
          <div style="font-size:11px;color:#78716C;margin-bottom:8px;">${
            station.address ? `${station.address}, ` : ''
          }${station.city}, ${station.state}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid #E7E5E4;font-size:12px;">
            <span style="color:#57534E;">Pump <strong>${Number(station.gallons).toFixed(1)} gal</strong></span>
            <span style="font-weight:800;color:#EA580C;">$${Number(station.cost).toFixed(2)}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { offset: [0, -12] });
      stationMarkersRef.current[idx] = marker;
    });

    const bounds = mainLine.getBounds();
    if (bounds.isValid()) {
      routeBoundsRef.current = bounds;
      // On mobile screens (< 1024px), bottom sheet covers the lower 40-50% of the screen.
      // Pad the bottom significantly so the route centers in the visible upper half!
      const isMobile = window.innerWidth < 1024;
      const paddingOptions = isMobile
        ? { paddingTopLeft: [40, 40], paddingBottomRight: [40, Math.round(window.innerHeight * 0.45)] }
        : { padding: [60, 60] };

      map.fitBounds(bounds, paddingOptions);
    }
  }, [routeResult, activeStyleKey]);

  // Smooth fly-to when user clicks a station card
  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      focusedStationIndex === null ||
      focusedStationIndex === undefined ||
      !routeResult?.chosen_stations?.[focusedStationIndex]
    ) {
      return;
    }

    const station = routeResult.chosen_stations[focusedStationIndex];
    const marker = stationMarkersRef.current[focusedStationIndex];
    if (station.lat != null && station.lon != null) {
      map.flyTo([station.lat, station.lon], 11, { duration: 0.75 });
      setTimeout(() => {
        marker?.openPopup();
      }, 750);
    }
  }, [focusedStationIndex, routeResult]);

  const handleFitBounds = () => {
    if (mapRef.current && routeBoundsRef.current) {
      const isMobile = window.innerWidth < 1024;
      const paddingOptions = isMobile
        ? { paddingTopLeft: [40, 40], paddingBottomRight: [40, Math.round(window.innerHeight * 0.45)] }
        : { padding: [60, 60] };
      mapRef.current.fitBounds(routeBoundsRef.current, paddingOptions);
    }
  };

  return (
    <div className="relative w-full h-full bg-stone-200 dark:bg-stone-900">
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* Top-Left Active Corridor HUD Pill */}
      {routeResult && (
        <div className="hidden sm:flex absolute top-3.5 left-3.5 z-[400] items-center gap-3 bg-stone-900/95 text-white backdrop-blur-md border border-stone-700/80 rounded-xl px-4 py-2 shadow-xl text-xs">
          <span className="font-bold flex items-center gap-1.5">
            {routeResult.origin}
            <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
            {routeResult.destination}
          </span>
          <span className="text-stone-500">|</span>
          <span className="tabular-nums text-stone-300">
            {Math.round(routeResult.dist_miles || 0).toLocaleString()} mi
          </span>
          <span className="text-stone-500">|</span>
          <span className="font-mono font-bold text-amber-400 tabular-nums">
            ${Number(routeResult.overall_expense || 0).toFixed(2)}
          </span>
        </div>
      )}

      {/* Top-Right Style Switcher */}
      <div className="absolute top-3.5 right-3.5 z-[400] flex items-center bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl p-1 shadow-md">
        {Object.entries(MAP_STYLES).map(([key, cfg]) => {
          const active = activeStyleKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setMapStyle(key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Bottom-Left Legend + Fit Route */}
      {routeResult && (
        <div className="absolute bottom-4 left-4 z-[400] flex items-center gap-2">
          <div className="flex items-center gap-3.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl px-3.5 py-2 shadow-md text-xs font-medium text-stone-700 dark:text-stone-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Origin
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-orange-500" />
              Fuel Stop ({routeResult.chosen_stations?.length || 0})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              Destination
            </span>
          </div>

          <button
            onClick={handleFitBounds}
            className="inline-flex items-center gap-1.5 bg-white/95 dark:bg-stone-900/95 hover:bg-orange-600 hover:text-white border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 shadow-md text-xs font-semibold text-stone-700 dark:text-stone-200 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Reset view
          </button>
        </div>
      )}
    </div>
  );
}
