-- =============================================================================
-- 01-init-citus.sql — Initialisation du cluster Citus
-- Exécuté automatiquement par docker-entrypoint-initdb.d au premier
-- démarrage du coordinator (PGDATA vide).
--
-- Ordre des opérations :
--   1. Activation de l'extension Citus
--   2. Création de l'utilisateur de réplication
--   3. Création du schéma applicatif
--   4. Déclaration de la table distribuée avec region_code comme clé
--   5. Enregistrement des workers Citus
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extension Citus
-- shared_preload_libraries = 'citus' dans postgresql.conf est requis
-- préalablement — sans lui, cette instruction échoue au démarrage.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS citus;

-- PostGIS ajoute le support des types géographiques (GEOGRAPHY, GEOMETRY)
-- et des fonctions spatiales (ST_Distance, ST_Within...).
-- Indispensable pour stocker les coordonnées des stations météo et implémenter
-- le filtrage géographique côté base de données.
CREATE EXTENSION IF NOT EXISTS postgis;


-- -----------------------------------------------------------------------------
-- 2. Utilisateur de réplication
-- Créé avec le rôle REPLICATION uniquement — aucun accès aux données
-- applicatives. Le mot de passe est lu depuis la variable d'environnement
-- injectée par Docker au démarrage du conteneur.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'replicator') THEN
    CREATE USER replicator WITH
      REPLICATION
      LOGIN
      ENCRYPTED PASSWORD current_setting('app.replication_password', true);
  END IF;
END
$$;

-- Fallback si la variable app.replication_password n'est pas définie :
-- l'utilisateur est créé sans mot de passe et devra être modifié manuellement.
-- En pratique, le mot de passe est injecté via le script d'entrypoint Docker.


-- -----------------------------------------------------------------------------
-- 3. Schéma applicatif — Stations météo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stations (
    id              SERIAL,
    station_id      VARCHAR(20)  NOT NULL UNIQUE,
    nom             VARCHAR(100) NOT NULL,
    region_code     VARCHAR(10)  NOT NULL,
    -- region_code est la clé de sharding Citus. Toutes les mesures
    -- d'une station sont co-localisées avec la station sur le même shard,
    -- garantissant que les JOINs stations/mesures ne nécessitent pas
    -- de requêtes réseau inter-workers (colocation Citus).
    departement     VARCHAR(10),
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    altitude        INTEGER,
    geom            GEOGRAPHY(POINT, 4326),
    -- Colonne géographique PostGIS permettant les requêtes spatiales :
    -- ST_DWithin(geom, ST_Point(lon, lat)::geography, rayon_metres)
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index spatial sur la colonne géographique pour les requêtes de proximité.
-- GIST est l'index approprié pour les types géographiques PostGIS.
CREATE INDEX IF NOT EXISTS idx_stations_geom ON stations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_stations_region ON stations (region_code);


-- -----------------------------------------------------------------------------
-- 4. Schéma applicatif — Mesures et indices composites
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesures (
    id              BIGSERIAL,
    station_id      VARCHAR(20)  NOT NULL,
    region_code     VARCHAR(10)  NOT NULL,
    -- region_code doit être présent dans cette table car c'est la clé
    -- de distribution Citus. Sans elle dans la table mesures, Citus ne
    -- peut pas co-localiser les mesures avec les stations correspondantes.
    horodatage      TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Données météorologiques brutes (OpenData gouvernement)
    temperature     DOUBLE PRECISION,   -- °C
    humidite        DOUBLE PRECISION,   -- %
    pression        DOUBLE PRECISION,   -- hPa
    vent_vitesse    DOUBLE PRECISION,   -- km/h
    vent_direction  DOUBLE PRECISION,   -- degrés
    precipitations  DOUBLE PRECISION,   -- mm

    -- Données pollution atmosphérique brutes (OpenData gouvernement)
    indice_atmo     INTEGER,            -- Indice ATMO 1-10 (Atmo France)
    pm25            DOUBLE PRECISION,   -- µg/m³ (particules fines)
    pm10            DOUBLE PRECISION,   -- µg/m³ (particules)
    no2             DOUBLE PRECISION,   -- µg/m³ (dioxyde d'azote)
    o3              DOUBLE PRECISION,   -- µg/m³ (ozone)

    -- Indice composite calculé par le service Data
    -- Combine météo défavorable (froid, humidité, vent) et pollution
    -- pour produire un score d'impact global sur la qualité de vie.
    -- Valeur entre 0 (conditions optimales) et 100 (conditions critiques).
    indice_composite    DOUBLE PRECISION,
    indice_meteo        DOUBLE PRECISION,   -- sous-score météo
    indice_pollution    DOUBLE PRECISION,   -- sous-score pollution

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (id, region_code)
    -- La clé primaire doit inclure region_code (clé de distribution Citus).
    -- Citus exige que la clé de distribution fasse partie de toute contrainte
    -- d'unicité ou clé primaire sur une table distribuée.
);

-- Index sur les colonnes de filtrage les plus fréquentes
CREATE INDEX IF NOT EXISTS idx_mesures_station_time
    ON mesures (station_id, horodatage DESC);
CREATE INDEX IF NOT EXISTS idx_mesures_region_time
    ON mesures (region_code, horodatage DESC);
CREATE INDEX IF NOT EXISTS idx_mesures_indice
    ON mesures (indice_composite DESC);


-- -----------------------------------------------------------------------------
-- 5. Distribution Citus — Déclaration des tables distribuées
--
-- create_distributed_table() partitionne la table sur tous les workers
-- selon la clé de distribution (region_code). Citus crée 32 shards
-- (citus.shard_count) répartis équitablement sur les workers enregistrés.
--
-- La co-location entre stations et mesures (même clé de distribution)
-- garantit que les JOINs entre ces deux tables sont exécutés localement
-- sur chaque worker, sans transfert de données inter-nœuds.
-- -----------------------------------------------------------------------------
SELECT create_distributed_table('stations', 'region_code');
SELECT create_distributed_table('mesures', 'region_code', colocate_with => 'stations');


-- -----------------------------------------------------------------------------
-- 6. Enregistrement des workers Citus
-- Les workers doivent être enregistrés après leur démarrage.
-- Les noms 'citus_worker1' et 'citus_worker2' sont résolus par le DNS
-- interne Docker via network_internal.
-- Ce bloc est protégé par un DO $$ pour éviter les erreurs si les workers
-- sont déjà enregistrés (redémarrage du coordinator).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM citus_add_node('citus_worker1', 5432);
  PERFORM citus_add_node('citus_worker2', 5432);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Workers déjà enregistrés ou non disponibles : %', SQLERRM;
END
$$;

-- Vérification de l'état du cluster après initialisation
SELECT * FROM citus_get_active_worker_nodes();
