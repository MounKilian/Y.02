// autoscaler.js  AirWiz
// Ajustement dynamique des ressources des workers Citus
// selon la charge CPU/mmoire dtecte via les mtriques Prometheus.
//
// Version actuelle : placeholder  surveille les mtriques toutes les minutes.

const http = require('http');

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL_MS || '60000');

function checkMetrics() {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=container_memory_usage_bytes`;
  http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const metrics = JSON.parse(data);
        console.log(`[autoscaler] ${new Date().toISOString()}  mtriques rcupres (${metrics.data?.result?.length || 0} sries)`);
      } catch (e) {
        console.error('[autoscaler] Erreur parsing mtriques:', e.message);
      }
    });
  }).on('error', (e) => {
    console.log(`[autoscaler] Prometheus non joignable: ${e.message}  nouvelle tentative dans ${CHECK_INTERVAL/1000}s`);
  });
}

console.log(`[autoscaler] Dmarrage  vrification toutes les ${CHECK_INTERVAL/1000}s`);
checkMetrics();
setInterval(checkMetrics, CHECK_INTERVAL);
