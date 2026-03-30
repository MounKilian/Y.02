#!/bin/bash
# =============================================================================
# init-slave.sh — Initialisation du nœud Slave PostgreSQL
#
# Ce script est exécuté par docker-entrypoint-initdb.d lors du premier
# démarrage du conteneur Slave (PGDATA vide). Il remplace l'initialisation
# PostgreSQL standard (initdb) par une copie des données du Master via
# pg_basebackup, établissant ainsi la réplication en streaming.
#
# Ordre d'exécution :
#   1. Vider le PGDATA initialisé par l'entrypoint Docker (initdb)
#   2. Copier les données du Master via pg_basebackup
#   3. Créer standby.signal pour démarrer en mode standby
#   4. Écrire postgresql.auto.conf avec primary_conninfo
# =============================================================================

set -e
# Arrêt immédiat en cas d'erreur — évite une initialisation partielle
# qui laisserait le Slave dans un état incohérent.

echo "==> Initialisation du Slave : pg_basebackup depuis ${PRIMARY_HOST}:${PRIMARY_PORT}"

# Lecture du mot de passe de réplication depuis le fichier secret Docker.
# Le fichier est monté en mémoire dans /run/secrets/ par Docker Secrets —
# jamais écrit sur disque, jamais visible dans les variables d'environnement.
export PGPASSWORD=$(cat /run/secrets/replication_password)

# Attente que le Master soit prêt à accepter des connexions de réplication.
# pg_isready vérifie uniquement la disponibilité TCP — on attend en plus
# que l'utilisateur replicator soit créé (par le script init du Master).
until pg_isready -h "${PRIMARY_HOST}" -p "${PRIMARY_PORT}" -U "${REPLICATION_USER}"; do
  echo "==> Master non disponible, nouvelle tentative dans 2s..."
  sleep 2
done

echo "==> Master disponible. Lancement de pg_basebackup..."

# Suppression du PGDATA initialisé par l'entrypoint Docker.
# docker-entrypoint.sh exécute initdb avant initdb.d, créant un PGDATA
# vide incompatible avec pg_basebackup qui requiert un répertoire vide.
rm -rf "${PGDATA:?}"/*

# pg_basebackup copie l'intégralité des données du Master vers le Slave.
# Options :
#   -h / -p / -U : connexion au Master
#   -D            : répertoire de destination (PGDATA du Slave)
#   -Xs           : inclure les WAL produits pendant la sauvegarde (streaming)
#   -P            : afficher la progression
#   -R            : générer automatiquement standby.signal et postgresql.auto.conf
pg_basebackup \
  -h "${PRIMARY_HOST}" \
  -p "${PRIMARY_PORT}" \
  -U "${REPLICATION_USER}" \
  -D "${PGDATA}" \
  -Xs \
  -P \
  -R

echo "==> pg_basebackup terminé. Création du slot de réplication..."

# Création du slot de réplication nommé sur le Master.
# Le slot garantit que le Master conserve les WAL nécessaires au Slave
# même lors d'une déconnexion prolongée, sans risque de rotation des WAL.
psql -h "${PRIMARY_HOST}" -p "${PRIMARY_PORT}" -U "${REPLICATION_USER}" \
  -c "SELECT pg_create_physical_replication_slot('slave_slot', true);" \
  || echo "==> Slot déjà existant, poursuite..."

# Ajout du slot dans postgresql.auto.conf (généré par pg_basebackup -R)
echo "primary_slot_name = 'slave_slot'" >> "${PGDATA}/postgresql.auto.conf"

echo "==> Slave initialisé avec succès. Démarrage en mode standby."

unset PGPASSWORD
