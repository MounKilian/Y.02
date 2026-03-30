# =============================================================================
# Dockerfile — Frontend Vue.js + Nginx Alpine
# Prérequis : BuildKit activé (DOCKER_BUILDKIT=1 ou buildx)
#
# Sécurité secrets :
#   - Aucun ARG/ENV de secret — ils persistent dans docker history.
#   - Token npm privé injecté via --mount=type=secret si nécessaire.
#   - Variables d'environnement Vue.js (VITE_API_URL etc.) :
#     NE PAS les passer via ARG/ENV au build si elles contiennent des
#     clés API — elles seraient compilées dans le bundle JS et visibles
#     dans le navigateur. Utiliser des variables publiques uniquement
#     (préfixe VITE_ pour Vite, VUE_APP_ pour Vue CLI).
# =============================================================================

# syntax=docker/dockerfile:1.6

# ── Phase 1 : build Vue.js ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build
# Produit /app/dist : HTML, CSS, JS minifiés avec hash de contenu.
# Les fichiers statiques sont immuables par conception (hash dans le nom).


# ── Phase 2 : Nginx Alpine ───────────────────────────────────────────────────
FROM nginx:alpine

# Suppression de la config Nginx par défaut.
# Laisser default.conf en place crée un conflit avec le template monté
# via docker-compose (deux server{} sur le port 80).
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
# Seuls les artefacts de build sont copiés — Node.js, npm et toutes
# les dépendances de développement sont absents de l'image finale.
# Taille finale : ~35 Mo contre ~400 Mo avec Node.js.

# Le nginx.conf est monté en volume depuis docker-compose en tant que
# template (/etc/nginx/templates/default.conf.template).
# Nginx résout les variables d'environnement (${BACKEND_URL}) via envsubst
# au démarrage — aucune valeur n'est compilée dans l'image.

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
