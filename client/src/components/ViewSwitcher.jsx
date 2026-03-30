export default function ViewSwitcher({ view, onViewChange }) {
  return (
    <div className="view-switcher">
      <button
        className={`view-btn ${view === 'clusters' ? 'active' : ''}`}
        onClick={() => onViewChange('clusters')}
      >
        Clusters
      </button>
      <button
        className={`view-btn ${view === 'stations' ? 'active' : ''}`}
        onClick={() => onViewChange('stations')}
      >
        Stations
      </button>
      <button
        className={`view-btn ${view === 'table' ? 'active' : ''}`}
        onClick={() => onViewChange('table')}
      >
        Tableau
      </button>
    </div>
  );
}
