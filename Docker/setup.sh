#!/bin/bash
# =============================================================================
# setup.sh  Initialisation complte du projet
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# 1. BuildKit
# -----------------------------------------------------------------------------
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
echo "[1/7] BuildKit activ"

# -----------------------------------------------------------------------------
# 2. Secrets  gnration, permissions, .gitignore
# -----------------------------------------------------------------------------
for entry in "secrets/" "trivy-reports/" ".env"; do
  grep -qxF "$entry" .gitignore 2>/dev/null || echo "$entry" >> .gitignore
done
echo "[2/7] .gitignore vrifi"

mkdir -p secrets trivy-reports

# Gnration des secrets via OpenSSL CSPRNG (256+ bits d'entropie)
for secret in postgres_password replication_password; do
  [ ! -f "secrets/${secret}.txt" ] && \
    openssl rand -base64 32 > "secrets/${secret}.txt" && \
    echo "[2/7] ${secret}.txt gnr"
done

# JWT : 64 octets = 512 bits  au-del du minimum HS256 (256 bits)
[ ! -f secrets/jwt_secret.txt ] && \
  openssl rand -base64 64 > secrets/jwt_secret.txt && \
  echo "[2/7] jwt_secret.txt gnr"

# [5] Mot de passe Grafana  secret ddi, jamais en variable d'environnement
[ ! -f secrets/grafana_password.txt ] && \
  openssl rand -base64 32 > secrets/grafana_password.txt && \
  echo "[2/7] grafana_password.txt gnr"

# Certificat Traefik placeholder   remplacer par un vrai certificat TLS
# si l'infrastructure n'a pas accs  internet (Let's Encrypt indisponible)
[ ! -f secrets/traefik_cert.txt ] && \
  echo "placeholder" > secrets/traefik_cert.txt

chmod 600 secrets/*.txt
echo "[2/7] Permissions 600 appliques sur secrets/"

# -----------------------------------------------------------------------------
# 3. Chiffrement SOPS
# -----------------------------------------------------------------------------
if command -v sops &> /dev/null; then
  echo "[3/7] Chiffrement SOPS des secrets..."
  for f in secrets/*.txt; do
    if ! grep -q "sops:" "$f" 2>/dev/null; then
      sops --encrypt --in-place "$f" && echo "[3/7] $f chiffr"
    else
      echo "[3/7] $f dj chiffr"
    fi
  done
else
  echo "[3/7] SOPS non install  secrets non chiffrs."
  echo "      https://github.com/getsops/sops/releases"
  echo "      AVERTISSEMENT : ne pas commiter secrets/ sans chiffrement."
fi

# -----------------------------------------------------------------------------
# 4. Scan anti-fuite gitleaks  [8] utilise maintenant .gitleaks.toml
# -----------------------------------------------------------------------------
echo "[4/7] Scan anti-fuite gitleaks..."
if command -v gitleaks &> /dev/null; then
  gitleaks detect --source . --no-git --config .gitleaks.toml --verbose || {
    echo "[ERREUR] Secret dtect dans les fichiers  corriger avant de continuer."
    exit 1
  }
  echo "[4/7] gitleaks : aucun secret dtect"
else
  echo "[4/7] gitleaks non install  scan ignor."
  echo "      https://github.com/gitleaks/gitleaks/releases"
fi

# -----------------------------------------------------------------------------
# 5. .env
# -----------------------------------------------------------------------------
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[5/7] .env cr  renseigner DOMAIN_NAME, ACME_EMAIL et les URLs OpenData"
  echo "      Puis relancer : bash setup.sh"
  exit 0
fi
echo "[5/7] .env prsent"

# Vrifier que les variables obligatoires sont renseignes
for var in DOMAIN_NAME ACME_EMAIL POSTGRES_USER POSTGRES_DB; do
  value=$(grep "^${var}=" .env | cut -d= -f2)
  if [ -z "$value" ]; then
    echo "[ERREUR] Variable ${var} vide dans .env  renseigner avant de continuer."
    exit 1
  fi
done
echo "[5/7] Variables .env valides"

# -----------------------------------------------------------------------------
# 6. Build des images
# -----------------------------------------------------------------------------
echo "[6/7] Build des images Docker..."
DOCKER_BUILDKIT=1 docker compose build --no-cache
echo "[6/7] Build termin"

# -----------------------------------------------------------------------------
# 7. Scan Trivy
# -----------------------------------------------------------------------------
echo "[7/7] Scan Trivy des images..."
if command -v trivy &> /dev/null; then
  for image in meteo-backend:latest meteo-frontend:latest meteo-service-data:latest; do
    echo "    Scan : $image"
    trivy image \
      --exit-code 1 \
      --severity CRITICAL \
      --format table \
      --output "trivy-reports/${image/:/-}.txt" \
      "$image" || {
        echo "[ERREUR] CVE CRITICAL dtecte dans $image"
        echo "         Rapport : trivy-reports/${image/:/-}.txt"
        exit 1
      }
  done
  echo "[7/7] Aucune CVE CRITICAL dtecte"
else
  echo "[7/7] Trivy non install  scan via Docker Compose :"
  echo "      docker compose --profile scan run --rm trivy"
fi

echo ""
echo "========================================="
echo " Setup termin  lancement de la stack"
echo "========================================="
echo ""
echo " docker compose up -d"
echo ""
echo " Frontend : https://${DOMAIN_NAME:-localhost}"
echo " Grafana  : https://grafana.${DOMAIN_NAME:-localhost}"
echo ""
echo " Ordre de dmarrage :"
echo "   citus_worker1 + citus_worker2"
echo "    citus_master (initdb + sharding)"
echo "    citus_slave  (pg_basebackup)"
echo "    service_data + backend"
echo "    frontend + traefik"
