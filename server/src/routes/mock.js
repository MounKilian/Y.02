import { Router } from 'express';

const router = Router();

// Simulates the Data team's endpoint
// Returns pollution + weather data with a combined index per station
router.get('/', (req, res) => {
  const now = new Date();
  const dateStart = new Date(now);
  dateStart.setMinutes(0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setHours(dateEnd.getHours() + 1);

  // Simplified station list (in production, Data team provides this)
  const stations = [
    { code: 'FR04037', name: 'Paris 13eme', lat: 48.829, lng: 2.360, commune: 'Paris', type: 'Urbaine' },
    { code: 'FR04143', name: 'Paris Les Halles', lat: 48.862, lng: 2.348, commune: 'Paris', type: 'Urbaine' },
    { code: 'FR04156', name: 'Paris 18eme', lat: 48.892, lng: 2.349, commune: 'Paris', type: 'Urbaine' },
    { code: 'FR20067', name: 'Lyon Centre', lat: 45.728, lng: 4.876, commune: 'Lyon', type: 'Urbaine' },
    { code: 'FR15018', name: 'Marseille Timone', lat: 43.289, lng: 5.396, commune: 'Marseille', type: 'Urbaine' },
    { code: 'FR31002', name: 'Toulouse Berthelot', lat: 43.588, lng: 1.441, commune: 'Toulouse', type: 'Urbaine' },
    { code: 'FR16003', name: 'Nice Arson', lat: 43.703, lng: 7.282, commune: 'Nice', type: 'Urbaine' },
    { code: 'FR12020', name: 'Lille Fives', lat: 50.629, lng: 3.076, commune: 'Lille', type: 'Urbaine' },
    { code: 'FR26002', name: 'Strasbourg Clemenceau', lat: 48.574, lng: 7.754, commune: 'Strasbourg', type: 'Urbaine' },
    { code: 'FR09013', name: 'Bordeaux Grand Parc', lat: 44.855, lng: -0.578, commune: 'Bordeaux', type: 'Urbaine' },
    { code: 'FR29401', name: 'Dunkerque Port', lat: 51.034, lng: 2.378, commune: 'Dunkerque', type: 'Industrielle' },
    { code: 'FR06501', name: 'Fos-sur-Mer', lat: 43.453, lng: 4.944, commune: 'Fos-sur-Mer', type: 'Industrielle' },
    { code: 'FR35099', name: 'Rural Lozere', lat: 44.393, lng: 3.733, commune: 'La Nouaille', type: 'Rurale' },
  ];

  const hour = now.getHours();
  const rushHourBonus = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19) ? 15 : 0;

  const data = stations.map(s => {
    const basePollution = s.type === 'Industrielle' ? 55
      : s.type === 'Urbaine' ? 40
      : s.type === 'Periurbaine' ? 25 : 10;

    const noise = (Math.random() - 0.5) * 20;
    const pm25 = Math.max(0, Math.round((basePollution * 0.6 + noise * 0.5 + rushHourBonus * 0.5) * 10) / 10);
    const pm10 = Math.max(0, Math.round((pm25 * 1.8 + (Math.random() - 0.5) * 10) * 10) / 10);
    const no2 = Math.max(0, Math.round((basePollution * 0.8 + rushHourBonus + noise) * 10) / 10);
    const o3 = Math.max(0, Math.round((60 - no2 * 0.5 + (Math.random() - 0.5) * 15) * 10) / 10);
    const pollutionIndex = Math.min(100, Math.max(0,
      Math.round(pm25 * 0.3 + pm10 * 0.1 + no2 * 0.35 + (100 - o3) * 0.25)
    ));

    const baseTemp = 15 - (s.lat - 43) * 0.8;
    const temperature = Math.round((baseTemp + Math.sin(hour / 24 * Math.PI * 2 - Math.PI / 2) * 5 + (Math.random() - 0.5) * 3) * 10) / 10;
    const humidity = Math.min(100, Math.max(20, Math.round(65 + (Math.random() - 0.5) * 30)));
    const windSpeed = Math.max(0, Math.round((5 + (Math.random() - 0.5) * 8) * 10) / 10);

    return {
      station: { code: s.code, name: s.name, latitude: s.lat, longitude: s.lng, commune: s.commune, type_implantation: s.type },
      date_start: dateStart.toISOString(),
      date_end: dateEnd.toISOString(),
      pollution_index: pollutionIndex,
      temperature,
      humidity,
      wind_speed: windSpeed,
      pm25, pm10, no2, o3,
    };
  });

  res.json({ timestamp: now.toISOString(), count: data.length, data });
});

export default router;
