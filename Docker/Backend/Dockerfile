# =============================================================================
# Dockerfile — Backend Node.js / Fastify
# Prérequis : BuildKit activé (DOCKER_BUILDKIT=1 ou buildx)
#
# Sécurité secrets :
#   - Aucun ARG/ENV/COPY utilisé pour des valeurs sensibles.
#     ARG et ENV persistent dans les métadonnées de l'image (docker inspect,
#     docker history) — toute valeur sensible y est exposée en clair.
#   - Les tokens npm privés (registre privé) sont injectés via
#     BuildKit --mount=type=secret : le secret est monté en tmpfs
#     pendant l'exécution du RUN, jamais écrit dans une couche image.
#   - Les secrets runtime (DB_PASSWORD, JWT_SECRET) ne transitent jamais
#     par le build — ils sont injectés via Docker Compose secrets au
#     démarrage du conteneur (/run/secrets/).
# =============================================================================

# syntax=docker/dockerfile:1.6
# Déclare la version de la syntaxe Dockerfile BuildKit.
# Obligatoire pour utiliser --mount=type=secret, --mount=type=cache
# et les autres fonctionnalités BuildKit avancées.

# ── Phase 1 : build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# --mount=type=secret,id=npmrc,target=/root/.npmrc
# Injecte le fichier .npmrc (token registre npm privé) uniquement pendant
# ce RUN. Le fichier est monté depuis l'hôte en tmpfs — il n'est PAS
# présent dans la couche Docker résultante, ni dans docker history,
# ni dans docker inspect. Après l'instruction RUN, le secret disparaît.
#
# Si le projet n'utilise pas de registre npm privé, supprimer
# --mount=type=secret,id=npmrc et utiliser simplement : RUN npm ci
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    --mount=type=cache,target=/root/.npm \
    npm ci
# --mount=type=cache,target=/root/.npm : cache du store npm entre les builds.
# Évite de re-télécharger les packages inchangés à chaque rebuild.
# Le cache est partagé entre les builds BuildKit sur la même machine.

COPY . .
RUN npm run build


# ── Phase 2 : image de production ────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Création d'un utilisateur non-root dédié.
# Principe de moindre privilège : un attaquant exploitant une faille
# applicative n'obtient que les droits de cet utilisateur restreint,
# pas les droits root du conteneur.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev
# --omit=dev : exclut les devDependencies (TypeScript, ESLint, Jest...).
# L'image finale ne contient que les dépendances nécessaires à l'exécution.

COPY --from=builder /app/dist ./dist

RUN chown -R appuser:appgroup /app

USER appuser

# Aucun secret dans EXPOSE, ENV, LABEL ou toute autre instruction
# ci-dessous — ces instructions sont visibles dans docker inspect.
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
