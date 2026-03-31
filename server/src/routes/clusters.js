import { Router } from 'express';
import Supercluster from 'supercluster';

export default function clustersRouter(pool) {
  const router = Router();

  router.get('/', async (req, res) => {
    const { zoom, bbox, dateFrom, dateTo, minIndex, maxIndex } = req.query;

    if (!zoom || !bbox) {
      return res.status(400).json({ error: 'zoom and bbox required (bbox=west,south,east,north)' });
    }

    const zoomLevel = Number(zoom);
    const [west, south, east, north] = bbox.split(',').map(Number);

    let where = [];
    let values = [];
    let i = 1;

    if (dateFrom) {
      where.push(`m.date_start >= $${i++}`);
      values.push(dateFrom);
    }
    if (dateTo) {
      where.push(`m.date_end <= $${i++}`);
      values.push(dateTo);
    }
    if (minIndex !== undefined && minIndex !== '') {
      where.push(`m.pollution_index >= $${i++}`);
      values.push(Number(minIndex));
    }
    if (maxIndex !== undefined && maxIndex !== '') {
      where.push(`m.pollution_index <= $${i++}`);
      values.push(Number(maxIndex));
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const query = `
      SELECT
        s.code, s.name, s.latitude, s.longitude, s.commune, s.type_implantation,
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
    `;

    try {
      const { rows: stations } = await pool.query(query, values);

      // Convert to GeoJSON
      const features = stations.map(s => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
        properties: {
          code: s.code,
          name: s.name,
          commune: s.commune,
          type_implantation: s.type_implantation,
          avg_index: Number(s.avg_index),
          avg_temperature: Number(s.avg_temperature),
          avg_humidity: Number(s.avg_humidity),
          avg_wind_speed: Number(s.avg_wind_speed),
          avg_pm25: Number(s.avg_pm25),
          avg_pm10: Number(s.avg_pm10),
          avg_no2: Number(s.avg_no2),
          avg_o3: Number(s.avg_o3),
          measurement_count: Number(s.measurement_count),
          first_date: s.first_date,
          last_date: s.last_date,
        },
      }));

      const index = new Supercluster({
        radius: 60,
        maxZoom: 14,
        reduce: (acc, props) => {
          const total = (acc._count || 1) + 1;
          acc.avg_index = ((acc.avg_index * (total - 1)) + props.avg_index) / total;
          acc.avg_pm25 = ((acc.avg_pm25 * (total - 1)) + props.avg_pm25) / total;
          acc.avg_pm10 = ((acc.avg_pm10 * (total - 1)) + props.avg_pm10) / total;
          acc.avg_no2 = ((acc.avg_no2 * (total - 1)) + props.avg_no2) / total;
          acc.avg_o3 = ((acc.avg_o3 * (total - 1)) + props.avg_o3) / total;
          acc._count = total;
        },
        map: (props) => ({
          ...props,
          _count: 1,
        }),
      });

      index.load(features);

      const clusters = index.getClusters([west, south, east, north], zoomLevel);

      const result = clusters.map(c => {
        const isCluster = c.properties.cluster;

        if (isCluster) {
          return {
            type: 'cluster',
            id: c.properties.cluster_id,
            latitude: c.geometry.coordinates[1],
            longitude: c.geometry.coordinates[0],
            point_count: c.properties.point_count,
            avg_index: Math.round(c.properties.avg_index * 10) / 10,
            avg_pm25: Math.round(c.properties.avg_pm25 * 10) / 10,
            avg_no2: Math.round(c.properties.avg_no2 * 10) / 10,
            expansion_zoom: index.getClusterExpansionZoom(c.properties.cluster_id),
          };
        } else {
          return {
            type: 'station',
            ...c.properties,
            latitude: c.geometry.coordinates[1],
            longitude: c.geometry.coordinates[0],
          };
        }
      });

      res.json({
        zoom: zoomLevel,
        count: result.length,
        clusters: result.filter(r => r.type === 'cluster').length,
        stations: result.filter(r => r.type === 'station').length,
        data: result,
      });

    } catch (err) {
      console.error('[API] Cluster error:', err.message);
      res.status(500).json({ error: 'Clustering failed' });
    }
  });

  return router;
}