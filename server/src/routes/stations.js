import { Router } from 'express';

export default function stationsRouter(pool) {
  const router = Router();

  // GET /api/stations
  router.get('/', async (req, res) => {
    const { dateFrom, dateTo, lat, lng, radius, minIndex, maxIndex } = req.query;

    let where = [];
    let values = [];
    let i = 1;

    // Date filter
    if (dateFrom) {
      where.push(`m.date_start >= $${i++}`);
      values.push(dateFrom);
    }
    if (dateTo) {
      where.push(`m.date_end <= $${i++}`);
      values.push(dateTo);
    }

    // Index filter
    if (minIndex !== undefined && minIndex !== '') {
      where.push(`m.pollution_index >= $${i++}`);
      values.push(Number(minIndex));
    }
    if (maxIndex !== undefined && maxIndex !== '') {
      where.push(`m.pollution_index <= $${i++}`);
      values.push(Number(maxIndex));
    }

    // Geographic filter
    if (lat && lng && radius) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const radiusKm = Number(radius);

      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos(latNum * Math.PI / 180));

      where.push(`s.latitude BETWEEN $${i++} AND $${i++}`);
      values.push(latNum - latDelta, latNum + latDelta);

      where.push(`s.longitude BETWEEN $${i++} AND $${i++}`);
      values.push(lngNum - lngDelta, lngNum + lngDelta);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const query = `
      SELECT
        s.code,
        s.name,
        s.latitude,
        s.longitude,
        s.commune,
        s.type_implantation,
        ROUND(AVG(m.pollution_index)::numeric, 1) as avg_index,
        ROUND(AVG(m.temperature)::numeric, 1) as avg_temperature,
        ROUND(AVG(m.humidity)::numeric, 1) as avg_humidity,
        ROUND(AVG(m.wind_speed)::numeric, 1) as avg_wind_speed,
        ROUND(AVG(m.pm25)::numeric, 1) as avg_pm25,
        ROUND(AVG(m.pm10)::numeric, 1) as avg_pm10,
        ROUND(AVG(m.no2)::numeric, 1) as avg_no2,
        ROUND(AVG(m.o3)::numeric, 1) as avg_o3,
        COUNT(m.id) as measurement_count,
        MIN(m.date_start) as first_date,
        MAX(m.date_end) as last_date
      FROM stations s
      LEFT JOIN measurements m ON s.code = m.station_code
      ${whereClause}
      GROUP BY
        s.code,
        s.name,
        s.latitude,
        s.longitude,
        s.commune,
        s.type_implantation
      HAVING COUNT(m.id) > 0
      ORDER BY s.name
    `;

    try {
      const { rows: stations } = await pool.query(query, values);
      res.json({ count: stations.length, stations });
    } catch (err) {
      console.error('[API] Query error:', err.message);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  // GET /api/stations/:code
  router.get('/:code', async (req, res) => {
    try {
      // Station
      const { rows: stationRows } = await pool.query(
        'SELECT * FROM stations WHERE code = $1',
        [req.params.code]
      );

      if (stationRows.length === 0) {
        return res.status(404).json({ error: 'Station not found' });
      }

      const station = stationRows[0];

      // Measurements
      const { rows: measurements } = await pool.query(`
        SELECT * FROM measurements
        WHERE station_code = $1
        ORDER BY date_start DESC
        LIMIT 48
      `, [req.params.code]);

      res.json({ station, measurements });

    } catch (err) {
      console.error('[API] Query error:', err.message);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  return router;
}