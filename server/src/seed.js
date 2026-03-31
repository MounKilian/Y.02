import { initDb, pool } from './db.js';

// ~100 stations francaises reelles (positions approximatives)
const STATIONS = [
  // === Ile-de-France ===
  { code: 'FR04037', name: 'Paris 13eme', lat: 48.829, lng: 2.360, commune: 'Paris', type: 'Urbaine' },
  { code: 'FR04143', name: 'Paris Les Halles', lat: 48.862, lng: 2.348, commune: 'Paris', type: 'Urbaine' },
  { code: 'FR04156', name: 'Paris 18eme', lat: 48.892, lng: 2.349, commune: 'Paris', type: 'Urbaine' },
  { code: 'FR04070', name: 'Paris Champs-Elysees', lat: 48.869, lng: 2.313, commune: 'Paris', type: 'Trafic' },
  { code: 'FR04181', name: 'Paris Periph Est', lat: 48.848, lng: 2.411, commune: 'Paris', type: 'Trafic' },
  { code: 'FR04301', name: 'Gennevilliers', lat: 48.935, lng: 2.303, commune: 'Gennevilliers', type: 'Urbaine' },
  { code: 'FR04302', name: 'Vitry-sur-Seine', lat: 48.787, lng: 2.392, commune: 'Vitry-sur-Seine', type: 'Urbaine' },
  { code: 'FR04303', name: 'Bobigny', lat: 48.910, lng: 2.450, commune: 'Bobigny', type: 'Urbaine' },
  { code: 'FR04304', name: 'Versailles', lat: 48.804, lng: 2.134, commune: 'Versailles', type: 'Urbaine' },
  { code: 'FR04305', name: 'Melun', lat: 48.539, lng: 2.655, commune: 'Melun', type: 'Periurbaine' },
  { code: 'FR04306', name: 'Cergy-Pontoise', lat: 49.036, lng: 2.076, commune: 'Cergy', type: 'Periurbaine' },
  { code: 'FR04307', name: 'Evry-Courcouronnes', lat: 48.632, lng: 2.431, commune: 'Evry', type: 'Urbaine' },

  // === Nord / Hauts-de-France ===
  { code: 'FR12020', name: 'Lille Fives', lat: 50.629, lng: 3.076, commune: 'Lille', type: 'Urbaine' },
  { code: 'FR12021', name: 'Lille Centre', lat: 50.636, lng: 3.063, commune: 'Lille', type: 'Trafic' },
  { code: 'FR29401', name: 'Dunkerque Port', lat: 51.034, lng: 2.378, commune: 'Dunkerque', type: 'Industrielle' },
  { code: 'FR12030', name: 'Douai Theuriet', lat: 50.370, lng: 3.080, commune: 'Douai', type: 'Urbaine' },
  { code: 'FR12031', name: 'Valenciennes', lat: 50.357, lng: 3.523, commune: 'Valenciennes', type: 'Urbaine' },
  { code: 'FR12032', name: 'Calais', lat: 50.951, lng: 1.858, commune: 'Calais', type: 'Urbaine' },
  { code: 'FR12033', name: 'Amiens', lat: 49.894, lng: 2.302, commune: 'Amiens', type: 'Urbaine' },
  { code: 'FR12034', name: 'Beauvais', lat: 49.429, lng: 2.080, commune: 'Beauvais', type: 'Periurbaine' },
  { code: 'FR12035', name: 'Compiegne', lat: 49.418, lng: 2.826, commune: 'Compiegne', type: 'Periurbaine' },
  { code: 'FR12036', name: 'Saint-Quentin', lat: 49.847, lng: 3.287, commune: 'Saint-Quentin', type: 'Urbaine' },

  // === Grand Est ===
  { code: 'FR26002', name: 'Strasbourg Clemenceau', lat: 48.574, lng: 7.754, commune: 'Strasbourg', type: 'Urbaine' },
  { code: 'FR01011', name: 'Metz Centre', lat: 49.119, lng: 6.176, commune: 'Metz', type: 'Urbaine' },
  { code: 'FR01020', name: 'Nancy Charles III', lat: 48.693, lng: 6.183, commune: 'Nancy', type: 'Urbaine' },
  { code: 'FR01021', name: 'Reims Doumer', lat: 49.254, lng: 3.931, commune: 'Reims', type: 'Urbaine' },
  { code: 'FR01022', name: 'Mulhouse', lat: 47.749, lng: 7.340, commune: 'Mulhouse', type: 'Urbaine' },
  { code: 'FR01023', name: 'Colmar', lat: 48.079, lng: 7.355, commune: 'Colmar', type: 'Periurbaine' },
  { code: 'FR01024', name: 'Troyes', lat: 48.297, lng: 4.074, commune: 'Troyes', type: 'Urbaine' },

  // === Normandie ===
  { code: 'FR18015', name: 'Rouen Periph', lat: 49.438, lng: 1.099, commune: 'Rouen', type: 'Periurbaine' },
  { code: 'FR03043', name: 'Le Havre Caucriauville', lat: 49.510, lng: 0.145, commune: 'Le Havre', type: 'Urbaine' },
  { code: 'FR18020', name: 'Caen Vaucelles', lat: 49.176, lng: -0.359, commune: 'Caen', type: 'Urbaine' },
  { code: 'FR18021', name: 'Cherbourg', lat: 49.633, lng: -1.622, commune: 'Cherbourg', type: 'Urbaine' },
  { code: 'FR18022', name: 'Evreux', lat: 49.024, lng: 1.151, commune: 'Evreux', type: 'Periurbaine' },

  // === Bretagne ===
  { code: 'FR28019', name: 'Rennes Breizh', lat: 48.110, lng: -1.679, commune: 'Rennes', type: 'Urbaine' },
  { code: 'FR19012', name: 'Brest Mace', lat: 48.386, lng: -4.487, commune: 'Brest', type: 'Urbaine' },
  { code: 'FR28020', name: 'Saint-Brieuc', lat: 48.514, lng: -2.760, commune: 'Saint-Brieuc', type: 'Urbaine' },
  { code: 'FR28021', name: 'Vannes', lat: 47.656, lng: -2.760, commune: 'Vannes', type: 'Periurbaine' },
  { code: 'FR28022', name: 'Lorient', lat: 47.748, lng: -3.366, commune: 'Lorient', type: 'Urbaine' },
  { code: 'FR28023', name: 'Quimper', lat: 47.997, lng: -4.102, commune: 'Quimper', type: 'Periurbaine' },

  // === Pays de la Loire ===
  { code: 'FR07005', name: 'Nantes Victor Hugo', lat: 47.213, lng: -1.556, commune: 'Nantes', type: 'Urbaine' },
  { code: 'FR07010', name: 'Angers', lat: 47.473, lng: -0.556, commune: 'Angers', type: 'Urbaine' },
  { code: 'FR07011', name: 'Le Mans', lat: 47.995, lng: 0.199, commune: 'Le Mans', type: 'Urbaine' },
  { code: 'FR07012', name: 'Saint-Nazaire', lat: 47.273, lng: -2.214, commune: 'Saint-Nazaire', type: 'Industrielle' },
  { code: 'FR07013', name: 'La Roche-sur-Yon', lat: 46.671, lng: -1.427, commune: 'La Roche-sur-Yon', type: 'Periurbaine' },

  // === Centre-Val de Loire ===
  { code: 'FR08010', name: 'Orleans', lat: 47.903, lng: 1.909, commune: 'Orleans', type: 'Urbaine' },
  { code: 'FR08011', name: 'Tours', lat: 47.394, lng: 0.685, commune: 'Tours', type: 'Urbaine' },
  { code: 'FR08012', name: 'Bourges', lat: 47.081, lng: 2.399, commune: 'Bourges', type: 'Periurbaine' },
  { code: 'FR08013', name: 'Chartres', lat: 48.456, lng: 1.484, commune: 'Chartres', type: 'Periurbaine' },

  // === Bourgogne-Franche-Comte ===
  { code: 'FR23088', name: 'Dijon Pasteur', lat: 47.316, lng: 5.034, commune: 'Dijon', type: 'Urbaine' },
  { code: 'FR23090', name: 'Besancon', lat: 47.237, lng: 6.024, commune: 'Besancon', type: 'Urbaine' },
  { code: 'FR23091', name: 'Chalon-sur-Saone', lat: 46.781, lng: 4.855, commune: 'Chalon-sur-Saone', type: 'Periurbaine' },
  { code: 'FR23092', name: 'Auxerre', lat: 47.798, lng: 3.567, commune: 'Auxerre', type: 'Periurbaine' },
  { code: 'FR23093', name: 'Belfort', lat: 47.640, lng: 6.863, commune: 'Belfort', type: 'Urbaine' },

  // === Auvergne-Rhone-Alpes ===
  { code: 'FR20067', name: 'Lyon Centre', lat: 45.728, lng: 4.876, commune: 'Lyon', type: 'Urbaine' },
  { code: 'FR20068', name: 'Lyon Periph Nord', lat: 45.782, lng: 4.857, commune: 'Lyon', type: 'Trafic' },
  { code: 'FR24030', name: 'Grenoble Caserne', lat: 45.185, lng: 5.735, commune: 'Grenoble', type: 'Urbaine' },
  { code: 'FR34032', name: 'Clermont-Fd Montferrand', lat: 45.792, lng: 3.113, commune: 'Clermont-Ferrand', type: 'Urbaine' },
  { code: 'FR20070', name: 'Saint-Etienne', lat: 45.434, lng: 4.390, commune: 'Saint-Etienne', type: 'Urbaine' },
  { code: 'FR24031', name: 'Annecy', lat: 45.899, lng: 6.129, commune: 'Annecy', type: 'Urbaine' },
  { code: 'FR24032', name: 'Chambery', lat: 45.564, lng: 5.918, commune: 'Chambery', type: 'Urbaine' },
  { code: 'FR24033', name: 'Valence', lat: 44.933, lng: 4.892, commune: 'Valence', type: 'Urbaine' },
  { code: 'FR34033', name: 'Le Puy-en-Velay', lat: 45.043, lng: 3.885, commune: 'Le Puy-en-Velay', type: 'Periurbaine' },
  { code: 'FR24034', name: 'Bourg-en-Bresse', lat: 46.205, lng: 5.225, commune: 'Bourg-en-Bresse', type: 'Periurbaine' },
  { code: 'FR20071', name: 'Chamonix', lat: 45.924, lng: 6.870, commune: 'Chamonix', type: 'Rurale' },
  { code: 'FR24035', name: 'Albertville Maurienne', lat: 45.406, lng: 6.473, commune: 'Albertville', type: 'Industrielle' },

  // === Nouvelle-Aquitaine ===
  { code: 'FR09013', name: 'Bordeaux Grand Parc', lat: 44.855, lng: -0.578, commune: 'Bordeaux', type: 'Urbaine' },
  { code: 'FR35012', name: 'Limoges Mairie', lat: 45.834, lng: 1.261, commune: 'Limoges', type: 'Periurbaine' },
  { code: 'FR09020', name: 'Poitiers', lat: 46.580, lng: 0.340, commune: 'Poitiers', type: 'Urbaine' },
  { code: 'FR09021', name: 'La Rochelle', lat: 46.160, lng: -1.152, commune: 'La Rochelle', type: 'Urbaine' },
  { code: 'FR09022', name: 'Angouleme', lat: 45.650, lng: 0.160, commune: 'Angouleme', type: 'Periurbaine' },
  { code: 'FR09023', name: 'Pau', lat: 43.295, lng: -0.370, commune: 'Pau', type: 'Urbaine' },
  { code: 'FR09024', name: 'Bayonne', lat: 43.493, lng: -1.474, commune: 'Bayonne', type: 'Urbaine' },
  { code: 'FR09025', name: 'Perigueux', lat: 45.185, lng: 0.721, commune: 'Perigueux', type: 'Periurbaine' },
  { code: 'FR09026', name: 'Niort', lat: 46.323, lng: -0.459, commune: 'Niort', type: 'Periurbaine' },
  { code: 'FR09027', name: 'Lacq', lat: 43.380, lng: -0.616, commune: 'Lacq', type: 'Industrielle' },

  // === Occitanie ===
  { code: 'FR31002', name: 'Toulouse Berthelot', lat: 43.588, lng: 1.441, commune: 'Toulouse', type: 'Urbaine' },
  { code: 'FR33101', name: 'Montpellier Chaptal', lat: 43.611, lng: 3.873, commune: 'Montpellier', type: 'Urbaine' },
  { code: 'FR31010', name: 'Perpignan', lat: 42.699, lng: 2.896, commune: 'Perpignan', type: 'Urbaine' },
  { code: 'FR31011', name: 'Nimes', lat: 43.837, lng: 4.360, commune: 'Nimes', type: 'Urbaine' },
  { code: 'FR31012', name: 'Tarbes', lat: 43.233, lng: 0.078, commune: 'Tarbes', type: 'Periurbaine' },
  { code: 'FR31013', name: 'Beziers', lat: 43.344, lng: 3.216, commune: 'Beziers', type: 'Periurbaine' },
  { code: 'FR31014', name: 'Albi', lat: 43.929, lng: 2.148, commune: 'Albi', type: 'Periurbaine' },
  { code: 'FR31015', name: 'Rodez', lat: 44.350, lng: 2.575, commune: 'Rodez', type: 'Periurbaine' },
  { code: 'FR31016', name: 'Castres', lat: 43.606, lng: 2.240, commune: 'Castres', type: 'Periurbaine' },

  // === PACA ===
  { code: 'FR15018', name: 'Marseille Timone', lat: 43.289, lng: 5.396, commune: 'Marseille', type: 'Urbaine' },
  { code: 'FR16003', name: 'Nice Arson', lat: 43.703, lng: 7.282, commune: 'Nice', type: 'Urbaine' },
  { code: 'FR25040', name: 'Toulon Chalucet', lat: 43.120, lng: 5.935, commune: 'Toulon', type: 'Urbaine' },
  { code: 'FR06501', name: 'Fos-sur-Mer', lat: 43.453, lng: 4.944, commune: 'Fos-sur-Mer', type: 'Industrielle' },
  { code: 'FR15020', name: 'Aix-en-Provence', lat: 43.529, lng: 5.447, commune: 'Aix-en-Provence', type: 'Urbaine' },
  { code: 'FR16010', name: 'Cannes', lat: 43.551, lng: 7.013, commune: 'Cannes', type: 'Urbaine' },
  { code: 'FR15021', name: 'Avignon', lat: 43.949, lng: 4.806, commune: 'Avignon', type: 'Urbaine' },
  { code: 'FR15022', name: 'Gap', lat: 44.559, lng: 6.080, commune: 'Gap', type: 'Rurale' },
  { code: 'FR15023', name: 'Martigues', lat: 43.405, lng: 5.054, commune: 'Martigues', type: 'Industrielle' },

  // === Corse ===
  { code: 'FR36001', name: 'Ajaccio Canetto', lat: 41.919, lng: 8.739, commune: 'Ajaccio', type: 'Urbaine' },
  { code: 'FR36002', name: 'Bastia', lat: 42.697, lng: 9.451, commune: 'Bastia', type: 'Urbaine' },

  // === Outre-mer ===
  { code: 'FR38003', name: 'Saint-Denis Reunion', lat: -20.879, lng: 55.448, commune: 'Saint-Denis', type: 'Urbaine' },
  { code: 'FR38010', name: 'Le Port Reunion', lat: -20.935, lng: 55.295, commune: 'Le Port', type: 'Industrielle' },
  { code: 'FR39001', name: 'Pointe-a-Pitre', lat: 16.242, lng: -61.533, commune: 'Pointe-a-Pitre', type: 'Urbaine' },
  { code: 'FR40001', name: 'Fort-de-France', lat: 14.601, lng: -61.073, commune: 'Fort-de-France', type: 'Urbaine' },
  { code: 'FR41001', name: 'Cayenne', lat: 4.922, lng: -52.326, commune: 'Cayenne', type: 'Urbaine' },

  // === Stations rurales / fond ===
  { code: 'FR35099', name: 'Rural Lozere', lat: 44.393, lng: 3.733, commune: 'La Nouaille', type: 'Rurale' },
  { code: 'FR35100', name: 'Rural Morvan', lat: 47.267, lng: 4.083, commune: 'Chateau-Chinon', type: 'Rurale' },
  { code: 'FR35101', name: 'Rural Vosges', lat: 48.067, lng: 6.683, commune: 'Remiremont', type: 'Rurale' },
  { code: 'FR35102', name: 'Rural Pyrenees', lat: 42.933, lng: 0.133, commune: 'Luchon', type: 'Rurale' },
  { code: 'FR35103', name: 'Rural Alpes Sud', lat: 44.250, lng: 6.517, commune: 'Barcelonnette', type: 'Rurale' },
];

function generateMeasurementsForStation(station, now, days) {
  const rows = [];

  for (let d = days; d >= 0; d--) {
    for (let h = 0; h < 24; h++) {
      const dateStart = new Date(now);
      dateStart.setDate(dateStart.getDate() - d);
      dateStart.setHours(h, 0, 0, 0);

      const dateEnd = new Date(dateStart);
      dateEnd.setHours(h + 1);

      const basePollution = station.type === 'Industrielle' ? 55
        : station.type === 'Urbaine' ? 40
        : station.type === 'Periurbaine' ? 25
        : 10;

      const rushHourBonus = (h >= 8 && h <= 10) || (h >= 17 && h <= 19) ? 15 : 0;
      const noise = (Math.random() - 0.5) * 20;

      const pm25 = Math.max(0, basePollution * 0.6 + noise * 0.5 + rushHourBonus * 0.5);
      const pm10 = Math.max(0, pm25 * 1.8 + (Math.random() - 0.5) * 10);
      const no2  = Math.max(0, basePollution * 0.8 + rushHourBonus + noise);
      const o3   = Math.max(0, 60 - no2 * 0.5 + (Math.random() - 0.5) * 15);

      const pollutionIndex = Math.min(100, Math.max(0,
        Math.round(pm25 * 0.3 + pm10 * 0.1 + no2 * 0.35 + (100 - o3) * 0.25 + noise * 0.2)
      ));

      const baseTemp   = 15 - (station.lat - 43) * 0.8;
      const temperature = Math.round((baseTemp + Math.sin(h / 24 * Math.PI * 2 - Math.PI / 2) * 5 + (Math.random() - 0.5) * 3) * 10) / 10;
      const humidity   = Math.min(100, Math.max(20, Math.round(65 + (Math.random() - 0.5) * 30)));
      const windSpeed  = Math.max(0, Math.round((5 + (Math.random() - 0.5) * 8) * 10) / 10);

      rows.push([
        station.code,
        dateStart.toISOString(),
        dateEnd.toISOString(),
        pollutionIndex,
        temperature,
        humidity,
        windSpeed,
        Math.round(pm25 * 10) / 10,
        Math.round(pm10 * 10) / 10,
        Math.round(no2  * 10) / 10,
        Math.round(o3   * 10) / 10,
      ]);
    }
  }

  return rows;
}

async function seed() {
  await initDb(); // crée les tables si besoin

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Nettoyage
    await client.query('DELETE FROM measurements');
    await client.query('DELETE FROM stations');

    // Insertion des stations
    for (const station of STATIONS) {
      await client.query(
        `INSERT INTO stations (code, name, latitude, longitude, commune, type_implantation)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [station.code, station.name, station.lat, station.lng, station.commune, station.type]
      );
    }

    // Insertion des mesures station par station (évite un tableau géant en mémoire)
    const now  = new Date();
    const days = 7;

    console.log(`[Seed] Generating mock data for ${STATIONS.length} stations x ${days} days x 24h...`);

    for (const station of STATIONS) {
      const rows = generateMeasurementsForStation(station, now, days);

      // Insertion en batch avec un seul INSERT multi-valeurs par station
      const placeholders = rows.map((_, i) => {
        const base = i * 11;
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11})`;
      }).join(',');

      await client.query(
        `INSERT INTO measurements
           (station_code, date_start, date_end, pollution_index, temperature, humidity, wind_speed, pm25, pm10, no2, o3)
         VALUES ${placeholders}`,
        rows.flat()
      );
    }

    await client.query('COMMIT');

    const { rows: [sc] } = await client.query('SELECT COUNT(*) AS c FROM stations');
    const { rows: [mc] } = await client.query('SELECT COUNT(*) AS c FROM measurements');
    console.log(`[Seed] Done: ${sc.c} stations, ${mc.c} measurements`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Error, transaction rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});