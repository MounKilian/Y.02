# Y.02
# Infrastructure — Plateforme météo & pollution

Stack de conteneurisation, haute disponibilité, sécurité et monitoring pour la plateforme de visualisation de l'impact cumulé de la météo et de la pollution atmosphérique.

---

## Table des matières

- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Structure du projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Mise en route](#mise-en-route)
- [Secrets](#secrets)
- [Réseaux](#réseaux)
- [Base de données](#base-de-données)
- [Monitoring](#monitoring)
- [Sharding Citus](#sharding-citus)
- [Sécurité](#sécurité)
- [Commandes utiles](#commandes-utiles)

---

## Stack technique

| Composant | Technologie | Version |
|---|---|---|
| Frontend | Vue.js + Nginx Alpine | node:20-alpine |
| Backend | Node.js / Fastify | node:20-alpine |
| Service Data | Node.js | node:20-alpine |
| Base de données | PostgreSQL + Citus (sharding) | citusdata/citus:12.1 |
| Reverse proxy / TLS | Traefik + Let's Encrypt | traefik:v3.0 |
| Monitoring | Prometheus + Grafana + cAdvisor | prom:v2.51 / grafana:10.4 |
| Secrets | Docker Secrets + SOPS + Age | — |
| Scanner CVE | Trivy | aquasec/trivy:latest |

---

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  Traefik (TLS Let's Encrypt — ports 80/443)             │
│  network_public                                         │
│  ┌─────────────┐        ┌──────────────────────────┐   │
│  │  Frontend   │◄──────►│  Backend (Fastify)        │   │
│  │  Vue.js     │        │  passerelle public/intern │   │
│  │  Nginx      │        └──────────┬───────────────┘   │
└─────────────────────────────────────┼───────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────┐
│  network_internal  (internal: true — non routable)      │
│                                                         │
│  ┌──────────────┐   ┌────────────────────────────────┐  │
│  │ Service Data │   │  Citus coordinator (Master)    │  │
│  │ Node.js      │──►│  citus_master                  │  │
│  └──────────────┘   │  réplication WAL ──► Slave     │  │
│                     └──────┬────────────────────────┘  │
│                     ┌──────▼──────┐  ┌──────────────┐  │
│                     │ Worker 1    │  │  Worker 2    │  │
│                     │ IDF HDF NOR │  │  AURA PACA   │  │
│                     │ BRE PDL CVL │  │  OCC NAQ GES │  │
│                     └─────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  network_monitoring                                     │
│  cAdvisor · Prometheus · Grafana · postgres_exporter    │
└─────────────────────────────────────────────────────────┘
```

**Règle d'isolation réseau :**
- `network_internal` est déclaré `internal: true` — aucune route vers internet dans les deux sens.
- La base de données et le service Data ne sont joignables que depuis le backend.
- Le frontend n'a aucune interface sur `network_internal` — il ne peut pas atteindre la DB directement.

---

## Structure du projet

```
.
├── docker-compose.yml
├── setup.sh                          # Script d'initialisation complet
├── .env.example                      # Variables d'environnement (template)
├── .sops.yaml                        # Configuration chiffrement SOPS/Age
├── .gitleaks.toml                    # Règles détection secrets Git
│
├── secrets/                          # Jamais commité — chiffré par SOPS
│   ├── postgres_password.txt
│   ├── replication_password.txt
│   ├── jwt_secret.txt
│   └── grafana_password.txt
│
├── frontend/
│   ├── Dockerfile                    # Multi-stage : Node builder + Nginx Alpine
│   ├── nginx.conf                    # Template Nginx (envsubst au démarrage)
│   └── .dockerignore
│
├── backend/
│   ├── Dockerfile                    # Multi-stage : Node builder + Node Alpine
│   └── .dockerignore
│
├── service-data/
│   ├── Dockerfile
│   └── .dockerignore
│
├── postgres/
│   ├── master/
│   │   ├── postgresql.conf           # WAL, réplication, Citus
│   │   └── pg_hba.conf               # Authentification scram-sha-256
│   ├── slave/
│   │   ├── postgresql.conf           # hot_standby = on
│   │   ├── pg_hba.conf
│   │   └── init-slave.sh             # pg_basebackup + standby.signal
│   ├── worker/
│   │   ├── postgresql.conf           # Config workers Citus
│   │   └── pg_hba.conf
│   └── init/
│       └── 01-init-citus.sql         # Extension Citus, schéma, sharding, workers
│
└── monitoring/
    ├── prometheus.yml                # Scrape configs (cAdvisor, PG exporter, apps)
    ├── rules.yml                     # Règles d'alerte (CPU, mémoire, lag réplication)
    └── grafana/
        └── provisioning/
            ├── datasources/
            │   └── prometheus.yml    # Datasource Prometheus auto-provisionnée
            └── dashboards/
                ├── dashboards.yml
                └── docker-monitoring.json
```

---

## Prérequis

| Outil | Installation |
|---|---|
| Docker Engine ≥ 24 | `curl -fsSL https://get.docker.com \| bash` |
| Docker Compose ≥ 2.20 | Inclus dans Docker Engine |
| SOPS ≥ 3.8 | [github.com/getsops/sops/releases](https://github.com/getsops/sops/releases) |
| Age ≥ 1.1 | [github.com/FiloSottile/age/releases](https://github.com/FiloSottile/age/releases) |
| Trivy ≥ 0.50 | `curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \| sudo sh -s -- -b /usr/local/bin` |
| gitleaks ≥ 8.18 | [github.com/gitleaks/gitleaks/releases](https://github.com/gitleaks/gitleaks/releases) |

---

## Mise en route

### 1. Cloner et configurer

```bash
git clone <url-du-repo>
cd <repo>

# Créer le .env depuis le template
cp .env.example .env
# Renseigner : DOMAIN_NAME, ACME_EMAIL, OPENDATA_METEO_URL, OPENDATA_POLLUTION_URL
nano .env
```

### 2. Générer la clé Age et configurer SOPS

```bash
# Générer la paire de clés Age
mkdir -p ~/.config/sops/age
age-keygen -o ~/.config/sops/age/keys.txt

# Copier la clé publique dans .sops.yaml
age-keygen -y ~/.config/sops/age/keys.txt
# Remplacer age1XXX... dans .sops.yaml par la clé publique affichée
```

### 3. Lancer le script de setup

```bash
bash setup.sh
```

Le script exécute dans l'ordre :
1. Activation de BuildKit
2. Génération des secrets via OpenSSL (256+ bits d'entropie)
3. Chiffrement SOPS de tous les fichiers `secrets/*.txt`
4. Scan gitleaks pour détecter toute fuite accidentelle
5. Validation du `.env`
6. Build des images Docker avec BuildKit
7. Scan Trivy — bloque si CVE CRITICAL détectée

### 4. Démarrer la stack

```bash
docker compose up -d

# Suivre les logs de démarrage
docker compose logs -f --tail=50

# Vérifier l'état de tous les services
docker compose ps
```

**Ordre de démarrage garanti par les `depends_on: condition: service_healthy` :**

```
citus_worker1 + citus_worker2
        ↓
   citus_master  (initdb + extension Citus + sharding)
        ↓
citus_slave + service_data
        ↓
     backend
        ↓
frontend + traefik + monitoring
```

---

## Secrets

Les secrets suivent la chaîne : **génération → chiffrement → runtime**.

| Secret | Contenu | Injecté dans |
|---|---|---|
| `postgres_password` | Mot de passe PostgreSQL principal | citus_master, slave, workers, backend, service_data |
| `replication_password` | Mot de passe réplication WAL | citus_master, citus_slave |
| `jwt_secret` | Clé de signature JWT (512 bits) | backend |
| `grafana_password` | Mot de passe admin Grafana | grafana |

**Règles absolues :**

- Aucun mot de passe dans `docker-compose.yml`, les `Dockerfile` ou le code source.
- Les secrets sont montés en **tmpfs** sous `/run/secrets/` — aucune trace sur le disque du conteneur.
- Les services utilisent la convention `_FILE` (`POSTGRES_PASSWORD_FILE`, `GF_SECURITY_ADMIN_PASSWORD__FILE`) — les valeurs ne transitent jamais par les variables d'environnement.
- BuildKit `--mount=type=secret` protège les secrets de build — absents des couches image et de `docker history`.

**Déchiffrer pour un lancement local :**

```bash
export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt
for f in secrets/*.txt; do sops --decrypt --in-place $f; done
```

**Re-chiffrer avant tout commit :**

```bash
for f in secrets/*.txt; do sops --encrypt --in-place $f; done
```

---

## Réseaux

| Réseau | Type | Services | Exposé |
|---|---|---|---|
| `network_public` | bridge | traefik, frontend, backend, grafana | Oui (80/443 via Traefik) |
| `network_internal` | bridge `internal: true` | backend, service_data, citus_* | Non |
| `network_monitoring` | bridge | cadvisor, prometheus, grafana, postgres_exporter | Non |

**Vérifier l'isolation :**

```bash
# La DB doit être inaccessible depuis le frontend
docker exec frontend nslookup citus_master
# Résultat attendu : can't resolve 'citus_master'

# Aucun port 5432 exposé sur l'hôte
docker compose ps | grep 5432
# Résultat attendu : (aucune ligne)
```

---

## Base de données

### Architecture Citus

```
Coordinator (citus_master)
├── Reçoit toutes les requêtes SQL
├── Route vers les workers selon region_code
└── Répliqué vers citus_slave (WAL streaming)

Worker 1 (citus_worker1) — 16 shards
└── Régions : IDF, HDF, NOR, BRE, PDL, CVL, BFC

Worker 2 (citus_worker2) — 16 shards
└── Régions : AURA, PACA, OCC, NAQ, GES, COR
```

### Vérifier la réplication

```bash
# État de la réplication (doit afficher state=streaming)
docker exec citus_master psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT client_addr, state, replay_lag FROM pg_stat_replication;"

# Le Slave doit être en mode recovery
docker exec citus_slave psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT pg_is_in_recovery();"
# Résultat attendu : t
```

### Tester le failover

```bash
# Arrêter le Master
docker stop citus_master

# Après ~15 secondes, le Slave est promu
docker exec citus_slave psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT pg_is_in_recovery();"
# Résultat attendu : f (le Slave est devenu Master)

# Redémarrer l'ancien Master (rejoint en tant que nouveau Slave)
docker start citus_master
```

### Vérifier le sharding

```bash
# Répartition des shards sur les workers
docker exec citus_master psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT nodename, count(*) AS shards FROM pg_dist_shard_placement GROUP BY nodename;"

# Vérifier le partition pruning (Task Count doit être 1)
docker exec citus_master psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "EXPLAIN SELECT * FROM mesures WHERE region_code = 'IDF';"
```

---

## Monitoring

| Service | Rôle | Accès |
|---|---|---|
| cAdvisor | Métriques Docker (CPU, mémoire, I/O) | Interne (scraping Prometheus) |
| Prometheus | Stockage séries temporelles, évaluation alertes | Interne |
| Grafana | Dashboards et visualisation | `https://grafana.DOMAIN_NAME` |
| postgres_exporter | Métriques PostgreSQL/Citus (réplication, connexions) | Interne |

**Accès Grafana :**

```
URL      : https://grafana.VOTRE_DOMAINE
Login    : admin (ou GRAFANA_ADMIN_USER dans .env)
Password : contenu de secrets/grafana_password.txt
```

**Alertes configurées (`monitoring/rules.yml`) :**

| Alerte | Seuil | Sévérité |
|---|---|---|
| `ServiceDown` | Service indisponible > 1 min | critical |
| `ContainerCpuHigh` | CPU > 80% pendant 5 min | warning |
| `ContainerMemoryHigh` | Mémoire > 85% de la limite | warning |
| `ContainerMemoryCritical` | Mémoire > 95% de la limite | critical |
| `PostgresReplicationLag` | Lag > 30s pendant 2 min | warning |
| `PostgresReplicationLagCritical` | Lag > 120s | critical |
| `CitusWorkerDown` | Worker Citus inaccessible > 2 min | critical |

---

## Sharding Citus

La table `mesures` est distribuée sur les workers selon la clé `region_code`. La co-localisation avec la table `stations` (même clé) garantit que les JOINs sont exécutés localement sur chaque worker sans transfert réseau inter-nœuds.

```sql
-- Déclaré dans postgres/init/01-init-citus.sql
SELECT create_distributed_table('stations', 'region_code');
SELECT create_distributed_table('mesures', 'region_code', colocate_with => 'stations');
```

**Ajouter un worker Citus :**

```bash
# 1. Ajouter le service dans docker-compose.yml
# 2. Démarrer le nouveau worker
docker compose up -d citus_worker3

# 3. Enregistrer le worker sur le coordinator
docker exec citus_master psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT citus_add_node('citus_worker3', 5432);"

# 4. Rééquilibrer les shards
docker exec citus_master psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT rebalance_table_shards('mesures');"
```

---

## Sécurité

### Checklist

- [x] Builds multi-stage — images légères sans outils de build
- [x] Images Alpine — surface d'attaque réduite
- [x] Utilisateur non-root dans toutes les images (`USER appuser`)
- [x] BuildKit `--mount=type=secret` — secrets absents des couches image
- [x] Docker Secrets runtime — montés en tmpfs sous `/run/secrets/`
- [x] Convention `_FILE` — aucun secret dans les variables d'environnement
- [x] `tmpfs` sur `/tmp` et `/var/run/postgresql` — pas de trace disque
- [x] SOPS/Age — secrets chiffrés avant commit Git
- [x] gitleaks — détection automatique de fuites dans le code
- [x] Trivy — scan CVE des images avant déploiement
- [x] `network_internal: internal: true` — DB non routable depuis internet
- [x] `deploy.resources.limits` — protection contre les fuites mémoire OOM
- [x] Traefik TLS — HTTPS obligatoire, redirection HTTP→HTTPS automatique
- [x] `GF_SECURITY_ADMIN_PASSWORD__FILE` — mot de passe Grafana via secret
- [x] `GF_USERS_ALLOW_SIGN_UP: false` — pas d'inscription publique Grafana

### Scanner les images manuellement

```bash
# Scan complet avec rapport
docker compose --profile scan run --rm trivy

# Ou directement
trivy image --severity CRITICAL,HIGH meteo-backend:latest
```

---

## Commandes utiles

```bash
# Démarrer la stack
docker compose up -d

# Arrêter la stack (conserve les volumes)
docker compose down

# Arrêter et supprimer les volumes (DESTRUCTIF)
docker compose down -v

# Voir les logs d'un service
docker compose logs -f backend

# Redémarrer un service sans recréer les autres
docker compose restart backend

# Rebuilder une image et redémarrer le service
docker compose up -d --build backend

# Entrer dans un conteneur
docker exec -it citus_master psql -U $POSTGRES_USER -d $POSTGRES_DB

# Vérifier les ressources consommées
docker stats --no-stream

# Recharger la configuration Prometheus à chaud
curl -X POST http://localhost:9090/-/reload

# Déchiffrer les secrets pour un lancement local
export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt
for f in secrets/*.txt; do sops --decrypt --in-place $f; done
```
