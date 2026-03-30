import { Router } from 'express';
import Supercluster from 'supercluster';

export default function clustersRouter(db) {
  const router = Router();

  // GET /api/clusters?zoom=6&bbox=-5,41,10,52&dateFrom=&dateTo=&minIndex=&maxIndex=
  router.get('/', (req, res) => {
    const { zoom, bbox, dateFrom, dateTo, minIndex, maxIndex } = req.query;

    if (!zoom || !bbox) {
      return res.status(400).json({ error: 'zoom and bbox required (bbox=west,south,east,north)' });
    }

    const zoomLevel = Number(zoom);
    const [west, south, east, north] = bbox.split(',').map(Number);

    // Build query with optional filters
    let where = [];
    let params = {};

    if (dateFrom) {
      where.push('m.date_start >= @dateFrom');
      params.dateFrom = dateFrom;
    }
    if (dateTo) {
      where.push('m.date_end <= @dateTo');
      params.dateTo = dateTo;
    }
    if (minIndex !== undefined && minIndex !== '') {
      where.push('m.pollution_index >= @minIndex');
      params.minIndex = Number(minIndex);
    }
    if (maxIndex !== undefined && maxIndex !== '') {
      where.push('m.pollution_index <= @maxIndex');
      params.maxIndex = Number(maxIndex);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Get aggregated station data
    const query = `
      SELECT
        s.code, s.name, s.latitude, s.longitude, s.commune, s.type_implantation,
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
    `;

    try {
      const stations = db.prepare(query).all(params);

      // Convert to GeoJSON features for Supercluster
      const features = stations.map(s => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
        properties: {
          code: s.code,
          name: s.name,
          commune: s.commune,
          type_implantation: s.type_implantation,
          avg_index: s.avg_index,
          avg_temperature: s.avg_temperature,
          avg_humidity: s.avg_humidity,
          avg_wind_speed: s.avg_wind_speed,
          avg_pm25: s.avg_pm25,
          avg_pm10: s.avg_pm10,
          avg_no2: s.avg_no2,
          avg_o3: s.avg_o3,
          measurement_count: s.measurement_count,
          first_date: s.first_date,
          last_date: s.last_date,
        },
      }));

      // Build Supercluster index
      const index = new Supercluster({
        radius: 60,
        maxZoom: 14,
        reduce: (accumulated, props) => {
          // Aggregate values when clustering
          const total = (accumulated._count || 1) + 1;
          accumulated.avg_index = ((accumulated.avg_index * (total - 1)) + props.avg_index) / total;
          accumulated.avg_pm25 = ((accumulated.avg_pm25 * (total - 1)) + props.avg_pm25) / total;
          accumulated.avg_pm10 = ((accumulated.avg_pm10 * (total - 1)) + props.avg_pm10) / total;
          accumulated.avg_no2 = ((accumulated.avg_no2 * (total - 1)) + props.avg_no2) / total;
          accumulated.avg_o3 = ((accumulated.avg_o3 * (total - 1)) + props.avg_o3) / total;
          accumulated._count = total;
        },
        map: (props) => ({
          ...props,
          _count: 1,
        }),
      });

      index.load(features);

      // Get clusters for the given bbox and zoom
      const clusters = index.getClusters([west, south, east, north], zoomLevel);

      // Format response
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
