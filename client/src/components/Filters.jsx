import { useState } from 'react';

const ZONES = [
  { label: 'France entiere', lat: 46.6, lng: 2.5, zoom: 6 },
  // Ile-de-France
  { label: 'Paris', lat: 48.856, lng: 2.352, zoom: 12, region: 'Ile-de-France' },
  { label: 'Ile-de-France', lat: 48.85, lng: 2.35, zoom: 9, region: 'Ile-de-France' },
  // Hauts-de-France
  { label: 'Lille', lat: 50.629, lng: 3.076, zoom: 12, region: 'Hauts-de-France' },
  { label: 'Amiens', lat: 49.894, lng: 2.302, zoom: 12, region: 'Hauts-de-France' },
  { label: 'Dunkerque', lat: 51.034, lng: 2.378, zoom: 12, region: 'Hauts-de-France' },
  { label: 'Hauts-de-France', lat: 49.9, lng: 2.8, zoom: 8, region: 'Hauts-de-France' },
  // Grand Est
  { label: 'Strasbourg', lat: 48.574, lng: 7.754, zoom: 12, region: 'Grand Est' },
  { label: 'Metz', lat: 49.119, lng: 6.176, zoom: 12, region: 'Grand Est' },
  { label: 'Nancy', lat: 48.693, lng: 6.183, zoom: 12, region: 'Grand Est' },
  { label: 'Reims', lat: 49.254, lng: 3.931, zoom: 12, region: 'Grand Est' },
  { label: 'Grand Est', lat: 48.6, lng: 6.0, zoom: 7, region: 'Grand Est' },
  // Normandie
  { label: 'Rouen', lat: 49.438, lng: 1.099, zoom: 12, region: 'Normandie' },
  { label: 'Caen', lat: 49.176, lng: -0.359, zoom: 12, region: 'Normandie' },
  { label: 'Le Havre', lat: 49.510, lng: 0.145, zoom: 12, region: 'Normandie' },
  { label: 'Normandie', lat: 49.2, lng: 0.3, zoom: 8, region: 'Normandie' },
  // Bretagne
  { label: 'Rennes', lat: 48.110, lng: -1.679, zoom: 12, region: 'Bretagne' },
  { label: 'Brest', lat: 48.386, lng: -4.487, zoom: 12, region: 'Bretagne' },
  { label: 'Bretagne', lat: 48.2, lng: -3.0, zoom: 8, region: 'Bretagne' },
  // Pays de la Loire
  { label: 'Nantes', lat: 47.213, lng: -1.556, zoom: 12, region: 'Pays de la Loire' },
  { label: 'Angers', lat: 47.473, lng: -0.556, zoom: 12, region: 'Pays de la Loire' },
  { label: 'Le Mans', lat: 47.995, lng: 0.199, zoom: 12, region: 'Pays de la Loire' },
  { label: 'Pays de la Loire', lat: 47.4, lng: -0.8, zoom: 8, region: 'Pays de la Loire' },
  // Auvergne-Rhone-Alpes
  { label: 'Lyon', lat: 45.728, lng: 4.876, zoom: 12, region: 'Auvergne-Rhone-Alpes' },
  { label: 'Grenoble', lat: 45.185, lng: 5.735, zoom: 12, region: 'Auvergne-Rhone-Alpes' },
  { label: 'Saint-Etienne', lat: 45.434, lng: 4.390, zoom: 12, region: 'Auvergne-Rhone-Alpes' },
  { label: 'Clermont-Ferrand', lat: 45.792, lng: 3.113, zoom: 12, region: 'Auvergne-Rhone-Alpes' },
  { label: 'Auvergne-Rhone-Alpes', lat: 45.5, lng: 4.5, zoom: 7, region: 'Auvergne-Rhone-Alpes' },
  // Nouvelle-Aquitaine
  { label: 'Bordeaux', lat: 44.855, lng: -0.578, zoom: 12, region: 'Nouvelle-Aquitaine' },
  { label: 'La Rochelle', lat: 46.160, lng: -1.152, zoom: 12, region: 'Nouvelle-Aquitaine' },
  { label: 'Poitiers', lat: 46.580, lng: 0.340, zoom: 12, region: 'Nouvelle-Aquitaine' },
  { label: 'Pau', lat: 43.295, lng: -0.370, zoom: 12, region: 'Nouvelle-Aquitaine' },
  { label: 'Nouvelle-Aquitaine', lat: 45.5, lng: 0.0, zoom: 7, region: 'Nouvelle-Aquitaine' },
  // Occitanie
  { label: 'Toulouse', lat: 43.588, lng: 1.441, zoom: 12, region: 'Occitanie' },
  { label: 'Montpellier', lat: 43.611, lng: 3.873, zoom: 12, region: 'Occitanie' },
  { label: 'Perpignan', lat: 42.699, lng: 2.896, zoom: 12, region: 'Occitanie' },
  { label: 'Nimes', lat: 43.837, lng: 4.360, zoom: 12, region: 'Occitanie' },
  { label: 'Occitanie', lat: 43.5, lng: 2.0, zoom: 7, region: 'Occitanie' },
  // PACA
  { label: 'Marseille', lat: 43.289, lng: 5.396, zoom: 12, region: 'PACA' },
  { label: 'Nice', lat: 43.703, lng: 7.282, zoom: 12, region: 'PACA' },
  { label: 'Toulon', lat: 43.120, lng: 5.935, zoom: 12, region: 'PACA' },
  { label: 'Aix-en-Provence', lat: 43.529, lng: 5.447, zoom: 12, region: 'PACA' },
  { label: 'PACA', lat: 43.5, lng: 6.0, zoom: 8, region: 'PACA' },
  // Corse
  { label: 'Ajaccio', lat: 41.919, lng: 8.739, zoom: 12, region: 'Corse' },
  { label: 'Bastia', lat: 42.697, lng: 9.451, zoom: 12, region: 'Corse' },
  { label: 'Corse', lat: 42.2, lng: 9.1, zoom: 8, region: 'Corse' },
  // Outre-mer
  { label: 'Saint-Denis (Reunion)', lat: -20.879, lng: 55.448, zoom: 10, region: 'Outre-mer' },
  { label: 'Fort-de-France', lat: 14.601, lng: -61.073, zoom: 10, region: 'Outre-mer' },
  { label: 'Pointe-a-Pitre', lat: 16.242, lng: -61.533, zoom: 10, region: 'Outre-mer' },
  { label: 'Cayenne', lat: 4.922, lng: -52.326, zoom: 10, region: 'Outre-mer' },
];

// Group zones by region for optgroups
function getGroupedZones() {
  const groups = {};
  const standalone = [];

  ZONES.forEach((z, i) => {
    if (z.region) {
      if (!groups[z.region]) groups[z.region] = [];
      groups[z.region].push({ ...z, index: i });
    } else {
      standalone.push({ ...z, index: i });
    }
  });

  return { standalone, groups };
}

const { standalone, groups } = getGroupedZones();

export { ZONES };

export default function Filters({ onFilter, onFlyTo, loading }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minIndex, setMinIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState(100);
  const [zoneIdx, setZoneIdx] = useState(0);

  function handleZoneChange(idx) {
    setZoneIdx(idx);
    const zone = ZONES[idx];
    onFlyTo(zone.lat, zone.lng, zone.zoom);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const zone = ZONES[zoneIdx];

    // For "France entiere", don't send geo filter
    const isFullFrance = zoneIdx === 0;
    const radiusMap = { 12: 30, 10: 100, 9: 80, 8: 150, 7: 250 };

    onFilter({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo ? dateTo + 'T23:59:59' : undefined,
      minIndex: minIndex > 0 ? minIndex : undefined,
      maxIndex: maxIndex < 100 ? maxIndex : undefined,
      lat: isFullFrance ? undefined : zone.lat,
      lng: isFullFrance ? undefined : zone.lng,
      radius: isFullFrance ? undefined : (radiusMap[zone.zoom] || 80),
    });

    onFlyTo(zone.lat, zone.lng, zone.zoom);
  }

  function handleReset() {
    setDateFrom('');
    setDateTo('');
    setMinIndex(0);
    setMaxIndex(100);
    setZoneIdx(0);
    onFilter({});
    onFlyTo(46.6, 2.5, 6);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="sidebar-section">
        <div className="section-title">Filtres</div>

        <div className="filter-group">
          <label className="filter-label">Periode</label>
          <div className="filter-row">
            <input
              type="date"
              className="filter-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              type="date"
              className="filter-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Zone geographique</label>
          <select
            className="filter-select"
            value={zoneIdx}
            onChange={(e) => handleZoneChange(Number(e.target.value))}
          >
            {standalone.map((z) => (
              <option key={z.index} value={z.index}>{z.label}</option>
            ))}
            {Object.entries(groups).map(([region, zones]) => (
              <optgroup key={region} label={region}>
                {zones.map((z) => (
                  <option key={z.index} value={z.index}>{z.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <div className="range-display">
            <span>Indice min</span>
            <strong>{minIndex}</strong>
          </div>
          <input
            type="range"
            className="filter-range"
            min="0"
            max="100"
            value={minIndex}
            onChange={(e) => setMinIndex(Number(e.target.value))}
          />
        </div>

        <div className="filter-group">
          <div className="range-display">
            <span>Indice max</span>
            <strong>{maxIndex}</strong>
          </div>
          <input
            type="range"
            className="filter-range"
            min="0"
            max="100"
            value={maxIndex}
            onChange={(e) => setMaxIndex(Number(e.target.value))}
          />
        </div>

        <button type="submit" className="btn-filter" disabled={loading}>
          {loading ? 'Chargement...' : 'Appliquer'}
        </button>
        <button type="button" className="btn-reset" onClick={handleReset}>
          Reinitialiser
        </button>
      </div>
    </form>
  );
}
