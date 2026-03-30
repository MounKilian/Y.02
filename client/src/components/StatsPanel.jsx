import { getColor } from '../utils/colors';

export default function StatsPanel({ stations }) {
  if (stations.length === 0) return null;

  const indices = stations.map(s => s.avg_index);
  const avg = Math.round(indices.reduce((a, b) => a + b, 0) / indices.length);
  const min = Math.round(Math.min(...indices));
  const max = Math.round(Math.max(...indices));

  return (
    <div className="sidebar-section">
      <div className="section-title">Statistiques</div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stations.length}</div>
          <div className="stat-label">Stations</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: getColor(avg) }}>{avg}</div>
          <div className="stat-label">Indice moy.</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: getColor(min) }}>{min}</div>
          <div className="stat-label">Min</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: getColor(max) }}>{max}</div>
          <div className="stat-label">Max</div>
        </div>
      </div>
    </div>
  );
}
