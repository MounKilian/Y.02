#!/bin/bash
# =============================================================================
# 00-configure.sh  Configuration pg_hba et paramtres WAL
#
# Excut EN PREMIER par docker-entrypoint-initdb.d (ordre alphabtique).
# Configure :
#   - pg_hba.conf pour autoriser la rplication depuis le Slave
#   - Paramtres WAL via ALTER SYSTEM (appliqus sans redmarrage)
#   - Cration de l'utilisateur replicator avec le bon mot de passe
# =============================================================================

set -e

echo "==> Configuration pg_hba.conf pour la rplication..."

# Ajouter les rgles de rplication dans pg_hba.conf
# (le fichier est dans $PGDATA aprs initdb)
cat >> "$PGDATA/pg_hba.conf" << 'EOF'

# Rplication : autoriser l'utilisateur replicator depuis n'importe quelle IP
# du rseau interne Docker (172.16.0.0/12 couvre tout le subnet bridge)
host    replication     replicator      172.16.0.0/12           md5
host    replication     replicator      10.0.0.0/8              md5
host    all             all             172.16.0.0/12           md5
host    all             all             10.0.0.0/8              md5
EOF

echo "==> Configuration des paramtres WAL..."

# Paramtres de rplication  ALTER SYSTEM crit dans postgresql.auto.conf
# qui est lu APRS postgresql.conf donc prioritaire
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" << 'EOSQL'
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET max_wal_senders = 5;
ALTER SYSTEM SET wal_keep_size = '256MB';
ALTER SYSTEM SET max_replication_slots = 5;
ALTER SYSTEM SET listen_addresses = '*';
EOSQL

echo "==> Paramtres WAL configurs."

# Cration de l'utilisateur replicator avec le mot de passe depuis Docker Secret
REPLICATION_PASSWORD=$(cat /run/secrets/replication_password | tr -d '\n')

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" << EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'replicator') THEN
    CREATE USER replicator WITH
      REPLICATION
      LOGIN
      ENCRYPTED PASSWORD '$REPLICATION_PASSWORD';
    RAISE NOTICE 'Utilisateur replicator cr.';
  ELSE
    ALTER USER replicator WITH PASSWORD '$REPLICATION_PASSWORD';
    RAISE NOTICE 'Mot de passe replicator mis  jour.';
  END IF;
END
\$\$;
EOSQL

echo "==> Utilisateur replicator configur."
