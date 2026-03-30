# Backend

Service API REST développé avec **Node.js / Fastify**. Il expose les données météo et pollution calculées par le service Data, applique les filtres demandés par le frontend et interroge la base de données Citus via le coordinator.

---

## Rôle dans l'architecture

Le backend est le **seul service membre de deux réseaux simultanément** (`network_public` et `network_internal`). Il constitue la passerelle contrôlée entre la zone exposée à internet et la zone interne hébergeant la base de données. Ni le frontend, ni internet ne peuvent atteindre PostgreSQL directement.

```
Frontend (network_public)
    │
    ▼
Backend ◄──► network_public  (reçoit les requêtes)
Backend ◄──► network_internal (interroge Citus + service_data)
    │
    ▼
citus_master:5432
service_data:3001
```

---

## Fichiers

| Fichier | Description |
|---|---|
| `Dockerfile` | Build multi-stage Node:20-alpine — phase builder + phase production |
| `.dockerignore` | Exclut `node_modules`, `dist`, `.env`, `.git`, logs |

---

## Dockerfile — détail des phases

**Phase 1 — `builder`**

Installe toutes les dépendances (`npm ci`) et compile le code TypeScript en JavaScript (`npm run build`). Les `devDependencies` (TypeScript, ESLint, Jest...) sont présentes uniquement dans cette phase.

**Phase 2 — production**

Repart de `node:20-alpine` (~5 Mo). Ne copie que le dossier `dist/` compilé et les `node_modules` de production (`--omit=dev`). Crée un utilisateur non-root `appuser` — principe de moindre privilège. Taille finale : ~180 Mo contre ~900 Mo sans multi-stage.

**Secrets de build**

Si le projet utilise un registre npm privé, le token `.npmrc` est injecté via BuildKit `--mount=type=secret` :

```bash
DOCKER_BUILDKIT=1 docker compose build --secret id=npmrc,src=$HOME/.npmrc backend
```

Le secret est monté en tmpfs pendant le `RUN npm ci` uniquement — absent des couches image, de `docker history` et de `docker inspect`.

---

## Variables d'environnement (runtime)

| Variable | Source | Description |
|---|---|---|
| `NODE_ENV` | `docker-compose.yml` | `production` |
| `PORT` | `docker-compose.yml` | `3000` |
| `DB_HOST` | `docker-compose.yml` | `citus_master` |
| `DB_PORT` | `docker-compose.yml` | `5432` |
| `DB_USER` | `.env` | Utilisateur PostgreSQL |
| `DB_NAME` | `.env` | Nom de la base |
| `DATA_SERVICE_URL` | `docker-compose.yml` | `http://service_data:3001` |

**Secrets injectés via `/run/secrets/` (jamais en variable d'environnement) :**

| Fichier secret | Utilisation dans le code |
|---|---|
| `/run/secrets/postgres_password` | `fs.readFileSync('/run/secrets/postgres_password', 'utf8').trim()` |
| `/run/secrets/jwt_secret` | `fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim()` |

---

## Healthcheck

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1
```

Le endpoint `/health` doit retourner `HTTP 200` avec `{"status":"ok"}`. Le frontend attend que ce healthcheck passe avant de démarrer (`depends_on: condition: service_healthy`).

---

## Build et lancement

```bash
# Build seul
DOCKER_BUILDKIT=1 docker compose build backend

# Lancement
docker compose up -d backend

# Logs
docker compose logs -f backend

# Entrer dans le conteneur
docker exec -it backend sh
```
