const LEVELS = [
  { color: '#22c55e', label: 'Bon', range: '0 — 20' },
  { color: '#84cc16', label: 'Correct', range: '21 — 40' },
  { color: '#eab308', label: 'Moyen', range: '41 — 60' },
  { color: '#f97316', label: 'Mauvais', range: '61 — 80' },
  { color: '#ef4444', label: 'Tres mauvais', range: '81 — 100' },
];

export default function Legend() {
  return (
    <div className="sidebar-section">
      <div className="section-title">Legende</div>
      <div className="legend-items">
        {LEVELS.map((l) => (
          <div key={l.label} className="legend-item">
            <div className="legend-dot" style={{ background: l.color }} />
            <span>{l.label}</span>
            <span className="legend-range">{l.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
