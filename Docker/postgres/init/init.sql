-- AirWiz -- Citus master initialization
-- Runs once on first startup (empty PGDATA)

-- 1. Citus extension
CREATE EXTENSION IF NOT EXISTS citus;

-- 2. Replication user
-- Password matches secrets/replication_password.txt
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'replicator') THEN
    CREATE USER replicator WITH REPLICATION LOGIN
      PASSWORD 'replication123*';
  END IF;
END
$$;

-- 3. Replication slot (created here so slave can connect immediately)
SELECT pg_create_physical_replication_slot('slave_slot', true)
WHERE NOT EXISTS (
  SELECT FROM pg_replication_slots WHERE slot_name = 'slave_slot'
);

-- 4. Stations table
CREATE TABLE IF NOT EXISTS stations (
    id          SERIAL,
    station_id  VARCHAR(20)  NOT NULL,
    nom         VARCHAR(100),
    region_code VARCHAR(10)  NOT NULL,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    actif       BOOLEAN DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, region_code)
);

CREATE INDEX IF NOT EXISTS idx_stations_region ON stations (region_code);

-- 5. Mesures table
CREATE TABLE IF NOT EXISTS mesures (
    id               BIGSERIAL,
    station_id       VARCHAR(20)  NOT NULL,
    region_code      VARCHAR(10)  NOT NULL,
    horodatage       TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude         DOUBLE PRECISION NOT NULL,
    longitude        DOUBLE PRECISION NOT NULL,
    indice_composite DOUBLE PRECISION,
    indice_meteo     DOUBLE PRECISION,
    indice_pollution DOUBLE PRECISION,
    pm25             DOUBLE PRECISION,
    pm10             DOUBLE PRECISION,
    no2              DOUBLE PRECISION,
    o3               DOUBLE PRECISION,
    indice_atmo      INTEGER,
    temperature      DOUBLE PRECISION,
    humidite         DOUBLE PRECISION,
    vent_vitesse     DOUBLE PRECISION,
    pression         DOUBLE PRECISION,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, region_code)
);

CREATE INDEX IF NOT EXISTS idx_mesures_horodatage   ON mesures (horodatage DESC);
CREATE INDEX IF NOT EXISTS idx_mesures_station_date ON mesures (station_id, horodatage DESC);

-- 6. Distribute tables by region_code
SELECT create_distributed_table('stations', 'region_code');
SELECT create_distributed_table('mesures', 'region_code', colocate_with => 'stations');

-- 7. Register workers
SELECT citus_add_node('citus_worker1', 5432);
SELECT citus_add_node('citus_worker2', 5432);
