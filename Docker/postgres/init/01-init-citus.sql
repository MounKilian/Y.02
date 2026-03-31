-- =============================================================================
-- 01-init-citus.sql  Initialisation du cluster Citus
-- Excut automatiquement par docker-entrypoint-initdb.d au premier
-- dmarrage du coordinator (PGDATA vide), APRS 00-configure.sh.
--
-- Ordre des oprations :
--   1. Extension Citus (shared_preload_libraries dj gr par l'image)
--   2. Extension PostGIS
--   3. Schma applicatif (stations + mesures)
--   4. Distribution Citus par region_code (32 shards)
--   5. Enregistrement des workers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- L'image citusdata/citus inclut shared_preload_libraries='citus' par dfaut.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS citus;
CREATE EXTENSION IF NOT EXISTS postgis;


-- -----------------------------------------------------------------------------
-- 2. Schma applicatif  Stations mto
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stations (
    id              SERIAL,
    station_id      VARCHAR(20)  NOT NULL UNIQUE,
    nom             VARCHAR(100) NOT NULL,
    region_code     VARCHAR(10)  NOT NULL,
    -- Coordonnes GPS de la station
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    -- Colonne gographique PostGIS (calcule automatiquement)
    geom            GEOGRAPHY(POINT, 4326),
    actif           BOOLEAN DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, region_code)
);

-- Index spatial pour les requtes de proximit (ST_DWithin)
CREATE INDEX IF NOT EXISTS idx_stations_geom
    ON stations USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_stations_region
    ON stations (region_code);


-- -----------------------------------------------------------------------------
-- 3. Schma applicatif  Mesures
-- Schma minimal requis : indice_composite + horodatage + coordonnes GPS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesures (
    id                  BIGSERIAL,
    station_id          VARCHAR(20)  NOT NULL,
    region_code         VARCHAR(10)  NOT NULL,

    -- Horodatage de la mesure
    horodatage          TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Coordonnes GPS de la station (dupliques pour les requtes rapides)
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,

    -- Indice composite calcul par l'quipe Data (0=optimal, 100=critique)
    indice_composite    DOUBLE PRECISION,
    indice_meteo        DOUBLE PRECISION,
    indice_pollution    DOUBLE PRECISION,

    -- Donnes brutes pollution (LCSQA)
    pm25                DOUBLE PRECISION,   -- g/m
    pm10                DOUBLE PRECISION,   -- g/m
    no2                 DOUBLE PRECISION,   -- g/m
    o3                  DOUBLE PRECISION,   -- g/m
    indice_atmo         INTEGER,            -- Indice ATMO 1-10

    -- Donnes brutes mto (SYNOP OMM)
    temperature         DOUBLE PRECISION,   -- C
    humidite            DOUBLE PRECISION,   -- %
    vent_vitesse        DOUBLE PRECISION,   -- km/h
    pression            DOUBLE PRECISION,   -- hPa

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- La cl primaire DOIT inclure region_code (cl de distribution Citus)
    PRIMARY KEY (id, region_code)
);

-- Index pour les requtes filtres par date (les plus frquentes)
CREATE INDEX IF NOT EXISTS idx_mesures_horodatage
    ON mesures (horodatage DESC);

CREATE INDEX IF NOT EXISTS idx_mesures_station_date
    ON mesures (station_id, horodatage DESC);


-- -----------------------------------------------------------------------------
-- 4. Distribution Citus  32 shards par region_code
--
-- create_distributed_table distribue les lignes sur les workers selon
-- un hash de region_code. Toutes les mesures d'une mme rgion sont
-- co-localises sur le mme worker  les JOINs sont locaux (pas de
-- transfert rseau inter-nuds).
--
-- La co-localisation stations/mesures garantit que les JOINs entre
-- ces deux tables sont toujours excuts localement.
-- -----------------------------------------------------------------------------
SELECT create_distributed_table('stations', 'region_code');
SELECT create_distributed_table('mesures',  'region_code',
       colocate_with => 'stations');


-- -----------------------------------------------------------------------------
-- 5. Enregistrement des workers Citus
--
-- Les noms 'citus_worker1' et 'citus_worker2' sont rsolus par le DNS
-- interne Docker (rseau network_internal). Ils doivent correspondre
-- exactement aux container_name dclars dans docker-compose.yml.
--
-- Excut dans un bloc DO pour afficher un message de confirmation.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    PERFORM citus_add_node('citus_worker1', 5432);
    RAISE NOTICE 'Worker 1 enregistr : citus_worker1:5432';

    PERFORM citus_add_node('citus_worker2', 5432);
    RAISE NOTICE 'Worker 2 enregistr : citus_worker2:5432';

    RAISE NOTICE 'Cluster Citus initialis  2 workers, 32 shards par table.';
END
$$;
