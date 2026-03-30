# Frontend

Application web **Vue.js** compilée et servie par **Nginx Alpine**. Elle affiche les données météo et pollution sur une carte interactive avec filtres, en consommant l'API du backend via un reverse proxy Nginx.

---

## Rôle dans l'architecture

Le frontend est exposé sur internet via Traefik (HTTPS). Il n'a accès qu'à `network_public` — il ne peut pas atteindre directement la base de données ni le service Data. Toutes ses requêtes API passent par Nginx (`/api/`) qui les proxifie vers le backend.

```
Utilisateur (HTTPS)
    │
    ▼
Traefik (TLS Let's Encrypt)
    │
    ▼
Nginx :80 (network_public)
    ├── /          → fichiers statiques Vue.js (/usr/share/nginx/html)
    └── /api/      → proxy_pass → backend:3000
```

---

## Fichiers

| Fichier | Description |
|---|---|
| `Dockerfile` | Build multi-stage Node:20-alpine (build Vue.js) + Nginx:alpine (prod) |
| `nginx.conf` | Template Nginx — résolution des variables d'environnement via envsubst |
| `.dockerignore` | Exclut `node_modules`, `dist`, `.env`, `.git` |

---

## Dockerfile — détail des phases

**Phase 1 — `builder`**

`npm run build` produit les fichiers statiques dans `/app/dist` : HTML, CSS et JavaScript minifiés avec **hash de contenu** dans les noms de fichiers (ex: `app.3f2a1b.js`). Ces fichiers sont immuables par conception — tout changement de code produit un nouveau hash et donc un nouveau nom de fichier.

**Phase 2 — production**

Repart de `nginx:alpine` (~23 Mo). Copie uniquement `/app/dist` vers `/usr/share/nginx/html`. Node.js, npm et toutes les dépendances de développement sont absents de l'image finale. Taille finale : ~35 Mo.

---

## nginx.conf — fonctionnement du template

Le fichier est monté dans `/etc/nginx/templates/default.conf.template`. Nginx traite automatiquement les fichiers `*.template` via `envsubst` au démarrage et écrit le fichier résolu dans `/etc/nginx/conf.d/`.

La variable `${BACKEND_URL}` est résolue depuis l'environnement du conteneur (défini dans `docker-compose.yml`) — aucune valeur n'est compilée dans l'image.

**Fonctionnalités configurées :**

| Fonctionnalité | Configuration | Justification |
|---|---|---|
| Vue Router fallback | `try_files $uri $uri/ /index.html` | Sans cette règle, les rechargements sur une route non-racine retournent 404 |
| Reverse proxy API | `location /api/ { proxy_pass ${BACKEND_URL}/; }` | Le frontend ne connaît pas l'adresse du backend — Nginx fait le lien |
| Cache assets versionnés | `expires 1y; Cache-Control: immutable` | Les fichiers avec hash sont immuables — cache d'1 an sûr |
| Compression gzip | `gzip on; gzip_comp_level 6` | Réduit le bundle JS de ~70% (~500 Ko → ~150 Ko) |
| Headers de sécurité | `X-Frame-Options`, `X-Content-Type-Options` | Protection clickjacking et MIME sniffing |
| Endpoint `/health` | `return 200 "ok"` | Healthcheck Traefik et cAdvisor sans polluer les logs |

---

## Variables d'environnement (runtime)

| Variable | Valeur | Description |
|---|---|---|
| `BACKEND_URL` | `http://backend:3000` | URL du backend — résolue par le DNS Docker interne |

> Les variables `VITE_*` (ou `VUE_APP_*`) utilisées dans le code Vue.js sont compilées dans le bundle au build. Ne jamais y mettre de clés API ou de valeurs sensibles — elles seraient visibles dans le navigateur.

---

## Build et lancement

```bash
# Build seul
DOCKER_BUILDKIT=1 docker compose build frontend

# Lancement
docker compose up -d frontend

# Logs Nginx
docker compose logs -f frontend

# Vérifier la config Nginx générée (après envsubst)
docker exec frontend cat /etc/nginx/conf.d/default.conf
```
