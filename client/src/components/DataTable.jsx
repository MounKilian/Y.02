import { useState } from 'react';
import { getColor, getLabel } from '../utils/colors';

const COLUMNS = [
  { key: 'name', label: 'Station' },
  { key: 'commune', label: 'Ville' },
  { key: 'type_implantation', label: 'Type' },
  { key: 'avg_index', label: 'Indice' },
  { key: 'avg_pm25', label: 'PM2.5' },
  { key: 'avg_pm10', label: 'PM10' },
  { key: 'avg_no2', label: 'NO2' },
  { key: 'avg_o3', label: 'O3' },
  { key: 'avg_temperature', label: 'Temp.' },
  { key: 'avg_humidity', label: 'Hum.' },
  { key: 'measurement_count', label: 'Mesures' },
];

export default function DataTable({ stations, hasDateFilter }) {
  const [sortKey, setSortKey] = useState('avg_index');
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name' || key === 'commune');
    }
  }

  const sorted = [...stations].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (typeof va === 'string') {
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortAsc ? va - vb : vb - va;
  });

  return (
    <div className="data-table-wrapper">
      {hasDateFilter && (
        <div className="table-notice">
          Les valeurs affichees sont des moyennes sur la periode selectionnee.
        </div>
      )}
      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={sortKey === col.key ? 'sorted' : ''}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="sort-arrow">{sortAsc ? ' ▲' : ' ▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(s => (
            <tr key={s.code}>
              <td className="td-name">{s.name}</td>
              <td>{s.commune}</td>
              <td><span className="type-badge">{s.type_implantation}</span></td>
              <td>
                <span className="index-badge" style={{ background: getColor(s.avg_index) }}>
                  {Math.round(s.avg_index)}
                </span>
              </td>
              <td>{s.avg_pm25}</td>
              <td>{s.avg_pm10}</td>
              <td>{s.avg_no2}</td>
              <td>{s.avg_o3}</td>
              <td>{s.avg_temperature}°C</td>
              <td>{s.avg_humidity}%</td>
              <td>{s.measurement_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-footer">
        {sorted.length} station{sorted.length > 1 ? 's' : ''} affichee{sorted.length > 1 ? 's' : ''}
      </div>
    </div>
  );
}
