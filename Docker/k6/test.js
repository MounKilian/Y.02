// k6/test.js  AirWiz load test
// Lancement : docker compose --profile test run --rm k6
//
// Ce script teste les endpoints principaux de l'API backend.
// Modifier BASE_URL pour cibler un environnement spcifique.

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // monte progressive  10 utilisateurs
    { duration: '1m',  target: 10 },  // maintien
    { duration: '30s', target: 0  },  // descente
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% des requtes sous 500ms
    http_req_failed:   ['rate<0.01'],  // moins de 1% d'erreurs
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://frontend:80';

export default function () {
  // Test endpoint de sant
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, { 'health OK': (r) => r.status === 200 });

  // Test endpoint stations
  const stations = http.get(`${BASE_URL}/api/stations`);
  check(stations, {
    'stations OK':      (r) => r.status === 200,
    'stations non vide': (r) => r.json().length > 0,
  });

  // Test endpoint mesures avec filtre rgion
  const mesures = http.get(`${BASE_URL}/api/mesures?region=IDF`);
  check(mesures, { 'mesures IDF OK': (r) => r.status === 200 });

  sleep(1);
}
