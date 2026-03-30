import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getColor, getLabel } from '../utils/colors';
import { fetchClusters } from '../utils/api';

function createIcon(index) {
  const color = getColor(index);
  const size = 32;
  return L.divIcon({
    className: '',
    html: `<div class="pollution-marker" style="background:${color}; width:${size}px; height:${size}px; --marker-glow:${color}40;">${Math.round(index)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createClusterIcon(avgIndex, count) {
  const color = getColor(avgIndex);
  // Size scales with number of stations
  const size = Math.min(60, 40 + count * 2);
  return L.divIcon({
    className: '',
    html: `<div class="cluster-marker" style="background:${color}; width:${size}px; height:${size}px;">
      <span class="cluster-avg">${Math.round(avgIndex)}</span>
      <span class="cluster-count">${count}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// FlyTo animation handler
function FlyToHandler({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [flyTo, map]);
  return null;
}

// Loads clusters from server on map move/zoom and filter changes
function ClusterLoader({ filters, onDataLoaded }) {
  const map = useMap();
  const timerRef = useRef(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const loadData = useCallback(() => {
    const bounds = map.getBounds();
    if (!bounds || !bounds.isValid()) return;

    const zoom = map.getZoom();
    const bbox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    fetchClusters({ zoom, bbox, ...filtersRef.current })
      .then(data => onDataLoaded(data.data))
      .catch(err => console.error('[Map] Cluster fetch error:', err));
  }, [map, onDataLoaded]);

  // On map move/zoom — debounced
  useEffect(() => {
    function onMoveEnd() {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(loadData, 150);
    }

    map.on('moveend', onMoveEnd);
    // Initial load
    loadData();

    return () => {
      map.off('moveend', onMoveEnd);
      clearTimeout(timerRef.current);
    };
  }, [map, loadData]);

  // Reload when filters change
  useEffect(() => {
    loadData();
  }, [filters, loadData]);

  return null;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StationPopup({ station }) {
  const color = getColor(station.avg_index);
  const label = getLabel(station.avg_index);

  return (
    <div className="station-popup">
      <h3>{station.name}</h3>
      <div className="popup-type">
        {station.commune} — Station {station.type_implantation.toLowerCase()}
      </div>

      <div className="popup-index-card" style={{ background: color }}>
        <div className="popup-index-value">{Math.round(station.avg_index)}<span style={{ fontSize: 14, fontWeight: 400 }}> / 100</span></div>
        <div className="popup-index-label">Indice de pollution : {label}</div>
      </div>

      <div className="popup-section-title">Polluants (moyenne)</div>
      <div className="popup-grid">
        <div className="popup-metric">
          <div className="popup-metric-label">PM2.5 — Particules fines</div>
          <div className="popup-metric-value">{station.avg_pm25} µg/m³</div>
        </div>
        <div className="popup-metric">
          <div className="popup-metric-label">PM10 — Particules</div>
          <div className="popup-metric-value">{station.avg_pm10} µg/m³</div>
        </div>
        <div className="popup-metric">
          <div className="popup-metric-label">NO₂ — Dioxyde d'azote</div>
          <div className="popup-metric-value">{station.avg_no2} µg/m³</div>
        </div>
        <div className="popup-metric">
          <div className="popup-metric-label">O₃ — Ozone</div>
          <div className="popup-metric-value">{station.avg_o3} µg/m³</div>
        </div>
      </div>

      <div className="popup-section-title">Conditions meteo (moyenne)</div>
      <div className="popup-grid">
        <div className="popup-metric">
          <div className="popup-metric-label">Temperature</div>
          <div className="popup-metric-value">{station.avg_temperature} °C</div>
        </div>
        <div className="popup-metric">
          <div className="popup-metric-label">Humidite relative</div>
          <div className="popup-metric-value">{station.avg_humidity} %</div>
        </div>
        <div className="popup-metric">
          <div className="popup-metric-label">Vitesse du vent</div>
          <div className="popup-metric-value">{station.avg_wind_speed} m/s</div>
        </div>
        <div className="popup-metric">
          <div className="popup-metric-label">Nb. de mesures</div>
          <div className="popup-metric-value">{station.measurement_count}</div>
        </div>
      </div>

      <div className="popup-period">
        Periode : {formatDate(station.first_date)} — {formatDate(station.last_date)}
      </div>
    </div>
  );
}

function ClusterPopup({ cluster }) {
  const color = getColor(cluster.avg_index);
  const label = getLabel(cluster.avg_index);

  return (
    <div className="station-popup">
      <h3>Cluster — {cluster.point_count} stations</h3>
      <div className="popup-type">Cliquez pour zoomer et voir le detail</div>
      <div className="popup-index-card" style={{ background: color }}>
        <div className="popup-index-value">{Math.round(cluster.avg_index)}<span style={{ fontSize: 14, fontWeight: 400 }}> / 100</span></div>
        <div className="popup-index-label">Indice moyen : {label}</div>
      </div>
    </div>
  );
}

// Inner component that renders markers and handles cluster clicks
function MapContent({ filters, flyTo, onStatsUpdate }) {
  const [data, setData] = useState([]);
  const map = useMap();

  const handleDataLoaded = useCallback((newData) => {
    setData(newData);
    // Update stats in parent
    const stations = newData.filter(d => d.type === 'station');
    const allItems = newData;
    onStatsUpdate(stations, allItems);
  }, [onStatsUpdate]);

  function handleClusterClick(cluster) {
    map.flyTo([cluster.latitude, cluster.longitude], cluster.expansion_zoom, {
      duration: 0.8,
    });
  }

  return (
    <>
      <FlyToHandler flyTo={flyTo} />
      <ClusterLoader filters={filters} onDataLoaded={handleDataLoaded} />
      {data.map((item) => {
        if (item.type === 'cluster') {
          return (
            <Marker
              key={`cluster-${item.id}`}
              position={[item.latitude, item.longitude]}
              icon={createClusterIcon(item.avg_index, item.point_count)}
              eventHandlers={{ click: () => handleClusterClick(item) }}
            >
              <Popup maxWidth={220}>
                <ClusterPopup cluster={item} />
              </Popup>
            </Marker>
          );
        } else {
          return (
            <Marker
              key={item.code}
              position={[item.latitude, item.longitude]}
              icon={createIcon(item.avg_index)}
            >
              <Popup maxWidth={280}>
                <StationPopup station={item} />
              </Popup>
            </Marker>
          );
        }
      })}
    </>
  );
}

export default function PollutionMap({ filters, flyTo, onStatsUpdate }) {
  return (
    <MapContainer
      center={[46.6, 2.5]}
      zoom={6}
      className="leaflet-container"
      preferCanvas={true}
      whenReady={() => console.log('[Map] Ready')}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        updateWhenZooming={false}
        updateWhenIdle={true}
        keepBuffer={4}
        maxZoom={19}
      />
      <MapContent filters={filters} flyTo={flyTo} onStatsUpdate={onStatsUpdate} />
    </MapContainer>
  );
}
