# Infrastructure  AirWiz (Y.02)

High-availability, secured and monitored infrastructure for the **AirWiz** platform  air quality
visualization across France. This folder contains all Docker files, PostgreSQL/Citus
configurations and monitoring stack deployed by the Infra team for the Y.02 48h Challenge.

---

## Team responsibilities

Each team depends on the one above it. The data flows strictly top-down.

```
+------------------+     +------------------+     +------------------+
|   DATA TEAM      |     |   DEV TEAM       |     |   INFRA TEAM     |
|                  |     |                  |     |                  |
| - Python scripts |     | - React frontend |     | - Docker images  |
| - fetcher.py     |     | - Express API    |     | - PostgreSQL HA  |
| - geo_join.py    |     | - CRON jobs      |     | - Network isol.  |
| - forecast.py    |     | - SQLite (dev)   |     | - Monitoring     |
| - REST endpoint  |     | - /api/* routes  |     | - Secrets mgmt   |
|                  |     |                  |     |                  |
| Produces index   |     | Stores + serves  |     | Hosts everything |
| from data.gouv   |     | data to frontend |     | securely         |
+------------------+     +------------------+     +------------------+
```

---

## Full data flow

```
data.gouv.fr
  |-- LCSQA API  (482 stations, 9 pollutants: PM2.5, PM10, NO2, O3...)
  |-- SYNOP OMM  (188 weather stations: temp, wind, humidity, pressure)
         |
         | HTTP fetch (fetcher.py)
         v
+-------------------------+
|   DATA TEAM - Python    |
|  fetcher.py             |  <-- collects raw OpenData
|  geo_join.py            |  <-- joins pollution + weather (merge_asof 24h)
|  forecast.py            |  <-- computes composite index (0=best, 100=worst)
|  /indices endpoint      |  <-- exposes result as JSON REST endpoint
+-------------------------+
         |
         | CRON call (every hour, multiple times/day)
         | accessible only from internal Docker network
         v
+-------------------------+
|   DEV TEAM - Backend    |
|  Node.js / Express      |
|  CRON -> fetch /indices |  <-- pulls data from Data endpoint
|  INSERT into PostgreSQL |  <-- stores: index + timestamp + GPS coords
|  init: last 10 days     |  <-- seeded on first startup
|  /api/* routes          |  <-- only entry point for the frontend
+-------------------------+
         |                          |
         | SQL queries              | WAL streaming replication
         v                          v
+----------------+         +------------------+
|  DB Master     | ------> |  DB Slave        |
|  PostgreSQL 16 |  WAL    |  Hot standby     |
|  Citus 12      |         |  Auto failover   |
|  coordinator   |         |  Read-only       |
+----------------+         +------------------+
         |
         | shard by region_code (32 shards)
         v
+----------------+   +----------------+
|  Citus Worker1 |   |  Citus Worker2 |
|  IDF HDF NOR   |   |  AURA PACA OCC |
|  BRE PDL CVL   |   |  NAQ GES COR   |
|  16 shards     |   |  16 shards     |
+----------------+   +----------------+
         ^
         | /api/* (only contact point)
+-------------------------+
|   DEV TEAM - Frontend   |
|  React + Vite + Leaflet |
|  Interactive map        |
|  Clusters + filters     |
|  Region / date / index  |
+-------------------------+
         ^
         | HTTPS (Traefik + Let's Encrypt)
    [Browser / User]
```

> The frontend NEVER contacts the Data endpoint or the database directly.
> All data goes through the backend API (/api/*).

---

## Docker architecture (development + staging)

```
Internet
    |
    | HTTPS 443 / HTTP 80 (redirected)
    v
+----------------------------------------------------------+
|  TRAEFIK v3  --  TLS termination + Let's Encrypt        |
|  network_public                                          |
|  ports: 80, 443                                          |
+------------------+---------------------------------------+
                   |
+------------------v---------------------------------------+
|  network_public                                          |
|                                                          |
|  +----------------------------------------------------+  |
|  |  FRONTEND  React + Vite + Leaflet / Nginx Alpine   |  |
|  |  Built with: npm run build -> /usr/share/nginx/html|  |
|  |  Served by: Nginx (try_files, /api/ proxy_pass)    |  |
|  |  Image: meteo-frontend:latest                      |  |
|  +----------------------+-----------------------------+  |
+-------------------------|---------------------------------+
                          |  /api/*
+-------------------------v---------------------------------+
|  network_internal  (internal: true -- not internet-routable)
|                                                          |
|  +----------------------------------------------------+  |
|  |  BACKEND  Node.js / Express                        |  |
|  |  CRON -> http://service_data:3001/indices          |  |
|  |  INSERT mesures (index + timestamp + lat/lon)      |  |
|  |  Init on startup: last 10 days from Data endpoint  |  |
|  |  Image: meteo-backend:latest                       |  |
|  +--------+---------------------------+---------------+  |
|           |                           |                  |
|           | SQL                       | HTTP internal    |
|           v                           v                  |
|  +------------------+    +-------------------------+     |
|  |  DB MASTER       |    |  WORKER DATA - Python   |     |
|  |  PostgreSQL 16   |    |  fetcher.py             |     |
|  |  Citus 12        |    |  geo_join.py            |     |
|  |  All writes      |    |  forecast.py            |     |
|  |  coordinator     |    |  Exposes /indices       |     |
|  |  port: 5432      |    |  port: 3001 (internal)  |     |
|  +--------+---------+    +-------------------------+     |
|    WAL    |                                              |
|  +--------v---------+                                   |
|  |  DB SLAVE        |                                   |
|  |  Hot standby     |                                   |
|  |  Auto failover   |                                   |
|  |  Read-only       |                                   |
|  +------------------+                                   |
|                                                          |
|  +------------------+    +------------------+           |
|  |  CITUS WORKER 1  |    |  CITUS WORKER 2  |           |
|  |  16 shards       |    |  16 shards       |           |
|  |  North/West FR   |    |  South/East FR   |           |
|  +------------------+    +------------------+           |
+----------------------------------------------------------+

+----------------------------------------------------------+
|  network_monitoring                                      |
|                                                          |
|  cAdvisor --> Prometheus --> Grafana (public port 3030)  |
|  postgres_exporter -> replication lag, connections, locks|
+----------------------------------------------------------+
```

### Docker network rules

```
Service          | network_public | network_internal | network_monitoring
-----------------+----------------+------------------+-------------------
traefik          |      YES       |       NO         |        NO
frontend         |      YES       |       NO         |        NO
backend          |      YES       |      YES         |        NO
service_data     |       NO       |      YES         |        NO
citus_master     |       NO       |      YES         |        NO
citus_slave      |       NO       |      YES         |        NO
citus_worker1    |       NO       |      YES         |        NO
citus_worker2    |       NO       |      YES         |        NO
cadvisor         |       NO       |       NO         |       YES
prometheus       |       NO       |       NO         |       YES
grafana          |      YES       |       NO         |       YES
postgres_exporter|       NO       |      YES         |       YES
```

> backend is the ONLY service in both network_public and network_internal.
> It is the single controlled gateway between the two zones.

### Docker startup order

```
citus_worker1 \
               +---> (both healthy) ---> citus_master ---> citus_slave
citus_worker2 /                               |
                                              |
                             01-init-citus.sql runs ONCE:
                             - CREATE EXTENSION citus
                             - CREATE EXTENSION postgis
                             - CREATE TABLE mesures (index, timestamp, lat, lon, ...)
                             - create_distributed_table('mesures', 'region_code')
                             - citus_add_node(worker1), citus_add_node(worker2)
                                              |
                                         service_data (healthy)
                                              |
                                         backend (healthy)
                                         CRON starts
                                         init last 10 days
                                              |
                                    frontend + traefik
```

---

## Kubernetes architecture (production)

Kubernetes replaces Docker Compose for production deployment.
It provides native high-availability, rolling updates and fine-grained network policies.

```
                        [ Internet ]
                             |
                     +-------v-------+
                     |   Ingress     |
                     |   Traefik v3  |
                     |   TLS / ACME  |
                     +-------+-------+
                             |
               +-------------+-------------+
               |                           |
    Namespace: public             Namespace: monitoring
               |                           |
    +----------v----------+    +-----------v----------+
    |  Deployment         |    |  Deployment          |
    |  frontend           |    |  prometheus          |
    |  React/Nginx        |    |  Deployment          |
    |  replicas: 2        |    |  grafana             |
    +----------+----------+    |  DaemonSet           |
               |               |  cadvisor            |
               | /api/*        +-----------+----------+
               |                           |
    +----------v----------+                | scrape metrics
    |  Deployment         |<--------------+
    |  backend            |
    |  Node.js/Express    |
    |  replicas: 2        |
    +----+----------+-----+
         |          |
    SQL  |          | HTTP (internal)
         |          |
+--------v---+  +---v-----------+
|StatefulSet |  |  Deployment   |
|citus_master|  |  service_data |
|PostgreSQL  |  |  Python worker|
|Citus coord.|  |  replicas: 1  |
|replicas: 1 |  +---------------+
+-----+------+
      |
      | WAL streaming
      v
+-----+------+
|StatefulSet |
|citus_slave |
|Hot standby |
|replicas: 1 |
+------------+

+-----+------+   +------------+
|StatefulSet |   |StatefulSet |
|citus_worker|   |citus_worker|
|    -1      |   |    -2      |
|16 shards   |   |16 shards   |
|PVC 10Gi    |   |PVC 10Gi    |
+------------+   +------------+
```

### Kubernetes NetworkPolicy  isolation rules

```
NetworkPolicy: deny-all-ingress (namespace: internal)
--> Blocks ALL incoming traffic by default

NetworkPolicy: allow-backend-to-db
--> Allows backend (namespace: public) -> citus_master port 5432

NetworkPolicy: allow-backend-to-data
--> Allows backend (namespace: public) -> service_data port 3001

Result:
  frontend  -> citus_master  : BLOCKED (no route)
  internet  -> citus_master  : BLOCKED (no route)
  internet  -> service_data  : BLOCKED (no route)
  backend   -> citus_master  : ALLOWED (explicit policy)
  backend   -> service_data  : ALLOWED (explicit policy)
```

### Kubernetes Secrets

```
kubectl create secret generic postgres-secrets \
  --namespace internal \
  --from-literal=postgres-password="$(openssl rand -base64 32)" \
  --from-literal=replication-password="$(openssl rand -base64 32)" \
  --from-literal=jwt-secret="$(openssl rand -base64 64)"
```

Secrets are never written in YAML manifests. They are injected as environment
variables or mounted as files under /run/secrets/ inside the containers.

### StatefulSet vs Deployment

```
PostgreSQL nodes (citus_master, citus_slave, workers)
  -> StatefulSet: stable network identity (citus-master-0, citus-slave-0)
                  deterministic startup/shutdown order
                  PVC bound permanently to each Pod

Stateless services (frontend, backend, service_data)
  -> Deployment: interchangeable Pods, horizontal scaling, rolling updates
```

---

## Database schema

```sql
-- Distributed table -- sharded by region_code across Citus workers
CREATE TABLE mesures (
    id                  BIGSERIAL,
    station_id          VARCHAR(20)  NOT NULL,
    region_code         VARCHAR(10)  NOT NULL,   -- Citus shard key

    -- Timestamp of the measurement
    horodatage          TIMESTAMP WITH TIME ZONE NOT NULL,

    -- GPS coordinates of the weather/pollution station
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,

    -- Composite index computed by the Data team (0=optimal, 100=critical)
    indice_composite    DOUBLE PRECISION,
    indice_meteo        DOUBLE PRECISION,
    indice_pollution    DOUBLE PRECISION,

    -- Raw pollution data (LCSQA)
    pm25                DOUBLE PRECISION,   -- ug/m3
    pm10                DOUBLE PRECISION,   -- ug/m3
    no2                 DOUBLE PRECISION,   -- ug/m3
    o3                  DOUBLE PRECISION,   -- ug/m3
    indice_atmo         INTEGER,            -- ATMO index 1-10

    -- Raw weather data (SYNOP)
    temperature         DOUBLE PRECISION,   -- Celsius
    humidite            DOUBLE PRECISION,   -- %
    vent_vitesse        DOUBLE PRECISION,   -- km/h
    pression            DOUBLE PRECISION,   -- hPa

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (id, region_code)
    -- region_code must be part of the primary key: Citus requirement
    -- for any uniqueness constraint on a distributed table.
);

-- Distribute across Citus workers
SELECT create_distributed_table('mesures', 'region_code');

-- Co-locate stations with their measurements
-- (JOINs run locally on the same worker, no cross-node transfer)
SELECT create_distributed_table('stations', 'region_code',
       colocate_with => 'mesures');
```

---

## Project structure

```
Y.02/                               <- Dev team repository (MounKilian/Y.02)
|-- client/                         <- Frontend: React + Vite + Leaflet
|   |-- src/
|   |-- public/
|   `-- vite.config.js
|-- server/                         <- Backend: Node.js + Express
|   |-- src/
|   |-- worker/
|   `-- .env.example                <- template (no secrets committed)
|-- app/                            <- Data team: Python scripts
|   |-- fetcher.py                  <- collects LCSQA + SYNOP from data.gouv.fr
|   |-- geo_join.py                 <- joins pollution/weather (merge_asof 24h)
|   |-- forecast.py                 <- computes composite index
|   |-- main.py                     <- auto-refresh every 5 min, limit 5000
|   `-- index.py                    <- exposes /indices REST endpoint
|-- docs/
`-- README.md

Docker compose/                     <- Infra team (this folder)
|-- docker-compose.yml              <- 13 services, 3 networks, 4 secrets, 7 volumes
|-- setup.sh                        <- secrets + build + Trivy scan
|-- .env.example                    <- environment variables template
|-- .sops.yaml                      <- SOPS/Age encryption config
|-- .gitleaks.toml                  <- secret leak detection rules
|-- frontend/
|   |-- Dockerfile                  <- multi-stage: Node builder + Nginx Alpine
|   `-- nginx.conf                  <- Vue Router fallback + /api/ proxy + gzip
|-- backend/
|   `-- Dockerfile                  <- multi-stage: Node builder + Node Alpine
|-- service-data/
|   `-- Dockerfile                  <- Python worker (fetcher, geo_join, forecast)
|-- postgres/
|   |-- master/
|   |   |-- postgresql.conf         <- WAL level=replica, max_wal_senders=5
|   |   `-- pg_hba.conf             <- scram-sha-256 on internal network only
|   |-- slave/
|   |   |-- postgresql.conf         <- hot_standby=on, primary_conninfo
|   |   |-- pg_hba.conf
|   |   `-- init-slave.sh           <- pg_basebackup + standby.signal
|   |-- worker/
|   |   |-- postgresql.conf         <- shard_count=32, replication_factor=1
|   |   `-- pg_hba.conf
|   `-- init/
|       `-- 01-init-citus.sql       <- extension + schema + sharding + workers
`-- monitoring/
    |-- prometheus.yml              <- scrape: cadvisor, postgres_exporter, apps
    |-- rules.yml                   <- alerts: CPU, memory, replication lag, Citus
    `-- grafana/provisioning/
        |-- datasources/
        |   `-- prometheus.yml      <- auto-provisioned Prometheus datasource
        `-- dashboards/
            |-- dashboards.yml
            `-- docker-monitoring.json
```

---

## Compliance with the project requirements

> **Scope: Docker compose/ folder provided by the Infra team.**
> The Y.02 repository contains the Dev code -- it is not expected to include
> Docker infrastructure. Both scopes are separate and complementary.

### Infra requirements -- Docker compose/

| Requirement | Status | Evidence |
|---|---|---|
| Dockerization of all services | OK | Multi-stage Dockerfiles: frontend (React/Nginx), backend (Express), data worker (Python) |
| PostgreSQL Master/Slave cluster | OK | citus_master + citus_slave -- WAL streaming replication, auto-failover, persistent volumes |
| 2 isolated Docker networks | OK | network_public + network_internal (internal: true) -- DB and worker have zero published ports |
| DB not reachable from internet | OK | citus_master, citus_slave, workers -- network_internal only, no ports: declared |
| Data service not reachable from internet | OK | service_data -- network_internal only, endpoint accessible ONLY from backend |
| Frontend only talks to backend | OK | Frontend hits /api/* only -- never touches Data endpoint or PostgreSQL |
| CRON-based DB update | OK | Backend CRON -> Data /indices endpoint -> INSERT into PostgreSQL -- multiple times/day |
| Init with last 10 days of data | OK | Backend init script on first startup -- fetches 10 days from Data endpoint |
| Minimal schema (index + timestamp + GPS) | OK | mesures table: indice_composite, horodatage, latitude, longitude |
| Container monitoring | OK | cAdvisor + Prometheus + Grafana + postgres_exporter -- CPU/memory/replication lag alerts |
| Centralized secrets, no plaintext password | OK | Docker Secrets + SOPS/Age + BuildKit --mount=type=secret + GF_SECURITY_ADMIN_PASSWORD__FILE |
| Bonus: sharding by region | OK | create_distributed_table('mesures', 'region_code') -- 32 shards on 2 Citus workers |

### Dev repository Y.02 -- separate scope

| Item | Status | Explanation |
|---|---|---|
| .env.example in server/ | OK | Good practice -- template with no secrets committed |
| Runtime secrets (DB password, JWT...) | OK in prod | In local dev, .env is appropriate. In production, Infra replaces them with Docker Secrets via docker-compose.yml -- no Dev code change required |
| SQLite database | OK in prod | SQLite is valid for local development (zero config, embedded). In production, Infra replaces it with PostgreSQL/Citus via DATABASE_URL -- no Dev code change required |

> SQLite and .env are NOT shortcomings of the Dev team. They are valid architectural
> choices for fast 48h local development. The Infra team handles the production
> transition without requiring any refactoring of the application code.

---

## Secrets managed by Infra

| Secret | Content | Injected into |
|---|---|---|
| postgres_password | PostgreSQL main password | backend, service_data, citus_master/slave/workers |
| replication_password | WAL replication password | citus_master, citus_slave (init-slave.sh) |
| jwt_secret | JWT signing key 512 bits | backend |
| grafana_password | Grafana admin password | grafana (GF_SECURITY_ADMIN_PASSWORD__FILE) |

All secrets are mounted as tmpfs under /run/secrets/ inside containers.
No secret is visible in docker inspect, logs, or environment variables.

---

## Data sources

| Source | Data | Update frequency | Stations |
|---|---|---|---|
| LCSQA via data.gouv.fr | Pollution -- PM2.5, PM10, NO2, O3, ATMO index | Multiple times/day | 482 stations |
| SYNOP OMM via data.gouv.fr | Weather -- temperature, wind, humidity, pressure | Multiple times/day | 188 stations |

The pollution/weather join is handled by app/geo_join.py with a 24h tolerance
(pandas merge_asof). The backend CRON aligns with the LCSQA update frequency.

---

## Quick start

```bash
# 1. Clone the Y.02 application repository
git clone https://github.com/MounKilian/Y.02.git && cd Y.02

# 2. Place the "Docker compose" folder at the root (provided by Infra team)

# 3. Generate the Age key for SOPS
mkdir -p ~/.config/sops/age
age-keygen -o ~/.config/sops/age/keys.txt
age-keygen -y ~/.config/sops/age/keys.txt
# -> Copy the public key into Docker compose/.sops.yaml

# 4. Configure environment variables
cp "Docker compose/.env.example" "Docker compose/.env"
# Set required values:
#   DOMAIN_NAME=airwiz.yourdomain.com
#   ACME_EMAIL=admin@yourdomain.com
#   DATA_ENDPOINT_URL=http://service_data:3001
#   POSTGRES_USER=airwiz_user
#   POSTGRES_DB=airwiz

# 5. Full setup (secrets + SOPS encryption + Docker build + Trivy CVE scan)
cd "Docker compose" && bash setup.sh

# 6. Start the stack
docker compose up -d && docker compose ps
```

---

## Useful commands

```bash
# Check all services
docker compose ps

# Backend logs (CRON cycles + 10-day init)
docker compose logs -f backend

# Data worker logs (OpenData collection)
docker compose logs -f service_data

# Check Master/Slave replication
docker exec citus_master psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT client_addr, state, replay_lag FROM pg_stat_replication;"

# Test failover (simulate Master crash)
docker stop citus_master && sleep 15
docker exec citus_slave psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT pg_is_in_recovery();"
# Expected: f -- Slave promoted to new Master

# Check Citus shard distribution
docker exec citus_master psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT nodename, count(*) FROM pg_dist_shard_placement GROUP BY nodename;"

# Check last 10 days of data
docker exec citus_master psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT DATE(horodatage), count(*) FROM mesures
      WHERE horodatage > NOW() - interval '10 days'
      GROUP BY 1 ORDER BY 1;"

# Grafana access
# URL      : https://grafana.YOURDOMAIN
# Login    : admin
# Password : cat secrets/grafana_password.txt

# CVE scan on images
docker compose --profile scan run --rm trivy
```

---

Project built during the **Y.02 48h Challenge** -- [MounKilian/Y.02](https://github.com/MounKilian/Y.02)
