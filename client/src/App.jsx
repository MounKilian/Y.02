import { useState, useCallback } from 'react';
import PollutionMap from './components/PollutionMap';
import Filters from './components/Filters';
import Legend from './components/Legend';
import StatsPanel from './components/StatsPanel';

function App() {
  const [filters, setFilters] = useState({});
  const [flyTo, setFlyTo] = useState(null);
  const [stations, setStations] = useState([]);
  const [totalItems, setTotalItems] = useState(0);

  function handleFilter(newFilters) {
    setFilters(newFilters);
  }

  function handleFlyTo(lat, lng, zoom) {
    setFlyTo({ lat, lng, zoom, _t: Date.now() });
  }

  const handleStatsUpdate = useCallback((stationsList, allItems) => {
    setStations(stationsList);
    setTotalItems(allItems.length);
  }, []);

  const clusterCount = totalItems - stations.length;

  return (
    <>
      <header className="header">
        <div className="header-left">
          <div className="header-logo" />
          <h1>Air<span>Viz</span></h1>
        </div>
        <div className="header-stats">
          <div className="header-stat">
            <strong>{totalItems}</strong> elements
            {clusterCount > 0 && <span> ({clusterCount} clusters)</span>}
          </div>
          <div className="header-stat">
            Qualite de l'air en France
          </div>
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <Filters onFilter={handleFilter} onFlyTo={handleFlyTo} loading={false} />
          <Legend />
          <StatsPanel stations={stations} />
        </aside>

        <div className="map-wrapper">
          <PollutionMap
            filters={filters}
            flyTo={flyTo}
            onStatsUpdate={handleStatsUpdate}
          />
        </div>
      </div>
    </>
  );
}

export default App;
