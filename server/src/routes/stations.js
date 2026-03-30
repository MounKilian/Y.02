import { Router } from 'express';

export default function stationsRouter(db) {
  const router = Router();

  // GET /api/stations
  // Filters: dateFrom, dateTo, lat, lng, radius (km), minIndex, maxIndex
  router.get('/', (req, res) => {
    const { dateFrom, dateTo, lat, lng, radius, minIndex, maxIndex } = req.query;

    let where = [];
    let params = {};

    // Date filter
    if (dateFrom) {
      where.push('m.date_start >= @dateFrom');
      params.dateFrom = dateFrom;
    }
    if (dateTo) {
      where.push('m.date_end <= @dateTo');
      params.dateTo = dateTo;
    }

    // Index bounds filter
    if (minIndex !== undefined) {
      where.push('m.pollution_index >= @minIndex');
      params.minIndex = Number(minIndex);
    }
    if (maxIndex !== undefined) {
      where.push('m.pollution_index <= @maxIndex');
      params.maxIndex = Number(maxIndex);
    }

    // Geographic filter (bounding box approximation for SQLite)
    // 1 degree latitude ~ 111 km
    if (lat && lng && radius) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const radiusKm = Number(radius);
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos(latNum * Math.PI / 180));

      where.push('s.latitude BETWEEN @latMin AND @latMax');
      where.push('s.longitude BETWEEN @lngMin AND @lngMax');
      params.latMin = latNum - latDelta;
      params.latMax = latNum + latDelta;
      params.lngMin = lngNum - lngDelta;
      params.lngMax = lngNum + lngDelta;
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Aggregate: one row per station with avg values over the period
    const query = `
      SELECT
        s.code,
        s.name,
        s.latitude,
        s.longitude,
        s.commune,
        s.type_implantation,
        ROUND(AVG(m.pollution_index), 1) as avg_index,
        ROUND(AVG(m.temperature), 1) as avg_temperature,
        ROUND(AVG(m.humidity), 1) as avg_humidity,
        ROUND(AVG(m.wind_speed), 1) as avg_wind_speed,
        ROUND(AVG(m.pm25), 1) as avg_pm25,
        ROUND(AVG(m.pm10), 1) as avg_pm10,
        ROUND(AVG(m.no2), 1) as avg_no2,
        ROUND(AVG(m.o3), 1) as avg_o3,
        COUNT(m.id) as measurement_count,
        MIN(m.date_start) as first_date,
        MAX(m.date_end) as last_date
      FROM stations s
      LEFT JOIN measurements m ON s.code = m.station_code
      ${whereClause}
      GROUP BY s.code
      HAVING COUNT(m.id) > 0
      ORDER BY s.name
    `;

    try {
      const stations = db.prepare(query).all(params);
      res.json({ count: stations.length, stations });
    } catch (err) {
      console.error('[API] Query error:', err.message);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  // GET /api/stations/:code — detail for one station (recent measurements)
  router.get('/:code', (req, res) => {
    const station = db.prepare('SELECT * FROM stations WHERE code = ?').get(req.params.code);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    const measurements = db.prepare(`
      SELECT * FROM measurements
      WHERE station_code = ?
      ORDER BY date_start DESC
      LIMIT 48
    `).all(req.params.code);

    res.json({ station, measurements });
  });

  return router;
}
